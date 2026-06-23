import mongoose from 'mongoose';

// Record of each month's drawing — one per month (unique), so a month can't be drawn twice. Holds
// the winner + the minted prize code, and powers the admin "past winners" list.
const giveawayDrawSchema = new mongoose.Schema({
  month: { type: String, required: true, unique: true }, // 'YYYY-MM'
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prizeCode: { type: String, default: '' },
  prizeBundles: { type: Number, default: 1 },
  drawnAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('GiveawayDraw', giveawayDrawSchema);
