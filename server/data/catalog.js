// Server-authoritative product prices for computing real charge amounts (Stripe).
// KEEP IN SYNC with client/src/data/pricing.js (products + DELIVERY_FEE). The client copy is for
// display; this copy is the source of truth for money, so a tampered client can't change the price.

export const DELIVERY_FEE = 5;

// Authoritative à-la-carte product prices (dollars each), keyed by the exact product name the
// client sends in order.items[].name.
export const PRODUCT_PRICES = {
  'Standard Bundle': 15,
  '3-Bundle Pack': 40,
};

// Subscriptions: any size from SUB_MIN_BUNDLES..SUB_MAX_BUNDLES bundles/month at a flat
// per-bundle price (the savings story is vs one-time singles at $15). KEEP IN SYNC with the
// matching block in client/src/data/pricing.js.
export const SUB_MIN_BUNDLES = 2;
export const SUB_MAX_BUNDLES = 10;
export const SUB_PER_BUNDLE = 12; // flat $/bundle for subscriptions
export const subscriptionMonthly = (n) => SUB_PER_BUNDLE * Math.round(Number(n) || 0);
// Legacy plan strings ('2bundle'/'3bundle') -> bundle count.
export const bundlesFromPlan = (plan) => parseInt(plan, 10) || 0;

// Subscriptions pick a preferred WEEK of the month (not a fixed date). KEEP IN SYNC with
// SUBSCRIPTION_WEEKS in client/src/data/pricing.js.
export const SUBSCRIPTION_WEEK_VALUES = ['1', '2', '3', '4', 'any'];
const SUB_WEEK_LABELS = {
  1: 'Week 1 (1st–7th)',
  2: 'Week 2 (8th–14th)',
  3: 'Week 3 (15th–21st)',
  4: 'Week 4 (22nd–end)',
  any: 'Any week',
};
export const subscriptionWeekLabel = (v) => SUB_WEEK_LABELS[v] || '';

// Compute the authoritative charge in cents for a one-time order, from the stored cart + delivery +
// rush − validated discount. Throws if an item isn't in the catalog (don't charge unknown prices).
export function computeChargeCents(order) {
  const items = order.items || [];
  let dollars = 0;
  items.forEach((i) => {
    const price = PRODUCT_PRICES[i.name];
    if (price === undefined) {
      throw new Error(`Unknown product: ${i.name}`);
    }
    dollars += price * (Number(i.quantity) || 0);
  });
  const delivery = order.deliveryFee || 0;
  const surcharge = order.rush ? Math.round(dollars * ((order.rushPercent || 0) / 100)) : 0;
  dollars = Math.max(0, dollars + delivery + surcharge - (order.discount || 0));
  return Math.round(dollars * 100);
}
