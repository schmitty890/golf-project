import express from 'express';
import PromoCode from '../models/PromoCode.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';

const router = express.Router();

const DEFAULT_REFERRAL = { enabled: true, type: 'amount', value: 5 };
const norm = (code) => String(code || '').toUpperCase().trim();

// --- Shared helpers (also used by the orders create route) ---

// Generic dollar discount for a type/value against a subtotal, clamped to [0, subtotal].
export function discountAmount(type, value, subtotal) {
  const sub = Math.max(0, Number(subtotal) || 0);
  const raw = type === 'percent' ? Math.round(sub * ((Number(value) || 0) / 100)) : (Number(value) || 0);
  return Math.max(0, Math.min(raw, sub));
}

export function discountLabel(type, value) {
  return type === 'percent' ? `${value}% off` : `$${value} off`;
}

// Look up a usable promo code (active, not expired, under its use cap). Returns the doc or null.
export async function lookupPromo(code) {
  if (!code) return null;
  const promo = await PromoCode.findOne({ code: norm(code) });
  if (!promo || !promo.active) return null;
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) return null;
  if (promo.maxUses > 0 && promo.uses >= promo.maxUses) return null;
  return promo;
}

export function computeDiscount(promo, subtotal) {
  return discountAmount(promo.discountType, promo.discountValue, subtotal);
}

export function promoLabel(promo) {
  return discountLabel(promo.discountType, promo.discountValue);
}

export function referralConfig(settings) {
  return settings?.referralDiscount || DEFAULT_REFERRAL;
}

// Find the user who owns a referral code (optionally excluding the buyer, who can't refer self).
export async function lookupReferralUser(code, excludeUserId) {
  if (!code) return null;
  const user = await User.findOne({ referralCode: norm(code) })
    .select('firstName lastName referralCode email');
  if (!user) return null;
  // eslint-disable-next-line no-underscore-dangle
  if (excludeUserId && user._id.toString() === String(excludeUserId)) return null;
  return user;
}

// Generate a unique referral code derived from the user's name/email + random suffix.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const suffix = (n = 4) => Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
export async function generateReferralCode(user) {
  const raw = (user.firstName || (user.email || '').split('@')[0] || 'VOLW').replace(/[^a-zA-Z0-9]/g, '');
  const base = (raw || 'VOLW').toUpperCase().slice(0, 8);
  for (let i = 0; i < 10; i += 1) {
    const code = `${base}${suffix(4)}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.findOne({ referralCode: code }).select('_id');
    if (!exists) return code;
  }
  return `VOLW${suffix(6)}`;
}

// Generate a unique PromoCode string (for minted referral-reward codes).
export async function generatePromoCode(prefix = 'THANKS') {
  for (let i = 0; i < 10; i += 1) {
    const code = `${prefix}${suffix(4)}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await PromoCode.findOne({ code }).select('_id');
    if (!exists) return code;
  }
  return `${prefix}${suffix(6)}`;
}

// Mint a one-time, owner-bound reward code for a referrer (granted when their referral orders).
export async function mintReferralReward(ownerId, rc) {
  const code = await generatePromoCode('THANKS');
  return PromoCode.create({
    code,
    discountType: rc.type,
    discountValue: rc.value,
    active: true,
    maxUses: 1,
    owner: ownerId,
    description: 'Referral reward — a neighbor ordered with your code',
  });
}

// --- Public: validate a code at checkout ---
router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const promo = await lookupPromo(code);
    if (promo) {
      return res.json({
        valid: true,
        kind: 'promo',
        code: promo.code,
        discount: computeDiscount(promo, subtotal),
        label: promoLabel(promo),
      });
    }
    // Otherwise it might be a neighbor's referral code.
    const settings = await Settings.findOne({ key: 'availability' });
    const rc = referralConfig(settings);
    if (rc.enabled) {
      const referrer = await lookupReferralUser(code);
      if (referrer) {
        return res.json({
          valid: true,
          kind: 'referral',
          code: referrer.referralCode,
          discount: discountAmount(rc.type, rc.value, subtotal),
          label: discountLabel(rc.type, rc.value),
          referrerName: [referrer.firstName, referrer.lastName].filter(Boolean).join(' ') || 'a neighbor',
        });
      }
    }
    return res.json({ valid: false, message: 'That code isn’t valid.' });
  } catch (error) {
    console.error('Validate promo error:', error);
    return res.status(500).json({ error: 'Failed to validate code' });
  }
});

// The current user's own referral code (generated on first request) + the discount it gives.
router.get('/my-referral', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.referralCode) {
      user.referralCode = await generateReferralCode(user);
      await user.save();
    }
    const settings = await Settings.findOne({ key: 'availability' });
    const rc = referralConfig(settings);
    // Reward codes this user has earned and can still use on their next order.
    const owned = await PromoCode.find({ owner: user._id, active: true });
    const now = Date.now();
    const rewards = owned
      .filter((p) => !(p.expiresAt && p.expiresAt.getTime() < now))
      .filter((p) => !(p.maxUses > 0 && p.uses >= p.maxUses))
      .map((p) => ({ code: p.code, label: discountLabel(p.discountType, p.discountValue) }));
    return res.json({
      code: user.referralCode,
      enabled: rc.enabled,
      label: discountLabel(rc.type, rc.value),
      rewards,
    });
  } catch (error) {
    console.error('My referral error:', error);
    return res.status(500).json({ error: 'Failed to load referral code' });
  }
});

// --- Admin CRUD ---
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const codes = await PromoCode.find().sort({ createdAt: -1 });
    return res.json(codes);
  } catch (error) {
    console.error('List promos error:', error);
    return res.status(500).json({ error: 'Failed to load promo codes' });
  }
});

router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const {
      code, discountType, discountValue, active, expiresAt, maxUses, description,
    } = req.body;
    if (!code || !['amount', 'percent'].includes(discountType) || !(Number(discountValue) >= 0)) {
      return res.status(400).json({ error: 'Code, type, and a non-negative value are required' });
    }
    const promo = await PromoCode.create({
      code,
      discountType,
      discountValue: Number(discountValue),
      active: active !== false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxUses: Math.max(0, Number(maxUses) || 0),
      description: description || '',
    });
    return res.status(201).json(promo);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'That code already exists' });
    }
    console.error('Create promo error:', error);
    return res.status(500).json({ error: 'Failed to create promo code' });
  }
});

router.patch('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: 'Promo code not found' });

    const {
      code, discountType, discountValue, active, expiresAt, maxUses, description,
    } = req.body;
    if (code !== undefined) promo.code = code;
    if (['amount', 'percent'].includes(discountType)) promo.discountType = discountType;
    if (discountValue !== undefined && Number(discountValue) >= 0) {
      promo.discountValue = Number(discountValue);
    }
    if (active !== undefined) promo.active = Boolean(active);
    if (expiresAt !== undefined) promo.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (maxUses !== undefined) promo.maxUses = Math.max(0, Number(maxUses) || 0);
    if (description !== undefined) promo.description = description;

    await promo.save();
    return res.json(promo);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'That code already exists' });
    }
    console.error('Update promo error:', error);
    return res.status(500).json({ error: 'Failed to update promo code' });
  }
});

router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const deleted = await PromoCode.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Promo code not found' });
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete promo error:', error);
    return res.status(500).json({ error: 'Failed to delete promo code' });
  }
});

export default router;
