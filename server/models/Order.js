import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, default: 0 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderType: {
    type: String,
    enum: ['bundle', 'pack', 'subscription'],
    required: true,
  },
  // For one-off bundle orders
  items: { type: [orderItemSchema], default: [] },
  // For seasonal packs
  packName: { type: String, default: '' },
  bundleCount: { type: Number, default: 0 },
  // For subscriptions
  subscriptionPlan: {
    type: String,
    enum: ['monthly', 'biweekly', 'seasonal', ''],
    default: '',
  },
  season: {
    type: String,
    enum: ['fall', 'winter', ''],
    default: '',
  },
  // Legacy: customer's preferred day(s) of week (older orders). New orders use preferredDate.
  preferredDays: { type: [String], default: [] },
  // Customer-chosen calendar date ('YYYY-MM-DD', local time, no timezone shift).
  preferredDate: { type: String, default: '' },
  // Customer-chosen pickup/delivery time window. Stored as 'HH:MM' strings to match `schedule`.
  preferredTime: {
    from: { type: String, default: '' },
    to: { type: String, default: '' },
  },
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
