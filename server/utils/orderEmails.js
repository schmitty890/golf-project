// Builders that turn an Order document into { subject, html, text } emails.
// Kept dependency-free and server-local (no client imports).

const BUSINESS = () => process.env.BUSINESS_NAME || 'VOLW Firewood';

// 'YYYY-MM-DD' -> 'Sat, Jun 6' (parsed from parts to stay in local time).
function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

// 'HH:MM' -> '5:00 PM'
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m || 0).padStart(2, '0')} ${period}`;
}

function describeOrder(order) {
  if (order.orderType === 'bundle') {
    return (order.items || []).map((i) => `${i.quantity} × ${i.name}`).join(', ') || 'Bundle order';
  }
  if (order.orderType === 'pack') {
    return `${order.packName} (${order.bundleCount} bundles)`;
  }
  if (order.orderType === 'subscription') {
    const plan = order.subscriptionPlan
      ? order.subscriptionPlan.charAt(0).toUpperCase() + order.subscriptionPlan.slice(1)
      : 'Subscription';
    return `${plan} subscription${order.season ? ` — ${order.season}` : ''}`;
  }
  return 'Order';
}

function windowsText(order) {
  if (order.schedule?.from) {
    return `${fmtTime(order.schedule.from)} – ${fmtTime(order.schedule.to)}`;
  }
  return (order.preferredTimes || [])
    .map((w) => `${fmtTime(w.from)} – ${fmtTime(w.to)}`)
    .filter(Boolean)
    .join(', ');
}

function fulfillmentText(order) {
  if (order.fulfillment === 'pickup') return 'Curb pickup';
  const a = order.deliveryAddress || {};
  const addr = [a.street, a.unit, a.neighborhood].filter(Boolean).join(', ');
  return `Delivery${addr ? ` to ${addr}` : ''}`;
}

// Bundle orders carry unit prices; packs/subscriptions don't, so total is null there.
function orderTotal(order) {
  if (order.orderType !== 'bundle') return null;
  const subtotal = (order.items || [])
    .reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0);
  const surcharge = order.rush ? Math.round(subtotal * ((order.rushPercent || 0) / 100)) : 0;
  return { subtotal, total: subtotal + surcharge };
}

function summaryLines(order) {
  const lines = [
    ['Order', describeOrder(order)],
    ['When', [fmtDate(order.preferredDate), windowsText(order)].filter(Boolean).join(' · ')],
    ['How', fulfillmentText(order)],
  ];
  if (order.rush) lines.push(['Rush', `Yes (+${order.rushPercent || 0}%) — subject to availability`]);
  const t = orderTotal(order);
  if (t) lines.push(['Estimated total', `$${t.total}`]);
  return lines;
}

function venmoBlock(order) {
  const handle = process.env.VENMO_HANDLE;
  if (!handle) return null;
  const t = orderTotal(order);
  const amount = t ? `$${t.total}` : 'the order total';
  return `Pay via Venmo to @${handle.replace(/^@/, '')} for ${amount}. Add your name in the note. (We'll confirm the final total.)`;
}

