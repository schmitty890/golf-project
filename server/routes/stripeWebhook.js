// Stripe webhook handler. Mounted in server.js BEFORE express.json() with express.raw(), because
// signature verification needs the raw request body. Marks an order paid on checkout completion.
import Stripe from 'stripe';
import Order from '../models/Order.js';
import Settings, { DEFAULT_PICKUP_ADDRESS } from '../models/Settings.js';
import { sendMail } from '../utils/mailer.js';
import { paymentReceivedEmail } from '../utils/orderEmails.js';

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
      // Initial payment — one-time charge OR the first charge of a new subscription.
      const session = event.data.object;
      const order = session.metadata?.orderId ? await Order.findById(session.metadata.orderId) : null;
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.paidAt = new Date();
        order.paymentMethod = 'card';
        order.stripePaymentIntentId = session.payment_intent || '';
        if (session.customer) order.stripeCustomerId = session.customer;
        if (session.mode === 'subscription' && session.subscription) {
          order.stripeSubscriptionId = session.subscription;
          order.subscriptionStatus = 'active';
        }
        await order.save();
        if (order.contact?.email) {
          const settings = await Settings.findOne({ key: 'availability' });
          const pickupAddress = settings?.pickupAddress || DEFAULT_PICKUP_ADDRESS;
          sendMail({ to: order.contact.email, ...paymentReceivedEmail(order, pickupAddress) });
        }
      }
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
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      // Subscription cancelled (via the customer portal or owner).
      const sub = event.data.object;
      const order = await Order.findOne({ stripeSubscriptionId: sub.id });
      if (order) {
        order.subscriptionStatus = 'canceled';
        await order.save();
      }
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err.message);
    // Still return 200 so Stripe doesn't retry forever on a non-recoverable error.
  }

  return res.json({ received: true });
}
