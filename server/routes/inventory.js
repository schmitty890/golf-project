import express from 'express';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import InventoryLog from '../models/InventoryLog.js';
import {
  getInventory, adjustPrepared, setPrepared, updateInventorySettings,
} from '../utils/inventory.js';

const router = express.Router();

/**
 * @swagger
 * /api/inventory/public:
 *   get:
 *     summary: Minimal inventory state for the customer low-stock banner (public)
 */
// Public — drives the customer low-stock banner. Deliberately leaks nothing when well-stocked:
// `show` is true only when the owner enabled the banner AND stock is at/below the threshold.
router.get('/public', async (req, res) => {
  try {
    const { bundlesPrepared, publicBannerEnabled, lowStockThreshold } = await getInventory();
    const show = publicBannerEnabled && bundlesPrepared <= lowStockThreshold;
    return res.json({
      show,
      soldOut: show && bundlesPrepared <= 0,
      bundlesReady: show ? Math.max(0, bundlesPrepared) : null,
    });
  } catch (error) {
    // Never break a customer page over the banner — just hide it.
    return res.json({ show: false, soldOut: false, bundlesReady: null });
  }
});

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Full inventory state + recent activity (admin)
 *     security:
 *       - bearerAuth: []
 */
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const inventory = await getInventory();
    const log = await InventoryLog.find().sort({ createdAt: -1 }).limit(25).lean();
    return res.json({ inventory, log });
  } catch (error) {
    console.error('Get inventory error:', error);
    return res.status(500).json({ error: 'Failed to load inventory' });
  }
});

/**
 * @swagger
 * /api/inventory/adjust:
 *   post:
 *     summary: Add/remove prepared bundles, or set an absolute count (admin)
 *     security:
 *       - bearerAuth: []
 */
// Body: { delta: N } to add/remove (e.g. +20 after wrapping a batch), or { setTo: N } to override.
router.post('/adjust', auth, requireAdmin, async (req, res) => {
  try {
    const { delta, setTo, note } = req.body || {};
    if (setTo !== undefined) {
      await setPrepared(setTo, { note: (note || '').trim() });
    } else if (delta !== undefined) {
      const d = Math.round(Number(delta) || 0);
      if (!d) return res.status(400).json({ error: 'Provide a non-zero delta or a setTo value' });
      await adjustPrepared(d, { reason: 'admin_adjust', note: (note || '').trim() });
    } else {
      return res.status(400).json({ error: 'Provide a delta or a setTo value' });
    }
    return res.json(await getInventory());
  } catch (error) {
    console.error('Adjust inventory error:', error);
    return res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

/**
 * @swagger
 * /api/inventory/settings:
 *   put:
 *     summary: Update the public low-stock banner toggle + threshold (admin)
 *     security:
 *       - bearerAuth: []
 */
router.put('/settings', auth, requireAdmin, async (req, res) => {
  try {
    const { publicBannerEnabled, lowStockThreshold } = req.body || {};
    const inventory = await updateInventorySettings({ publicBannerEnabled, lowStockThreshold });
    return res.json(inventory);
  } catch (error) {
    console.error('Update inventory settings error:', error);
    return res.status(500).json({ error: 'Failed to save inventory settings' });
  }
});

export default router;
