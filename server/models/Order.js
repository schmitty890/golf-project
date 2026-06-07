import mongoose from 'mongoose';

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
  // Flat delivery fee charged on this order (0 for pickup).
  deliveryFee: { type: Number, default: 0 },
  // Subscription tier plan (e.g. '2bundle' / '3bundle') for subscription orders.
  subscriptionPlan: { type: String, default: '' },
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
  // How the customer pays. Venmo for now.
  paymentMethod: { type: String, default: 'venmo' },
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
  // How the customer receives the order. Pickup orders don't need a delivery address.
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
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'delivered', 'cancelled'],
    default: 'pending',
  },
  // Timestamped record of each status change (for the customer timeline + admin tracking).
  statusHistory: {
    type: [{
      status: { type: String },
      at: { type: Date },
    }],
    default: [],
  },
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

export default mongoose.model('Order', orderSchema);
