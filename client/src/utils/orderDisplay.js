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

export const STATUS_OPTIONS = ['pending', 'confirmed', 'delivered', 'cancelled'];

export const statusClasses = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-700',
};
