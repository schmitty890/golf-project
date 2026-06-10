// Builders that turn an Order document into { subject, html, text } emails.
// Kept dependency-free and server-local (no client imports).

import { subscriptionMonthly, bundlesFromPlan, subscriptionWeekLabel } from '../data/catalog.js';

const BUSINESS = () => process.env.BUSINESS_NAME || 'VOLW Firewood';

// Bundle count for a subscription order (new field, falling back to the legacy plan string).
function subBundles(order) {
  return order.subscriptionBundles || bundlesFromPlan(order.subscriptionPlan);
}

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
  if (order.orderType === 'subscription') {
    const n = subBundles(order);
    return `${n ? `${n} bundles / month` : 'Monthly'} subscription`;
  }
  if (order.items && order.items.length) {
    return order.items.map((i) => `${i.quantity} × ${i.name}`).join(', ');
  }
  // Legacy fallback.
  if (order.packName) return `${order.packName} (${order.bundleCount} bundles)`;
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

// Total from the cart items + delivery + rush − discount. For subscriptions, the recurring monthly
// price (locked at signup). Null if nothing to total.
export function orderTotal(order) {
  if (order.orderType === 'subscription') {
    const monthly = order.subscriptionMonthly || subscriptionMonthly(subBundles(order));
    return monthly ? { subtotal: monthly, delivery: 0, total: monthly, monthly: true } : null;
  }
  const itemsSub = (order.items || [])
    .reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0);
  if (!itemsSub) return null;
  const delivery = order.deliveryFee || 0;
  const surcharge = order.rush ? Math.round(itemsSub * ((order.rushPercent || 0) / 100)) : 0;
  const total = Math.max(0, itemsSub + delivery + surcharge - (order.discount || 0));
  return { subtotal: itemsSub, delivery, total };
}

function whenText(order) {
  // Subscriptions: a preferred week of the month, not a specific date.
  if (order.orderType === 'subscription' && order.subscriptionWeek) {
    return `${subscriptionWeekLabel(order.subscriptionWeek)} each month`;
  }
  return [fmtDate(order.preferredDate), windowsText(order)].filter(Boolean).join(' · ');
}

function summaryLines(order) {
  const lines = [
    ['Order', describeOrder(order)],
    ['When', whenText(order)],
    ['How', fulfillmentText(order)],
  ];
  if (order.rush) lines.push(['Rush', `Yes (+${order.rushPercent || 0}%) — subject to availability`]);
  const t = orderTotal(order);
  if (t) {
    if (t.delivery) lines.push(['Delivery', `$${t.delivery}`]);
    if (order.discount) lines.push(['Discount', `${order.promoCode} (−$${order.discount})`]);
    lines.push([t.monthly ? 'Monthly total' : 'Estimated total', `$${t.total}${t.monthly ? '/mo' : ''}`]);
  }
  return lines;
}

// Public "track your order" link (needs SITE_URL + the order's token). Empty when unavailable.
function trackUrl(order) {
  const site = process.env.SITE_URL;
  return site && order.trackingToken ? `${site}/track/${order.trackingToken}` : '';
}

function trackBlockHtml(order) {
  const url = trackUrl(order);
  return url ? `<p style="margin-top:16px"><a href="${url}" style="color:#b5471f;font-weight:bold">Track your order →</a></p>` : '';
}

function trackBlockText(order) {
  const url = trackUrl(order);
  return url ? `\n\nTrack your order: ${url}` : '';
}

function venmoBlock(order) {
  const handle = process.env.VENMO_HANDLE;
  if (!handle) return null;
  const t = orderTotal(order);
  const amount = t ? `$${t.total}` : 'the order total';
  return `Pay ${amount} via Venmo to @${handle.replace(/^@/, '')} — the amount is pre-filled in the link. Add your name in the note so we can match your order. Please pay now — we set out or deliver once your payment arrives.`;
}

// Cash-on-delivery/pickup message (fulfillment-aware).
function cashBlock(order) {
  const t = orderTotal(order);
  const amount = t ? `$${t.total}` : 'your order total';
  const when = order.fulfillment === 'pickup' ? 'at pickup' : 'when we drop it off';
  return `Have ${amount} in cash ready ${when} — we'll collect it then. No need to pay online.`;
}

