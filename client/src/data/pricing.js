// Single source of truth for pricing — consumed by the Pricing page, the order form, and emails.

// Flat delivery fee per order (pickup is free).
export const DELIVERY_FEE = 5;

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

// Recurring monthly subscription tiers (delivered).
export const subscriptions = [
  {
    id: 'sub-2',
    plan: '2bundle',
    name: '2 bundles / month',
    bundles: 2,
    price: 20,
    priceLabel: '$20/mo',
    description: 'A steady supply — two bundles delivered each month.',
  },
  {
    id: 'sub-3',
    plan: '3bundle',
    name: '3 bundles / month',
    bundles: 3,
    price: 30,
    priceLabel: '$30/mo',
    description: 'Three bundles a month for regular burners.',
  },
];

export const getSubscription = (plan) => subscriptions.find((s) => s.plan === plan);

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
