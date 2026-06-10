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

// Create a hosted Checkout Session for a recurring monthly subscription. The card is saved and
// auto-charged each month by Stripe. `monthlyCents` is the server-authoritative monthly amount.
export async function createSubscriptionCheckout(order, monthlyCents, opts) {
  const { successUrl, cancelUrl } = opts;
  const stripe = getStripe();
  if (!stripe) return null;
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: monthlyCents,
        recurring: { interval: 'month' },
        product_data: {
          name: `${process.env.BUSINESS_NAME || 'VOLW Firewood'} subscription`,
          description: `${order.subscriptionBundles} bundles / month, delivered`,
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

// Create a Stripe Customer Portal session so a subscriber can manage/cancel their plan themselves.
export async function createBillingPortalSession(customerId, returnUrl) {
  const stripe = getStripe();
  if (!stripe || !customerId) return null;
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}

// Cancel a subscription immediately (used when the owner cancels a recurring order) so no further
// charges occur. Safe no-op if Stripe isn't configured or there's no subscription id.
export async function cancelSubscription(subscriptionId) {
  const stripe = getStripe();
  if (!stripe || !subscriptionId) return null;
  return stripe.subscriptions.cancel(subscriptionId);
}

export default {
  stripeEnabled,
  createOneTimeCheckout,
  createSubscriptionCheckout,
  createBillingPortalSession,
  cancelSubscription,
};
