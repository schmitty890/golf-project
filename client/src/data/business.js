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
    text: 'New neighbors: $15 off your first order — 3 bundles delivered for just $25.',
    cta: 'Order now',
    href: '/order',
  },
  // Real photos: drop image files in client/public/photos/ and list them here, e.g.
  // { src: '/photos/bundle.jpg', alt: 'A VOLW firewood bundle' }. Empty = gallery hidden.
  galleryPhotos: [],
  // Delivery map shown in the Service Area section. The image lives in client/public/
  // (here: volwmap.jpg) — it appears automatically and hides gracefully if missing.
  // Set to null to hide. Edit the caption freely.
  deliveryMap: {
    src: '/volwmap.jpg',
    alt: 'Map of The Vineyards on Lake Wylie — our delivery area',
    caption: 'Our current delivery area. New homes under construction are included — a few outlying streets may be outside our route, so if you’re not sure about yours, just ask.',
  },
};

export default business;
