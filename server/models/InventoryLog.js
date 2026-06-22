import mongoose from 'mongoose';

// Audit ledger of every change to the prepared-bundle count: manual admin adjustments and the
// automatic +/- from orders being paid (or un-paid). Powers the admin "recent activity" list and
// makes the running balance traceable. `balanceAfter` snapshots `inventory.bundlesPrepared` right
// after this change was applied.
const inventoryLogSchema = new mongoose.Schema({
  delta: { type: Number, required: true }, // +N prepared a batch, -N order consumed bundles
  reason: {
    type: String,
    enum: ['admin_adjust', 'admin_set', 'order_paid', 'order_unpaid', 'subscription_renewal'],
    required: true,
  },
  balanceAfter: { type: Number, required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  note: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('InventoryLog', inventoryLogSchema);
