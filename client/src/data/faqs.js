// Homepage FAQ. Edit freely — e.g. drop your actual payment methods into the "How do I pay" answer.
const faqs = [
  {
    q: 'Do you sell cords or bulk loads?',
    a: 'No — we deliver small bundles only, perfect for cozy backyard firepit fires.',
  },
  {
    q: 'Do you deliver?',
    a: 'Yes — every order is delivered right to your door, free, here in The Vineyards. At checkout, pick a day and select the hours you’d prefer — we’ll do our best to deliver within that time.',
  },
  {
    q: 'How do I pay?',
    a: 'Pay with Venmo as soon as you order — we pre-fill the exact amount, so it’s one tap. We deliver your firewood once your payment comes through, so paying right away keeps your order on schedule.',
    // Shown instead of `a` when card checkout (Stripe) is enabled in this environment.
    aWithCard: 'Two easy ways: pay securely by card at checkout (confirmed instantly), or send it with Venmo — we pre-fill the exact amount. Pick whichever you prefer. We deliver once your payment comes through.',
  },
  {
    q: 'What area do you serve?',
    a: 'The Vineyards on Lake Wylie, exclusively. We’re your neighbors.',
  },
  {
    q: 'How fast can I get firewood?',
    a: 'Our schedule shifts week to week — we’re a small crew and are sometimes away or on vacation, so availability changes. When you order, the calendar shows the days and time windows we’re open, so just pick an available slot. Order at least a day ahead when you can. Need it sooner? Request a rush order at checkout — if we’re around and able to swing it, we’ll do our best to make it happen (subject to our availability).',
  },
  {
    q: 'Who’s the little log in the corner?',
    a: 'That’s Woody, our firewood helper! Tap him anytime to start an order in a few taps, check pricing, track an order, or get quick answers. Need a person? He’ll help you send us a message.',
  },
];

export default faqs;
