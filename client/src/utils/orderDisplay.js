// Human-readable description of an order's contents and status styling.

const SUB_LABELS = { '2bundle': '2 bundles / month', '3bundle': '3 bundles / month' };

export function describeOrder(order) {
  if (order.orderType === 'subscription') {
    return `${SUB_LABELS[order.subscriptionPlan] || order.subscriptionPlan || 'Monthly'} subscription`;
  }
  if (order.items && order.items.length) {
    return order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ');
  }
  // Legacy fallback (old pack/bundle orders).
  if (order.packName) return `${order.packName} (${order.bundleCount} bundles)`;
  return 'Order';
}

export function fulfillmentLabel(order) {
  return order.fulfillment === 'pickup' ? 'Pickup' : 'Delivery';
}

const DAY_LABELS = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

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

// Format one {from,to} window as "5:00 PM – 6:00 PM".
function formatWindow(w) {
  if (!w) return '';
  return [formatTime(w.from), formatTime(w.to)].filter(Boolean).join(' – ');
}

// Customer's chosen date + time window(s), e.g. "Sat, Jun 6 · 5:00 PM – 6:00 PM, 6:00 PM – 7:00 PM"
// Falls back to the legacy single window, then to legacy preferred day(s).
export function formatPreferredSchedule(order) {
  // New orders: one or more windows; older orders: a single preferredTime.
  const windowList = (order.preferredTimes && order.preferredTimes.length)
    ? order.preferredTimes
    : [order.preferredTime].filter((t) => t && (t.from || t.to));
  const window = windowList.map(formatWindow).filter(Boolean).join(', ');

  if (order.preferredDate) {
    const datePart = formatScheduleDate(order.preferredDate);
    return [datePart, window].filter(Boolean).join(' · ');
  }

  // Legacy orders: preferred day(s) of week.
  const days = (order.preferredDays || []).map((d) => DAY_LABELS[d] || d);
  if (days.length === 0) return '';
  const dayStr = order.orderType === 'subscription' ? `Every ${days[0]}` : days.join(', ');
  return window ? `${dayStr} · ${window}` : dayStr;
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

// Whether the owner has confirmed a specific window for this order.
export function isConfirmedWindow(order) {
  return !!(order.schedule?.date && order.schedule?.from);
}

// The date the order actually happens on: the confirmed schedule date, else the
// customer's chosen date. '' if neither (legacy).
export function effectiveDate(order) {
  return order.schedule?.date || order.preferredDate || '';
}

// Start time ('HH:MM') used to sort within a day: confirmed window, else the
// earliest customer-preferred window. '' if none.
export function effectiveStart(order) {
  if (order.schedule?.from) return order.schedule.from;
  const froms = (order.preferredTimes || []).map((w) => w.from).filter(Boolean);
  return froms.length ? froms.slice().sort()[0] : '';
}

// Canonical fulfillment stages, in order. (cancelled is handled separately.)
export const STATUS_OPTIONS = ['received', 'confirmed', 'ready', 'completed', 'cancelled'];
export const STATUS_STEPS = ['received', 'confirmed', 'ready', 'completed'];

// Map legacy statuses to the canonical set so old orders still render.
export function normalizeStatus(status) {
  if (status === 'pending') return 'received';
  if (status === 'delivered') return 'completed';
  return status || 'received';
}

// Human label for a status, fulfillment-aware for the ready/completed stages.
export function statusLabel(status, fulfillment) {
  const s = normalizeStatus(status);
  const isPickup = fulfillment === 'pickup';
  switch (s) {
    case 'received': return 'Order received';
    case 'confirmed': return 'Confirmed';
    case 'ready': return isPickup ? 'Ready for pickup' : 'Out for delivery';
    case 'completed': return isPickup ? 'Picked up' : 'Delivered';
    case 'cancelled': return 'Cancelled';
    default: return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

export function statusEventLabel(status, fulfillment) {
  return statusLabel(status, fulfillment);
}

// Timestamped status history; falls back to a single synthesized entry for older orders.
export function statusTimeline(order) {
  if (order.statusHistory && order.statusHistory.length > 0) return order.statusHistory;
  return [{ status: order.status || 'received', at: order.createdAt }];
}

export const statusClasses = {
  received: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  ready: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-700',
  // legacy
  pending: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
};

export const paymentStatusClasses = {
  unpaid: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
};

export function paymentLabel(order) {
  return order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid';
}
