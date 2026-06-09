// Single source of truth for pricing — consumed by the Pricing page, the order form, the
// chatbot widget (client/src/components/chatbot/conversation.js), and emails.
// NOTE: product prices + DELIVERY_FEE are mirrored server-side in server/data/catalog.js (the
// authority for real Stripe charges). Keep the two in sync when prices change.

// Flat delivery fee per order (pickup is free).
export const DELIVERY_FEE = 5;

// Minimum subscription commitment (months) before it goes month-to-month.
export const SUBSCRIPTION_MIN_MONTHS = 3;

// À-la-carte products for a one-time order (the cart). `price` is dollars each.
export const products = [
  {
    id: 'standard-bundle',
    name: 'Standard Bundle',
    price: 15,
    description: 'Clean, dry hardwood for everyday fires.',
  },
  {
    id: 'three-bundle-pack',
    name: '3-Bundle Pack',
    price: 40,
    bundles: 3,
    description: 'Best value for longer fires or gatherings.',
  },
];

export const getProduct = (id) => products.find((p) => p.id === id);

// Recurring monthly subscriptions (always delivered): any size 2–10 bundles/month at a flat
// per-bundle price. The savings story is vs one-time singles ($15 each).
// NOTE: mirrored server-side in server/data/catalog.js (authority for stored price/emails) —
// keep SUB_PER_BUNDLE + the formula in sync.
export const SUB_MIN_BUNDLES = 2;
export const SUB_MAX_BUNDLES = 10;
export const SUB_PER_BUNDLE = 12; // flat $/bundle for subscriptions

// Monthly price for an n-bundle subscription.
export const subscriptionMonthly = (n) => SUB_PER_BUNDLE * Math.round(Number(n) || 0);
// Legacy plan strings ('2bundle'/'3bundle') -> bundle count.
export const bundlesFromPlan = (plan) => parseInt(plan, 10) || 0;
// Clamp a requested bundle count into the allowed range.
export const clampBundles = (n) => Math.min(
  SUB_MAX_BUNDLES,
  Math.max(SUB_MIN_BUNDLES, Math.round(Number(n) || SUB_MIN_BUNDLES)),
);

// Preset 1-hour pickup/delivery windows. Customers pick one or more; we set the wood out for
// that window. Stored on the order as from/to 'HH:MM' (`from` doubles as the unique id).
export const TIME_WINDOWS = [
  { label: '10–11 AM', from: '10:00', to: '11:00' },
  { label: '11 AM–12 PM', from: '11:00', to: '12:00' },
  { label: '12–1 PM', from: '12:00', to: '13:00' },
  { label: '1–2 PM', from: '13:00', to: '14:00' },
  { label: '2–3 PM', from: '14:00', to: '15:00' },
  { label: '3–4 PM', from: '15:00', to: '16:00' },
  { label: '4–5 PM', from: '16:00', to: '17:00' },
  { label: '5–6 PM', from: '17:00', to: '18:00' },
  { label: '6–7 PM', from: '18:00', to: '19:00' },
  { label: '7–8 PM', from: '19:00', to: '20:00' },
];

// Day-of-week labels (still used by legacy order display).
export const WEEKDAYS = [
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
];
