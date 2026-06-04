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
}, { timestamps: true, minimize: false });

export default mongoose.model('Settings', settingsSchema);
