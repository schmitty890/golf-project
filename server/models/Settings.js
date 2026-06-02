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
}, { timestamps: true, minimize: false });

export default mongoose.model('Settings', settingsSchema);
