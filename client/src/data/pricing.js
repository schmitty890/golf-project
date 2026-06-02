// Single source of truth for pricing — consumed by the homepage sections and the order form.

// Minimum bundles per delivery order (delivery is baked into the delivered-bundle price).
export const DELIVERY_MIN = 2;

export const bundles = [
  {
    id: 'pickup',
    name: 'Pickup Bundle',
    price: '$7',
    unitPrice: 7,
    fulfillment: 'pickup',
    description: 'Clean firewood bundle — pick up yourself.',
  },
  {
    id: 'delivered',
    name: 'Delivered Bundle',
    price: '$12',
    unitPrice: 12,
    fulfillment: 'delivery',
    minQty: DELIVERY_MIN,
    description: 'Delivered to your doorstep. 2-bundle minimum.',
  },
];

export const seasonalPacks = [
  {
    id: 'fall-firepit',
    name: 'Fall Firepit Pack',
    bundleCount: 3,
    price: '$33',
    unitPrice: 33,
    description: '3 bundles — perfect for cool fall evenings.',
    window: { start: '09-01', end: '11-30' },
  },
  {
    id: 'winter-warmth',
    name: 'Winter Warmth Pack',
    bundleCount: 5,
    price: '$50',
    unitPrice: 50,
    description: '5 bundles to keep you warm all winter.',
    window: { start: '12-01', end: '03-15' },
  },
  {
    id: 'holiday-hosting',
    name: 'Holiday Hosting Pack',
    bundleCount: 6,
    price: '$54',
    unitPrice: 54,
    description: '6 bundles for hosting friends and family.',
    window: { start: '11-15', end: '01-05' },
  },
];

// Seasonal packs are only offered during their date window. Computed from the LOCAL date so
// the season matches the customer's calendar (avoids UTC off-by-one issues).
const mmdd = (d) => (d.getMonth() + 1) * 100 + d.getDate();

export function isPackActive(pack, date = new Date()) {
  const cur = mmdd(date);
  const [sM, sD] = pack.window.start.split('-').map(Number);
  const [eM, eD] = pack.window.end.split('-').map(Number);
  const start = sM * 100 + sD;
  const end = eM * 100 + eD;
  // start <= end: normal range; start > end: range wraps the new year (e.g. Dec → Mar).
  return start <= end ? cur >= start && cur <= end : cur >= start || cur <= end;
}

export const getActivePacks = (date = new Date()) => (
  seasonalPacks.filter((p) => isPackActive(p, date))
);

export const subscriptions = [
  {
    id: 'monthly',
    plan: 'monthly',
    name: 'Monthly',
    cadence: '2 bundles / month',
    price: '$22/mo',
    unitPrice: 22,
    description: 'A steady supply delivered every month.',
  },
  {
    id: 'biweekly',
    plan: 'biweekly',
    name: 'Bi-Weekly',
    cadence: '4 bundles / month',
    price: '$40/mo',
    unitPrice: 40,
    description: 'Frequent deliveries for regular burners.',
  },
  {
    id: 'seasonal',
    plan: 'seasonal',
    name: 'Seasonal',
    cadence: 'Fall or Winter',
    price: 'from $108',
    unitPrice: 108,
    description: 'Cover a whole season — choose Fall or Winter.',
  },
];

export const seasons = [
  { id: 'fall', name: 'Fall' },
  { id: 'winter', name: 'Winter' },
];

// Preferred pickup/delivery days. Customers choose a DAY only (no time) — we fulfill sometime
// that day when available.
export const WEEKDAYS = [
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
];
