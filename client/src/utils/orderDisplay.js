// Human-readable description of an order's contents and status styling.

export function describeOrder(order) {
  if (order.orderType === 'bundle') {
    return (order.items || [])
      .map((i) => `${i.quantity}× ${i.name}`)
      .join(', ') || 'Bundle order';
  }
  if (order.orderType === 'pack') {
    return `${order.packName} (${order.bundleCount} bundles)`;
  }
  if (order.orderType === 'subscription') {
    const plan = order.subscriptionPlan
      ? order.subscriptionPlan.charAt(0).toUpperCase() + order.subscriptionPlan.slice(1)
      : 'Subscription';
    const season = order.season ? ` — ${order.season.charAt(0).toUpperCase() + order.season.slice(1)}` : '';
    return `${plan} subscription${season}`;
  }
  return 'Order';
}

export function fulfillmentLabel(order) {
  return order.fulfillment === 'pickup' ? 'Pickup' : 'Delivery';
}

// 'YYYY-MM-DD' -> 'Sat, Jun 6' (parsed from parts to stay in local time, no UTC shift).
function formatScheduleDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return '';
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

// 'HH:MM' -> '9:00 AM'
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m || 0).padStart(2, '0')} ${period}`;
}

// Combine a {date, from, to} schedule into a readable string, e.g.
// "Sat, Jun 6 · 9:00 AM – 5:00 PM", "after 6:00 PM", "by 5:00 PM". Empty if nothing set.
export function formatSchedule(schedule) {
  if (!schedule) return '';
  const datePart = formatScheduleDate(schedule.date);
  const from = formatTime(schedule.from);
  const to = formatTime(schedule.to);
  let timePart = '';
  if (from && to) timePart = `${from} – ${to}`;
  else if (from) timePart = `after ${from}`;
  else if (to) timePart = `by ${to}`;
  return [datePart, timePart].filter(Boolean).join(' · ');
}

export function statusEventLabel(status) {
  if (status === 'pending') return 'Order placed';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
}

// Timestamped status history; falls back to a single synthesized entry for older orders.
export function statusTimeline(order) {
  if (order.statusHistory && order.statusHistory.length > 0) return order.statusHistory;
  return [{ status: order.status || 'pending', at: order.createdAt }];
}

export const STATUS_OPTIONS = ['pending', 'confirmed', 'delivered', 'cancelled'];

export const statusClasses = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-700',
};
