import express from 'express';
import PromoCode from '../models/PromoCode.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Settings from '../models/Settings.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { phoneKey, streetKey } from '../utils/dedupe.js';
import { PRODUCT_PRICES } from '../data/catalog.js';

const router = express.Router();

const DEFAULT_REFERRAL = { enabled: true, type: 'amount', value: 5 };
const DEFAULT_FIRST_ORDER = { enabled: true, type: 'amount', value: 15 };
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

export function firstOrderConfig(settings) {
  return settings?.firstOrderDiscount || DEFAULT_FIRST_ORDER;
}

// True if any prior order shares this customer's account, phone, or street address — used to
// block the first-order deal across multiple sign-ups (not just per account). Empty keys are
// omitted so we never match every order with a blank key.
export async function hasPriorOrder({ userId, phone, street }) {
  const or = [];
  if (userId) or.push({ user: userId });
  const pk = phoneKey(phone);
  if (pk) or.push({ phoneKey: pk });
  const sk = streetKey(street);
  if (sk) or.push({ streetKey: sk });
  if (or.length === 0) return false;
  return Boolean(await Order.exists({ $or: or }));
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

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const suffix = (n = 4) => Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate a unique, brand-based referral code (e.g. FIREWOOD37) — no personal names.
const REFERRAL_BASE = 'FIREWOOD';
export async function generateReferralCode() {
  for (let i = 0; i < 12; i += 1) {
    // Start short (FIREWOOD10–99), widen the number on later attempts to avoid collisions.
    const num = i < 6 ? randInt(10, 99) : randInt(100, 9999);
    const code = `${REFERRAL_BASE}${num}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.findOne({ referralCode: code }).select('_id');
    if (!exists) return code;
  }
  return `${REFERRAL_BASE}${randInt(10000, 99999)}`;
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

// Mint the monthly-giveaway prize: a one-time code worth N free bundles (N x bundle price), owned
// by the winner, expiring in ~60 days.
export async function mintGiveawayPrize(winnerId, bundles = 1) {
  const n = Math.min(3, Math.max(1, Math.round(Number(bundles) || 1)));
  const code = await generatePromoCode('WIN');
  return PromoCode.create({
    code,
    discountType: 'amount',
    discountValue: n * (PRODUCT_PRICES['Standard Bundle'] || 15),
    active: true,
    maxUses: 1,
    owner: winnerId,
    description: `Monthly giveaway — ${n} free bundle${n === 1 ? '' : 's'}`,
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
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
      user.referralCode = await generateReferralCode();
      await user.save();
    }
    const settings = await Settings.findOne({ key: 'availability' });
    const rc = referralConfig(settings);
    // Reward codes this user has earned and can still use on their next order.
    // eslint-disable-next-line no-underscore-dangle
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

// Whether this signed-in user is eligible for the first-order deal (no prior orders).
router.get('/first-order', auth, async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'availability' });
    const fc = firstOrderConfig(settings);
    // Factor in phone/address (passed once the customer has entered them) so the client's shown
    // discount matches what the create route will actually apply.
    const hasOrdered = await hasPriorOrder({
      userId: req.userId,
      phone: req.query.phone,
      street: req.query.street,
    });
    const eligible = Boolean(fc.enabled) && !hasOrdered;
    return res.json({
      eligible,
      type: fc.type,
      value: fc.value,
      discount: fc.value,
      label: discountLabel(fc.type, fc.value),
    });
  } catch (error) {
    console.error('First-order check error:', error);
    return res.status(500).json({ error: 'Failed to check eligibility' });
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
