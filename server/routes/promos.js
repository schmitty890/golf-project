import express from 'express';
import PromoCode from '../models/PromoCode.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';

const router = express.Router();

// --- Shared helpers (also used by the orders create route) ---

// Look up a usable promo code (active, not expired, under its use cap). Returns the doc or null.
export async function lookupPromo(code) {
  if (!code) return null;
  const promo = await PromoCode.findOne({ code: String(code).toUpperCase().trim() });
  if (!promo || !promo.active) return null;
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) return null;
  if (promo.maxUses > 0 && promo.uses >= promo.maxUses) return null;
  return promo;
}

// Dollar discount for a promo against a subtotal, clamped to [0, subtotal].
export function computeDiscount(promo, subtotal) {
  const sub = Math.max(0, Number(subtotal) || 0);
  const raw = promo.discountType === 'percent'
    ? Math.round(sub * (promo.discountValue / 100))
    : promo.discountValue;
  return Math.max(0, Math.min(raw, sub));
}

export function promoLabel(promo) {
  return promo.discountType === 'percent'
    ? `${promo.discountValue}% off`
    : `$${promo.discountValue} off`;
}

// --- Public: validate a code at checkout ---
router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const promo = await lookupPromo(code);
    if (!promo) {
      return res.json({ valid: false, message: 'That code isn’t valid.' });
    }
    return res.json({
      valid: true,
      code: promo.code,
      discount: computeDiscount(promo, subtotal),
      label: promoLabel(promo),
    });
  } catch (error) {
    console.error('Validate promo error:', error);
    return res.status(500).json({ error: 'Failed to validate code' });
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
