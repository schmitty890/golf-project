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
