// Single source of truth for mutating the prepared-bundle count. Every change goes through here so
// it's atomic ($inc) and audited (InventoryLog). The "order becomes paid" hooks call
// applyOrderInventory (idempotent); the admin UI calls adjustPrepared / setPrepared.
// These helpers intentionally mutate the passed Mongoose order doc (to set idempotency guards).
/* eslint-disable no-param-reassign */
import Settings from '../models/Settings.js';
import InventoryLog from '../models/InventoryLog.js';
import { orderBundleCount, KINDLING_NAME } from '../data/catalog.js';

const KEY = 'availability'; // the singleton Settings doc key

// Units of the Fire Starter Pack add-on in an order.
const kindlingCount = (order) => (order.items || [])
  .filter((i) => i.name === KINDLING_NAME)
  .reduce((n, i) => n + (Number(i.quantity) || 0), 0);

// Atomically nudge the Fire Starter Pack's sellable quantity (its own stock, apart from firewood).
async function adjustKindling(delta) {
  if (!delta) return;
  await Settings.findOneAndUpdate(
    { key: KEY },
    { $inc: { 'kindling.quantity': delta } },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

// Read-only snapshot of inventory settings (with defaults if the doc/subdoc is absent).
export async function getInventory() {
  const doc = await Settings.findOne({ key: KEY });
  const inv = doc?.inventory || {};
  return {
    bundlesPrepared: inv.bundlesPrepared ?? 0,
    publicBannerEnabled: inv.publicBannerEnabled ?? false,
    lowStockThreshold: inv.lowStockThreshold ?? 15,
  };
}

// Apply a relative change to the prepared count and log it. Returns the new balance.
export async function adjustPrepared(delta, { reason, order = null, note = '' } = {}) {
  const d = Math.round(Number(delta) || 0);
  const doc = await Settings.findOneAndUpdate(
    { key: KEY },
    { $inc: { 'inventory.bundlesPrepared': d } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  const balanceAfter = doc.inventory?.bundlesPrepared ?? 0;
  await InventoryLog.create({
    delta: d, reason, balanceAfter, order: order?.id || null, note,
  });
  return balanceAfter;
}

// Set the prepared count to an absolute value (admin override) and log the implied delta.
export async function setPrepared(value, { note = '' } = {}) {
  const target = Math.round(Number(value) || 0);
  const { bundlesPrepared: current } = await getInventory();
  await Settings.findOneAndUpdate(
    { key: KEY },
    { $set: { 'inventory.bundlesPrepared': target } },
    { upsert: true, setDefaultsOnInsert: true },
  );
  await InventoryLog.create({
    delta: target - current, reason: 'admin_set', balanceAfter: target, note,
  });
  return target;
}

// Update the public-banner settings (toggle + threshold). Returns the new inventory snapshot.
export async function updateInventorySettings({ publicBannerEnabled, lowStockThreshold } = {}) {
  const update = {};
  if (publicBannerEnabled !== undefined) {
    update['inventory.publicBannerEnabled'] = Boolean(publicBannerEnabled);
  }
  if (lowStockThreshold !== undefined) {
    update['inventory.lowStockThreshold'] = Math.max(0, Math.round(Number(lowStockThreshold) || 0));
  }
  if (Object.keys(update).length) {
    await Settings.findOneAndUpdate(
      { key: KEY },
      { $set: update },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  return getInventory();
}

// Idempotently deduct an order's bundles from prepared stock when it becomes paid.
//   - One-time: deduct orderBundleCount once, guarded by order.inventoryApplied.
//   - Subscription: deduct subscriptionBundles once per Stripe invoice id (renewals recur monthly).
//     A new subscription's checkout.session.completed passes no invoiceId and is skipped — the
//     first invoice.payment_succeeded handles month 1, so the first month isn't double-counted.
// Returns the delta applied (negative) or null if nothing changed.
export async function applyOrderInventory(order, { invoiceId = null } = {}) {
  if (!order) return null;

  if (order.orderType === 'subscription') {
    if (!invoiceId) return null;
    if ((order.inventoryAppliedInvoices || []).includes(invoiceId)) return null;
    const qty = Math.round(Number(order.subscriptionBundles) || 0);
    order.inventoryAppliedInvoices = [...(order.inventoryAppliedInvoices || []), invoiceId];
    await order.save();
    if (qty > 0) await adjustPrepared(-qty, { reason: 'subscription_renewal', order });
    return -qty;
  }

  if (order.inventoryApplied) return null;
  const qty = orderBundleCount(order.items);
  order.inventoryApplied = true; // claim idempotency before adjusting
  await order.save();
  if (qty > 0) await adjustPrepared(-qty, { reason: 'order_paid', order });
  const packs = kindlingCount(order); // Fire Starter Pack add-on has its own stock
  if (packs > 0) await adjustKindling(-packs);
  return -qty;
}

// Reverse a one-time order's deduction when the owner flips it back to unpaid. (Subscriptions are
// Stripe-only and don't use the manual paid toggle, so only one-time restore is handled here.)
export async function restoreOrderInventory(order) {
  if (!order || !order.inventoryApplied) return null;
  const qty = orderBundleCount(order.items);
  order.inventoryApplied = false;
  await order.save();
  if (qty > 0) await adjustPrepared(qty, { reason: 'order_unpaid', order });
  const packs = kindlingCount(order);
  if (packs > 0) await adjustKindling(packs);
  return qty;
}
