import mongoose from 'mongoose';

// An admin-managed discount code applied at checkout. Discounts are recorded on orders but
// not auto-charged (the owner confirms the Venmo total).
const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String, required: true, unique: true, uppercase: true, trim: true,
  },
  discountType: { type: String, enum: ['amount', 'percent'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  // 0 = unlimited.
  maxUses: { type: Number, default: 0, min: 0 },
  uses: { type: Number, default: 0, min: 0 },
  description: { type: String, default: '', trim: true },
}, { timestamps: true });

export default mongoose.model('PromoCode', promoCodeSchema);
