import express from 'express';
import jwt from 'jsonwebtoken';
import Settings, { DEFAULT_PICKUP_ADDRESS } from '../models/Settings.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { stripeEnabled } from '../utils/stripe.js';

// Soft admin check from an optional Bearer token (the availability GET is public, but the pickup
// address is admin-only). Returns true only for a valid admin token.
async function isAdminRequest(req) {
  const t = req.header('Authorization')?.replace('Bearer ', '');
  if (!t) return false;
  try {
    const decoded = jwt.verify(t, process.env.JWT_SECRET);
    const u = await User.findById(decoded.userId).select('role');
    return u?.role === 'admin';
  } catch {
    return false;
  }
}

const router = express.Router();

const KEY = 'availability';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_PICKUP = 'Your bundles will be set out by the front-door Ring camera. During your window, grab the bundle labeled with your name.';
const DEFAULT_REFERRAL = { enabled: true, type: 'amount', value: 5 };
const DEFAULT_FIRST_ORDER = { enabled: true, type: 'amount', value: 15 };
const DEFAULTS = {
  leadDays: 1,
  rushEnabled: true,
  rushPercent: 25,
  pickupInstructions: DEFAULT_PICKUP,
  pickupAddress: DEFAULT_PICKUP_ADDRESS,
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
    // The pickup address (home address) is only returned to admins, never on the public order form.
    const admin = await isAdminRequest(req);
    return res.json({
      dateOverrides: doc ? doc.dateOverrides : {},
      leadDays: doc?.leadDays ?? DEFAULTS.leadDays,
      rushEnabled: doc?.rushEnabled ?? DEFAULTS.rushEnabled,
      rushPercent: doc?.rushPercent ?? DEFAULTS.rushPercent,
      pickupInstructions: doc?.pickupInstructions ?? DEFAULTS.pickupInstructions,
      ...(admin ? { pickupAddress: doc?.pickupAddress || DEFAULTS.pickupAddress } : {}),
      referralDiscount: doc?.referralDiscount ?? DEFAULT_REFERRAL,
      firstOrderDiscount: doc?.firstOrderDiscount ?? DEFAULT_FIRST_ORDER,
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
    if (req.body?.pickupInstructions !== undefined) {
      update.pickupInstructions = String(req.body.pickupInstructions);
    }
    if (req.body?.pickupAddress !== undefined) {
      update.pickupAddress = String(req.body.pickupAddress);
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
      pickupAddress: doc.pickupAddress || DEFAULTS.pickupAddress,
      referralDiscount: doc.referralDiscount,
      firstOrderDiscount: doc.firstOrderDiscount,
    });
  } catch (error) {
    console.error('Update availability error:', error);
    return res.status(500).json({ error: 'Failed to save availability' });
  }
});

export default router;
