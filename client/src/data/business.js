// Single source of truth for VOLW Firewood business info.
const business = {
  name: 'VOLW Firewood',
  established: 2026,
  tagline: 'Bundled firewood delivered right to your doorstep — exclusively for The Vineyards on Lake Wylie.',
  shortPitch: 'Firewood Delivered in The Vineyards',
  valueProps: ['Clean', 'Convenient', 'Local'],
  email: 'volwfirewood@gmail.com',
  serviceArea: 'The Vineyards on Lake Wylie',
  // Placeholder profile URLs — replace with the real accounts when they exist.
  social: [
    { name: 'Instagram', href: 'https://instagram.com' },
    { name: 'Facebook', href: 'https://facebook.com' },
  ],
  // Launch / first-order promo shown in the top announcement bar. Edit the text/amount,
  // or set launchOffer to null to hide the bar.
  launchOffer: {
    text: 'Now delivering in The Vineyards — new neighbors get 3 bundles delivered for $30.',
    cta: 'Order now',
    href: '/order',
  },
  // Real photos: drop image files in client/public/photos/ and list them here, e.g.
  // { src: '/photos/bundle.jpg', alt: 'A VOLW firewood bundle' }. Empty = gallery hidden.
  galleryPhotos: [],
};

export default business;
