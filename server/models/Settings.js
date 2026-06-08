import mongoose from 'mongoose';

// Singleton site settings (keyed by `key`). Holds calendar-date availability exceptions.
// `dateOverrides` maps 'YYYY-MM-DD' -> array of enabled time-window `from` times ('HH:MM').
//   - a date absent from the map is fully open (all windows)
//   - an empty array means the date is closed (owner out of town)
//   - a subset means only those windows are open that date
// Stored as Mixed (dynamic date keys); `minimize: false` keeps an empty {} around.
const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'availability', unique: true },
  dateOverrides: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Minimum advance notice in days (1 = next-day earliest; today blocked).
  leadDays: { type: Number, default: 1, min: 0 },
  // Whether the opt-in "in a pinch" rush option is offered.
  rushEnabled: { type: Boolean, default: true },
  // Percentage surcharge applied to rush (same-day / within-lead) orders.
  rushPercent: { type: Number, default: 25, min: 0 },
  // Admin-editable text shown to pickup customers (success screen + emails).
  pickupInstructions: {
    type: String,
    default: 'Your bundles will be set out by the front-door Ring camera — grab them anytime during your window.',
  },
  // Neighbor-referral discount for the NEW customer (referrer is rewarded manually).
  referralDiscount: {
    enabled: { type: Boolean, default: true },
    type: { type: String, enum: ['amount', 'percent'], default: 'amount' },
    value: { type: Number, default: 5, min: 0 },
  },
  // First-order deal: auto-applied for a signed-in customer's first one-time order (once per account).
  // Default $15 makes the 3-Bundle Pack ($40) + delivery ($5) come out to $30.
  firstOrderDiscount: {
    enabled: { type: Boolean, default: true },
    type: { type: String, enum: ['amount', 'percent'], default: 'amount' },
    value: { type: Number, default: 15, min: 0 },
  },
}, { timestamps: true, minimize: false });

export default mongoose.model('Settings', settingsSchema);
