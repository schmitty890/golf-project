import Stripe from 'stripe';

// Lazily-built Stripe client from env. If STRIPE_SECRET_KEY isn't set, the app runs fine and
// payment simply falls back to Venmo — the whole card path stays inert until the owner adds keys.
let client;
let initialized = false;

function getStripe() {
  if (initialized) return client;
  initialized = true;
  client = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
  return client;
}

export function stripeEnabled() {
  return Boolean(getStripe());
}

// Create a hosted Checkout Session for a one-time order. `amountCents` is the server-authoritative
// charge. Returns the Stripe session (caller uses session.url + session.id).
export async function createOneTimeCheckout(order, amountCents, opts) {
  const { successUrl, cancelUrl, description } = opts;
  const stripe = getStripe();
  if (!stripe) return null;
  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: amountCents,
        product_data: {
          name: `${process.env.BUSINESS_NAME || 'VOLW Firewood'} order`,
          description: description || undefined,
        },
      },
    }],
    // eslint-disable-next-line no-underscore-dangle
    metadata: { orderId: String(order._id) },
    customer_email: order.contact?.email || undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

export default { stripeEnabled, createOneTimeCheckout };
