import express from 'express';
import Settings from '../models/Settings.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';

const router = express.Router();

const KEY = 'availability';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_PICKUP = 'Your bundles will be set out by the front-door Ring camera — grab them anytime during your window.';
const DEFAULTS = {
  leadDays: 1, rushEnabled: true, rushPercent: 25, pickupInstructions: DEFAULT_PICKUP,
};

/**
 * @swagger
 * /api/settings/availability:
 *   get:
 *     summary: Get calendar-date availability overrides (public)
 *     responses:
 *       200:
 *         description: Map of 'YYYY-MM-DD' -> enabled window 'from' times
 */
// Public — the order form (used by guests too) reads this.
router.get('/availability', async (req, res) => {
  try {
    const doc = await Settings.findOne({ key: KEY });
    return res.json({
      dateOverrides: doc ? doc.dateOverrides : {},
      leadDays: doc?.leadDays ?? DEFAULTS.leadDays,
      rushEnabled: doc?.rushEnabled ?? DEFAULTS.rushEnabled,
      rushPercent: doc?.rushPercent ?? DEFAULTS.rushPercent,
      pickupInstructions: doc?.pickupInstructions ?? DEFAULTS.pickupInstructions,
      // A Venmo handle is public by design (it's how customers pay).
      venmoHandle: process.env.VENMO_HANDLE || '',
    });
  } catch (error) {
    console.error('Get availability error:', error);
    return res.status(500).json({ error: 'Failed to load availability' });
  }
});

/**
 * @swagger
 * /api/settings/availability:
 *   put:
 *     summary: Replace calendar-date availability overrides (admin only)
 */
router.put('/availability', auth, requireAdmin, async (req, res) => {
  try {
    // Only set the fields present in the body, so saving the calendar (dateOverrides)
    // and the scheduling rules (lead/rush) don't clobber each other.
    const update = { key: KEY };

    if (req.body?.dateOverrides && typeof req.body.dateOverrides === 'object') {
      const dateOverrides = {};
      Object.entries(req.body.dateOverrides).forEach(([date, windows]) => {
        if (DATE_RE.test(date) && Array.isArray(windows)) {
          dateOverrides[date] = windows.filter((t) => typeof t === 'string');
        }
      });
      update.dateOverrides = dateOverrides;
    }
    if (req.body?.leadDays !== undefined) {
      update.leadDays = Math.max(0, Math.floor(Number(req.body.leadDays) || 0));
    }
    if (req.body?.rushEnabled !== undefined) {
      update.rushEnabled = Boolean(req.body.rushEnabled);
    }
    if (req.body?.rushPercent !== undefined) {
      update.rushPercent = Math.max(0, Number(req.body.rushPercent) || 0);
    }
    if (req.body?.pickupInstructions !== undefined) {
      update.pickupInstructions = String(req.body.pickupInstructions);
    }

    const doc = await Settings.findOneAndUpdate(
      { key: KEY },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return res.json({
      dateOverrides: doc.dateOverrides,
      leadDays: doc.leadDays,
      rushEnabled: doc.rushEnabled,
      rushPercent: doc.rushPercent,
      pickupInstructions: doc.pickupInstructions,
    });
  } catch (error) {
    console.error('Update availability error:', error);
    return res.status(500).json({ error: 'Failed to save availability' });
  }
});

export default router;
