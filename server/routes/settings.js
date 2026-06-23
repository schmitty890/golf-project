import express from 'express';
import Settings from '../models/Settings.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { stripeEnabled } from '../utils/stripe.js';

const router = express.Router();

const KEY = 'availability';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_REFERRAL = { enabled: true, type: 'amount', value: 5 };
const DEFAULT_FIRST_ORDER = { enabled: true, type: 'amount', value: 15 };
const DEFAULT_WOOD_TYPE = { label: 'Mixed seasoned hardwood', note: '' };
const DEFAULT_CHAT = { available: false };
const DEFAULT_GIVEAWAY = { enabled: false, prizeBundles: 1, lastReminderMonth: '' };
const DEFAULT_KINDLING = { enabled: false, price: 8, quantity: 0 };
const DEFAULTS = {
  leadDays: 1,
  rushEnabled: true,
  rushPercent: 25,
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
      referralDiscount: doc?.referralDiscount ?? DEFAULT_REFERRAL,
      firstOrderDiscount: doc?.firstOrderDiscount ?? DEFAULT_FIRST_ORDER,
      woodType: doc?.woodType ?? DEFAULT_WOOD_TYPE,
      chat: doc?.chat ?? DEFAULT_CHAT,
      giveaway: doc?.giveaway ?? DEFAULT_GIVEAWAY,
      kindling: doc?.kindling ?? DEFAULT_KINDLING,
      // A Venmo handle is public by design (it's how customers pay).
      venmoHandle: process.env.VENMO_HANDLE || '',
      // Whether card checkout (Stripe) is available — the client shows the card option only if so.
      cardEnabled: stripeEnabled(),
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
    if (req.body?.referralDiscount && typeof req.body.referralDiscount === 'object') {
      const r = req.body.referralDiscount;
      update.referralDiscount = {
        enabled: Boolean(r.enabled),
        type: r.type === 'percent' ? 'percent' : 'amount',
        value: Math.max(0, Number(r.value) || 0),
      };
    }
    if (req.body?.firstOrderDiscount && typeof req.body.firstOrderDiscount === 'object') {
      const f = req.body.firstOrderDiscount;
      update.firstOrderDiscount = {
        enabled: Boolean(f.enabled),
        type: f.type === 'percent' ? 'percent' : 'amount',
        value: Math.max(0, Number(f.value) || 0),
      };
    }
    if (req.body?.woodType && typeof req.body.woodType === 'object') {
      const w = req.body.woodType;
      update.woodType = {
        label: String(w.label ?? '').trim() || DEFAULT_WOOD_TYPE.label,
        note: String(w.note ?? '').trim(),
      };
    }
    if (req.body?.chat && typeof req.body.chat === 'object') {
      update.chat = { available: Boolean(req.body.chat.available) };
    }
    if (req.body?.giveaway && typeof req.body.giveaway === 'object') {
      const g = req.body.giveaway;
      // Only the admin-editable fields here; lastReminderMonth is managed server-side by the job.
      if (g.enabled !== undefined) update['giveaway.enabled'] = Boolean(g.enabled);
      if (g.prizeBundles !== undefined) {
        update['giveaway.prizeBundles'] = Math.min(3, Math.max(1, Math.round(Number(g.prizeBundles) || 1)));
      }
    }
    if (req.body?.kindling && typeof req.body.kindling === 'object') {
      const k = req.body.kindling;
      if (k.enabled !== undefined) update['kindling.enabled'] = Boolean(k.enabled);
      if (k.price !== undefined) update['kindling.price'] = Math.max(0, Number(k.price) || 0);
      if (k.quantity !== undefined) update['kindling.quantity'] = Math.max(0, Math.round(Number(k.quantity) || 0));
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
      referralDiscount: doc.referralDiscount,
      firstOrderDiscount: doc.firstOrderDiscount,
      woodType: doc.woodType,
      chat: doc.chat,
      giveaway: doc.giveaway,
      kindling: doc.kindling,
    });
  } catch (error) {
    console.error('Update availability error:', error);
    return res.status(500).json({ error: 'Failed to save availability' });
  }
});

export default router;
