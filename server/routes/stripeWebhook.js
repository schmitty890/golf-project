// Stripe webhook handler. Mounted in server.js BEFORE express.json() with express.raw(), because
// signature verification needs the raw request body. Marks an order paid on checkout completion.
import Stripe from 'stripe';
import Order from '../models/Order.js';
import { sendMail } from '../utils/mailer.js';
import { paymentReceivedEmail, ownerNoticeEmail, orderTotal } from '../utils/orderEmails.js';
import { applyOrderInventory } from '../utils/inventory.js';

// Fire-and-forget owner alert (no-op if OWNER_EMAIL/SMTP unset; never blocks the webhook).
function notifyOwner(notice) {
  if (!process.env.OWNER_EMAIL) return;
  sendMail({ to: process.env.OWNER_EMAIL, ...ownerNoticeEmail(notice) });
}

// Common detail lines for an order-based owner notice.
function orderLines(order) {
  const t = orderTotal(order);
  const lines = [
    ['Customer', order.contact?.name || '—'],
    ['Email', order.contact?.email || '—'],
  ];
  if (t) lines.push(['Amount', `$${t.total}${t.monthly ? '/mo' : ''}`]);
  lines.push(['Type', order.orderType === 'subscription' ? 'Subscription' : 'One-time']);
  return lines;
}

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
        // Deduct prepared stock for one-time orders here. Subscriptions are handled on
        // invoice.payment_succeeded (which fires for month 1 too), so we don't deduct them here.
        if (order.orderType !== 'subscription') {
          await applyOrderInventory(order);
        }
        if (order.contact?.email) {
          sendMail({ to: order.contact.email, ...paymentReceivedEmail(order) });
        }
        notifyOwner({
          subject: `Card payment received: ${order.contact?.name || 'a customer'}`,
          heading: 'Card payment received',
          intro: `${order.contact?.name || 'A customer'} paid by card.`,
          lines: orderLines(order),
        });
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
