// Single source of truth for VOLW Firewood business info.
const business = {
  name: 'VOLW Firewood',
  established: 2026,
  tagline: 'Bundled firewood delivered right to your doorstep — exclusively for The Vineyards on Lake Wylie.',
  shortPitch: 'Firewood Delivered in The Vineyards',
  valueProps: ['Clean', 'Convenient', 'Local'],
  email: 'volwfirewood@gmail.com',
  serviceArea: 'The Vineyards on Lake Wylie',
  // Social links are hidden until real accounts exist. To show them in the footer,
  // add entries here, e.g. { name: 'Instagram', href: 'https://instagram.com/...' }.
  social: [],
  // First-order promo in the top announcement bar. The $ amount is just copy — keep it in sync with
  // Settings.firstOrderDiscount (the real discount, applied server-side to a signed-in customer's
  // first order). Set launchOffer to null to hide the bar.
  launchOffer: {
    text: 'New neighbors: $15 off your first order — 3 bundles delivered for just $30.',
    cta: 'Order now',
    href: '/order',
  },
  // Real photos: drop image files in client/public/photos/ and list them here, e.g.
  // { src: '/photos/bundle.jpg', alt: 'A VOLW firewood bundle' }. Empty = gallery hidden.
  galleryPhotos: [],
};

export default business;
