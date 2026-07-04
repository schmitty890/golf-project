import mongoose from 'mongoose';
import { phoneKey, streetKey } from '../utils/dedupe.js';

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, default: 0 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  // 'onetime' (cart of products) or 'subscription'. Plain string so legacy orders still save.
  orderType: { type: String, required: true },
  // Cart line items for one-time orders: { name, quantity, unitPrice }.
  items: { type: [orderItemSchema], default: [] },
  // Snapshot of the current wood-type label at order time (so history/emails stay accurate when the
  // site-wide label later changes). Empty for legacy orders placed before this existed.
  woodType: { type: String, default: '' },
  // Delivery fee charged on this order. Delivery is free, so this is always 0 (kept for back-compat).
  deliveryFee: { type: Number, default: 0 },
  // Subscription tier plan (legacy/back-compat string, e.g. '2bundle' / '5bundle').
  subscriptionPlan: { type: String, default: '' },
  // Subscription size + monthly price (dollars), locked in at signup.
  subscriptionBundles: { type: Number, default: 0 },
  subscriptionMonthly: { type: Number, default: 0 },
  // Subscription preferred delivery week of the month ('1'..'4' or 'any'); '' for one-time.
  subscriptionWeek: { type: String, default: '' },
  // Subscription minimum commitment: term length, when it ends, and when the customer agreed.
  commitmentMonths: { type: Number, default: 0 },
  commitmentEndsAt: { type: Date, default: null },
  agreedToTermsAt: { type: Date, default: null },
  // Deprecated (seasonal packs / seasons) — kept for older orders.
  packName: { type: String, default: '' },
  bundleCount: { type: Number, default: 0 },
  season: { type: String, default: '' },
  // Legacy: customer's preferred day(s) of week (older orders). New orders use preferredDate.
  preferredDays: { type: [String], default: [] },
  // Customer-chosen calendar date ('YYYY-MM-DD', local time, no timezone shift).
  preferredDate: { type: String, default: '' },
  // Legacy single pickup/delivery window (older orders). New orders use preferredTimes.
  preferredTime: {
    from: { type: String, default: '' },
    to: { type: String, default: '' },
  },
  // Customer-chosen pickup/delivery windows (one or more). 'HH:MM' strings to match `schedule`.
  preferredTimes: {
    type: [{
      from: { type: String, default: '' },
      to: { type: String, default: '' },
    }],
    default: [],
  },
  // Rush ("in a pinch") order placed inside the normal advance-notice window.
  rush: { type: Boolean, default: false },
  // Snapshot of the rush surcharge % applied at order time (0 when not a rush order).
  rushPercent: { type: Number, default: 0 },
  // How the customer pays: 'venmo' (manual) or 'card' (Stripe).
  paymentMethod: { type: String, default: 'venmo' },
  // Whether payment was received — set by the Stripe webhook for cards, or by hand for Venmo.
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  // When the order was marked paid (null = not yet).
  paidAt: { type: Date, default: null },
  // Inventory idempotency: true once this one-time order's bundles have been deducted from the
  // prepared-stock count (so a webhook resend / paid-toggle can't double-deduct). Cleared if the
  // order is flipped back to unpaid (which restores the bundles).
  inventoryApplied: { type: Boolean, default: false },
  // Subscriptions deduct once per paid invoice — the Stripe invoice ids already counted live here.
  inventoryAppliedInvoices: { type: [String], default: [] },
  // Why an order was cancelled (shown to the owner; emailed to the customer).
  cancelReason: { type: String, default: '' },
  // Stripe references (empty unless paid by card).
  stripeSessionId: { type: String, default: '' },
  stripePaymentIntentId: { type: String, default: '' },
  stripeCustomerId: { type: String, default: '' },
  // Recurring subscriptions: the Stripe subscription id + its lifecycle state.
  stripeSubscriptionId: { type: String, default: '' },
  subscriptionStatus: { type: String, enum: ['', 'active', 'past_due', 'canceled'], default: '' },
  // Promo code applied at checkout + the dollar discount recorded (owner honors final total).
  promoCode: { type: String, default: '' },
  discount: { type: Number, default: 0 },
  // Set when a referral code was used — the referring customer (for manual reward).
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // When the "evening before" reminder email was sent (null = not yet). Idempotency guard.
  reminderSentAt: { type: Date, default: null },
  // When the "running low? reorder" nudge was sent (null = not yet). Idempotency guard for the
  // post-delivery reorder reminder — one per one-time order. See jobs/reminders.js.
  reorderReminderSentAt: { type: Date, default: null },
  // How the customer receives the order. The site is delivery-only; kept for back-compat with
  // any legacy 'pickup' orders, but new orders are always 'delivery'.
  fulfillment: {
    type: String,
    enum: ['pickup', 'delivery'],
    default: 'delivery',
  },
  contact: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
  },
  deliveryAddress: {
    street: { type: String, trim: true, default: '' },
    unit: { type: String, trim: true, default: '' },
    neighborhood: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  // Normalized match keys (derived in the pre-save hook below) so the first-order deal can be
  // blocked by phone or address, not just account. See utils/dedupe.js + routes/promos.js.
  phoneKey: { type: String, default: '', index: true },
  streetKey: { type: String, default: '', index: true },
  // Fulfillment stage. Plain string (validated in the route) so legacy values still read.
  // Canonical: received → confirmed → ready → completed, plus cancelled.
  status: {
    type: String,
    default: 'received',
  },
  // Timestamped record of each status change (for the customer timeline + admin tracking).
  statusHistory: {
    type: [{
      status: { type: String },
      at: { type: Date },
    }],
    default: [],
  },
  // Random token for the public order-tracking link (no login needed to view that one order).
  trackingToken: { type: String, index: true, default: '' },
  // Admin-set pickup/delivery window, shown to logged-in customers. Stored as plain strings
  // (date 'YYYY-MM-DD', from/to 'HH:MM') to avoid timezone conversion issues.
  schedule: {
    date: { type: String, default: '' },
    from: { type: String, default: '' },
    to: { type: String, default: '' },
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  adminNotes: { type: String, default: '' },
}, { timestamps: true });

// Keep the dedupe match keys in sync with the contact phone + delivery street on every save.
// Synchronous hook (no `next`) — Mongoose 9 dropped callback-style middleware; a `next()` call here
// throws "next is not a function" and fails every order save.
orderSchema.pre('save', function setMatchKeys() {
  this.phoneKey = phoneKey(this.contact?.phone);
  this.streetKey = streetKey(this.deliveryAddress?.street);
});

export default mongoose.model('Order', orderSchema);
