// Stripe webhook handler. Mounted in server.js BEFORE express.json() with express.raw(), because
// signature verification needs the raw request body. Marks an order paid on checkout completion.
import Stripe from 'stripe';
import Order from '../models/Order.js';
import { applyOrderInventory } from '../utils/inventory.js';
import { finalizeCheckoutSession, notifyOwner, orderLines } from '../utils/finalizeCheckout.js';

export default async function stripeWebhook(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) return res.status(503).send('Stripe not configured');

  const stripe = new Stripe(key);
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      // Initial payment — one-time charge OR the first charge of a new subscription. Finalization
      // is shared with the /track/:token reconciliation path and is idempotent + race-safe.
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      const order = orderId ? await Order.findById(orderId) : null;
      if (order) await finalizeCheckoutSession(order, session);
    } else if (event.type === 'invoice.payment_succeeded') {
      // Monthly renewal charge — keep the subscription order marked paid + active.
      const sub = event.data.object.subscription;
      if (sub) {
        const order = await Order.findOne({ stripeSubscriptionId: sub });
        if (order) {
          order.paymentStatus = 'paid';
          order.paidAt = new Date();
          order.subscriptionStatus = 'active';
          await order.save();
          // Deduct this month's bundles, once per invoice id.
          await applyOrderInventory(order, { invoiceId: event.data.object.id });
          // Notify on real renewals only; the first charge is covered by the checkout alert.
          if (event.data.object.billing_reason !== 'subscription_create') {
            notifyOwner({
              subject: `Subscription renewed: ${order.contact?.name || 'a customer'}`,
              heading: 'Subscription renewed',
              intro: `${order.contact?.name || 'A customer'}'s monthly subscription renewed.`,
              lines: orderLines(order),
            });
          }
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      // Subscription cancelled (via the customer portal or owner).
      const sub = event.data.object;
      const order = await Order.findOne({ stripeSubscriptionId: sub.id });
      if (order) {
        order.subscriptionStatus = 'canceled';
        await order.save();
        notifyOwner({
          subject: `Subscription cancelled: ${order.contact?.name || 'a customer'}`,
          heading: 'Subscription cancelled',
          intro: `${order.contact?.name || 'A customer'}'s subscription was cancelled.`,
          lines: orderLines(order),
        });
      }
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err.message);
    // Still return 200 so Stripe doesn't retry forever on a non-recoverable error.
  }

  return res.json({ received: true });
}
