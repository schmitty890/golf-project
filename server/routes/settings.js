import express from 'express';
import Settings from '../models/Settings.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';

const router = express.Router();

const KEY = 'availability';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
    return res.json({ dateOverrides: doc ? doc.dateOverrides : {} });
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
    const input = req.body?.dateOverrides;
    // Sanitize: keep only valid date keys mapping to arrays of 'HH:MM' strings.
    const dateOverrides = {};
    if (input && typeof input === 'object') {
      Object.entries(input).forEach(([date, windows]) => {
        if (DATE_RE.test(date) && Array.isArray(windows)) {
          dateOverrides[date] = windows.filter((t) => typeof t === 'string');
        }
      });
    }

    const doc = await Settings.findOneAndUpdate(
      { key: KEY },
      { key: KEY, dateOverrides },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return res.json({ dateOverrides: doc.dateOverrides });
  } catch (error) {
    console.error('Update availability error:', error);
    return res.status(500).json({ error: 'Failed to save availability' });
  }
});

export default router;