// The right "how to pay" message for this order's payment method.
function paymentBlock(order) {
  return order.paymentMethod === 'cash' ? cashBlock(order) : venmoBlock(order);
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
  const venmo = paymentBlock(order);
  const pickup = order.fulfillment === 'pickup' && pickupInstructions ? pickupInstructions : '';
  const m = order.commitmentMonths || 0;
  const commitmentText = m > 0
    ? `${m}-month minimum: this subscription runs ${m} months, then continues month-to-month — cancel anytime after.`
    : '';
  const subject = `We got your order — ${BUSINESS()}`;
  const intro = "Thanks for your order! Here's what we have. We'll confirm your time window shortly.";
  const commitmentHtml = commitmentText ? `<p style="margin-top:16px;color:#8a7f78;font-size:13px"><strong>${commitmentText}</strong></p>` : '';
  const html = wrap('Order received', `<p>${intro}</p>${linesToHtml(lines)}${commitmentHtml}${pickup ? `<p style="margin-top:16px">${pickup}</p>` : ''}${venmo ? `<p style="margin-top:16px">${venmo}</p>` : ''}${trackBlockHtml(order)}`);
  const text = `${intro}\n\n${linesToText(lines)}${commitmentText ? `\n\n${commitmentText}` : ''}${pickup ? `\n\n${pickup}` : ''}${venmo ? `\n\n${venmo}` : ''}${trackBlockText(order)}`;
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
    <p style="margin-top:12px">${note}</p>${trackBlockHtml(order)}`;
  const html = wrap('Window confirmed', body);
  const text = `Your ${isPickup ? 'pickup' : 'delivery'} is confirmed.\n\nWhen: ${when}\nHow: ${how}\nOrder: ${describeOrder(order)}\n\n${note}${trackBlockText(order)}`;
  return { subject, html, text };
}

export function readyEmail(order, pickupInstructions = '') {
  const isPickup = order.fulfillment === 'pickup';
  const headline = isPickup ? 'Ready for pickup!' : 'Out for delivery!';
  const note = isPickup
    ? (pickupInstructions || 'Your bundles are set out — grab them during your window.')
    : "Your firewood is on the way — we'll deliver within your window.";
  const body = `<p>${note}</p>
    ${linesToHtml([['Order', describeOrder(order)], ['How', fulfillmentText(order)]])}${trackBlockHtml(order)}`;
  const html = wrap(headline, body);
  const text = `${headline}\n\n${note}\n\nOrder: ${describeOrder(order)}${trackBlockText(order)}`;
  return { subject: `${BUSINESS()} — ${headline}`, html, text };
}

export function reminderEmail(order, pickupInstructions = '') {
  const when = [fmtDate(order.schedule?.date), windowsText(order)].filter(Boolean).join(' · ');
  const isPickup = order.fulfillment === 'pickup';
  const note = isPickup
    ? (pickupInstructions || "We'll have your bundles out for your window.")
    : "We'll deliver within your window.";
  const venmo = paymentBlock(order);
  const subject = `Reminder: your firewood is set for tomorrow — ${when}`;
  const body = `<p>Quick reminder — your ${isPickup ? 'pickup' : 'delivery'} is tomorrow:</p>
    ${linesToHtml([['When', when], ['How', fulfillmentText(order)], ['Order', describeOrder(order)]])}
    <p style="margin-top:12px">${note}</p>
    ${venmo ? `<p style="margin-top:12px">${venmo}</p>` : ''}`;
  const html = wrap('See you tomorrow!', body);
  const text = `Reminder — your ${isPickup ? 'pickup' : 'delivery'} is tomorrow.\n\nWhen: ${when}\nOrder: ${describeOrder(order)}\n\n${note}${venmo ? `\n\n${venmo}` : ''}`;
  return { subject, html, text };
}

export function paymentReceivedEmail(order, pickupAddress = '') {
  const t = orderTotal(order);
  const amount = t ? `$${t.total}` : 'your order';
  const subject = `Payment received — ${BUSINESS()}`;
  const intro = `Thanks! We've marked ${describeOrder(order)} as paid (${amount}).`;
  // Now that they've paid, pickup customers get the address.
  const pickup = order.fulfillment === 'pickup' && pickupAddress
    ? `<p style="margin-top:16px"><strong>Where to pick up:</strong> ${pickupAddress}</p>`
    : '';
  const pickupText = order.fulfillment === 'pickup' && pickupAddress
    ? `\n\nWhere to pick up: ${pickupAddress}`
    : '';
  const html = wrap('Payment received', `<p>${intro}</p>${linesToHtml(summaryLines(order))}${pickup}`);
  const text = `${intro}\n\n${linesToText(summaryLines(order))}${pickupText}`;
  return { subject, html, text };
}

export function referralRewardEmail(referrer, reward, label) {
  const hi = referrer?.firstName ? `, ${referrer.firstName}` : '';
  const subject = `You earned ${label} your next order — ${BUSINESS()}`;
  const intro = `Good news${hi}! A neighbor just placed an order with your referral code, so you've earned ${label} your next order.`;
  const use = `Use code <strong>${reward.code}</strong> at checkout.`;
  const html = wrap('You earned a reward 🔥', `<p>${intro}</p><p style="margin-top:12px">${use}</p><p style="color:#8a7f78;font-size:13px;margin-top:8px">One-time use. Thanks for spreading the word!</p>`);
  const text = `${intro}\n\nUse code ${reward.code} at checkout. (One-time use.)\n\nThanks for spreading the word!`;
  return { subject, html, text };
}

export function contactFormEmail({
  name, email, phone, message,
}) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = [['Name', esc(name)], ['Email', esc(email)]];
  if (phone) lines.push(['Phone', esc(phone)]);
  const subject = `New contact message from ${name}`;
  const body = `${linesToHtml(lines)}<p style="margin-top:16px;white-space:pre-wrap">${esc(message)}</p>`;
  const html = wrap('New contact message', body);
  const text = `${linesToText(lines)}\n\nMessage:\n${message}`;
  return { subject, html, text };
}

export function deliveredEmail(order) {
  const site = process.env.SITE_URL;
  const fb = site ? `<p><a href="${site}" style="color:#b5471f">Leave a quick review</a> — it helps your neighbors.</p>` : '';
  const subject = `Thanks from ${BUSINESS()}!`;
  const html = wrap('All done — thank you!', `<p>Your firewood is ${order.fulfillment === 'pickup' ? 'picked up' : 'delivered'}. Thanks for supporting a local neighbor!</p>${fb}`);
  const text = `Your firewood is ${order.fulfillment === 'pickup' ? 'picked up' : 'delivered'}. Thanks!${site ? `\n\nLeave a review: ${site}` : ''}`;
  return { subject, html, text };
}