// Minimal branded HTML wrapper.
function wrap(title, bodyHtml) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#3b2f2a">
    <h2 style="color:#b5471f">${BUSINESS()}</h2>
    <h3>${title}</h3>
    ${bodyHtml}
    <p style="color:#8a7f78;font-size:12px;margin-top:24px">${BUSINESS()} — ${process.env.SERVICE_AREA || 'The Vineyards on Lake Wylie'}</p>
  </div>`;
}

function linesToHtml(lines) {
  return `<table style="border-collapse:collapse">${lines.map(
    ([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#8a7f78">${k}</td><td style="padding:4px 0;font-weight:bold">${v}</td></tr>`,
  ).join('')}</table>`;
}

function linesToText(lines) {
  return lines.map(([k, v]) => `${k}: ${v}`).join('\n');
}

export function customerConfirmationEmail(order, pickupInstructions = '') {
  const lines = summaryLines(order);
  const venmo = venmoBlock(order);
  const pickup = order.fulfillment === 'pickup' && pickupInstructions ? pickupInstructions : '';
  const subject = `We got your order — ${BUSINESS()}`;
  const intro = "Thanks for your order! Here's what we have. We'll confirm your time window shortly.";
  const html = wrap('Order received', `<p>${intro}</p>${linesToHtml(lines)}${pickup ? `<p style="margin-top:16px">${pickup}</p>` : ''}${venmo ? `<p style="margin-top:16px">${venmo}</p>` : ''}`);
  const text = `${intro}\n\n${linesToText(lines)}${pickup ? `\n\n${pickup}` : ''}${venmo ? `\n\n${venmo}` : ''}`;
  return { subject, html, text };
}

export function ownerAlertEmail(order) {
  const lines = summaryLines(order);
  const contact = `${order.contact?.name || ''}${order.contact?.phone ? ` · ${order.contact.phone}` : ''}${order.contact?.email ? ` · ${order.contact.email}` : ''}`;
  const subject = `New order: ${describeOrder(order)}${order.rush ? ' [RUSH]' : ''}`;
  const html = wrap('New order', `${linesToHtml([...lines, ['Contact', contact]])}`);
  const text = `New order\n\n${linesToText([...lines, ['Contact', contact]])}`;
  return { subject, html, text };
}

export function orderCancelledOwnerEmail(order) {
  const lines = summaryLines(order);
  const contact = `${order.contact?.name || ''}${order.contact?.phone ? ` · ${order.contact.phone}` : ''}`;
  const subject = `Order cancelled by customer: ${describeOrder(order)}`;
  const html = wrap('Order cancelled by customer', `${linesToHtml([...lines, ['Contact', contact]])}`);
  const text = `A customer cancelled their order.\n\n${linesToText([...lines, ['Contact', contact]])}`;
  return { subject, html, text };
}

export function orderRescheduledOwnerEmail(order) {
  const lines = summaryLines(order);
  const contact = `${order.contact?.name || ''}${order.contact?.phone ? ` · ${order.contact.phone}` : ''}`;
  const subject = `Order rescheduled by customer: ${describeOrder(order)}`;
  const html = wrap('Order rescheduled by customer', `<p>A customer changed their preferred date/time — please re-confirm a window.</p>${linesToHtml([...lines, ['Contact', contact]])}`);
  const text = `A customer rescheduled — please re-confirm a window.\n\n${linesToText([...lines, ['Contact', contact]])}`;
  return { subject, html, text };
}

export function windowConfirmedEmail(order, pickupInstructions = '') {
  const when = [fmtDate(order.schedule?.date || order.preferredDate), windowsText(order)].filter(Boolean).join(' · ');
  const how = fulfillmentText(order);
  const isPickup = order.fulfillment === 'pickup';
  const note = isPickup
    ? (pickupInstructions || "We'll have your bundles out for that window — grab them anytime within it.")
    : "We'll deliver within that window.";
  const subject = `You're booked — ${when}`;
  const body = `<p>Your ${isPickup ? 'pickup' : 'delivery'} is confirmed:</p>
    ${linesToHtml([['When', when], ['How', how], ['Order', describeOrder(order)]])}
    <p style="margin-top:12px">${note}</p>`;
  const html = wrap('Window confirmed', body);
  const text = `Your ${isPickup ? 'pickup' : 'delivery'} is confirmed.\n\nWhen: ${when}\nHow: ${how}\nOrder: ${describeOrder(order)}\n\n${note}`;
  return { subject, html, text };
}

export function deliveredEmail(order) {
  const site = process.env.SITE_URL;
  const fb = site ? `<p><a href="${site}" style="color:#b5471f">Leave a quick review</a> — it helps your neighbors.</p>` : '';
  const subject = `Thanks from ${BUSINESS()}!`;
  const html = wrap('All done — thank you!', `<p>Your firewood is ${order.fulfillment === 'pickup' ? 'ready/handed off' : 'delivered'}. Thanks for supporting a local neighbor!</p>${fb}`);
  const text = `Your firewood is ${order.fulfillment === 'pickup' ? 'ready/handed off' : 'delivered'}. Thanks!${site ? `\n\nLeave a review: ${site}` : ''}`;
  return { subject, html, text };
}
