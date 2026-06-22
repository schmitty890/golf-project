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
  // Neighbor-referral discount for the NEW customer (referrer is rewarded manually).
  referralDiscount: {
    enabled: { type: Boolean, default: true },
    type: { type: String, enum: ['amount', 'percent'], default: 'amount' },
    value: { type: Number, default: 5, min: 0 },
  },
  // First-order deal: auto-applied for a signed-in customer's first one-time order (once per acct).
  // Default $15 brings the 3-Bundle Pack ($40, free delivery) down to $25.
  firstOrderDiscount: {
    enabled: { type: Boolean, default: true },
    type: { type: String, enum: ['amount', 'percent'], default: 'amount' },
    value: { type: Number, default: 15, min: 0 },
  },
  // Prepared-bundle inventory. `bundlesPrepared` is the running ready-to-sell balance: the owner
  // bumps it up when a batch is wrapped, and a paid order deducts from it automatically. May go
  // negative (an "oversold / made fewer than recorded" signal the owner sees in admin). The public
  // low-stock banner shows only when enabled AND the balance is at/below the threshold.
  inventory: {
    bundlesPrepared: { type: Number, default: 0 },
    publicBannerEnabled: { type: Boolean, default: false },
    lowStockThreshold: { type: Number, default: 15, min: 0 },
  },
  // What we're currently selling. A single site-wide descriptor (mixed assortment for now; owner
  // may later specialize to oak/cherry/pine). Shown to customers and snapshotted onto each order.
  // `note` is an optional longer line (e.g. "A rotating assortment — oak, hickory, maple & more").
  woodType: {
    label: { type: String, default: 'Mixed seasoned hardwood' },
    note: { type: String, default: '' },
  },
}, { timestamps: true, minimize: false });

export default mongoose.model('Settings', settingsSchema);
