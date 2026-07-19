// Shared, idempotent finalization for a paid Stripe Checkout Session. Used by BOTH the Stripe
// webhook (checkout.session.completed) and the /track/:token reconciliation path, so a card order
// is marked paid + stock deducted + emails sent exactly once, whichever path gets there first.
import Order from '../models/Order.js';
import { sendMail } from './mailer.js';
import { paymentReceivedEmail, ownerNoticeEmail, orderTotal } from './orderEmails.js';
import { applyOrderInventory } from './inventory.js';

// Fire-and-forget owner alert (no-op if OWNER_EMAIL/SMTP unset; never blocks the caller).
export function notifyOwner(notice) {
  if (!process.env.OWNER_EMAIL) return;
  sendMail({ to: process.env.OWNER_EMAIL, ...ownerNoticeEmail(notice) });
}

// Common detail lines for an order-based owner notice.
export function orderLines(order) {
  const t = orderTotal(order);
  const lines = [
    ['Customer', order.contact?.name || '—'],
    ['Email', order.contact?.email || '—'],
  ];
  if (t) lines.push(['Amount', `$${t.total}${t.monthly ? '/mo' : ''}`]);
  lines.push(['Type', order.orderType === 'subscription' ? 'Subscription' : 'One-time']);
  return lines;
}

// Mark an order paid from a completed Checkout Session and run the one-time side effects
// (stock deduction + customer/owner emails). Race-safe: the paid transition is claimed with a
// single atomic conditional update, so concurrent callers (webhook + return check) can't
// double-deduct inventory or double-send emails. Returns true only for the caller that won the
// claim, false if the order was already paid / not found.
export async function finalizeCheckoutSession(order, session) {
  if (!order) return false;

  const set = {
    paymentStatus: 'paid',
    paidAt: new Date(),
    paymentMethod: 'card',
    stripePaymentIntentId: session.payment_intent || '',
  };
  if (session.customer) set.stripeCustomerId = session.customer;
  if (session.mode === 'subscription' && session.subscription) {
    set.stripeSubscriptionId = session.subscription;
    set.subscriptionStatus = 'active';
  }

  // Atomically claim the unpaid → paid transition. If another path already finalized, bail.
  const claimed = await Order.findOneAndUpdate(
    // eslint-disable-next-line no-underscore-dangle
    { _id: order._id, paymentStatus: { $ne: 'paid' } },
    { $set: set },
    { new: true },
  );
  if (!claimed) return false;

  // Deduct prepared stock for one-time orders here. Subscriptions are handled on
  // invoice.payment_succeeded (which fires for month 1 too), so we don't deduct them here.
  if (claimed.orderType !== 'subscription') {
    await applyOrderInventory(claimed);
  }
  if (claimed.contact?.email) {
    sendMail({ to: claimed.contact.email, ...paymentReceivedEmail(claimed) });
  }
  notifyOwner({
    subject: `Card payment received: ${claimed.contact?.name || 'a customer'}`,
    heading: 'Card payment received',
    intro: `${claimed.contact?.name || 'A customer'} paid by card.`,
    lines: orderLines(claimed),
  });
  return true;
}

export default { finalizeCheckoutSession, notifyOwner, orderLines };
