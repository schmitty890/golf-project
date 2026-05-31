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
  contact: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
  },
  deliveryAddress: {
    street: { type: String, required: true, trim: true },
    unit: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'delivered', 'cancelled'],
    default: 'pending',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  adminNotes: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
