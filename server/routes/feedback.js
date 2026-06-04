import express from 'express';
import jwt from 'jsonwebtoken';
import Feedback from '../models/Feedback.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';

const router = express.Router();

const STATUSES = ['pending', 'approved', 'rejected'];

// Soft auth: attach req.userId if a valid token is present; otherwise continue as guest.
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
    } catch (error) {
      // Invalid token on a public route is non-fatal — treat as guest.
    }
  }
  next();
};

/**
 * @swagger
 * /api/feedback:
 *   post:
 *     summary: Submit feedback (public; held as pending)
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      rating, comment, name, location,
    } = req.body;

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Please provide a rating from 1 to 5' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please provide your name' });
    }

    // Pull email from the linked account if logged in.
    let email = '';
    if (req.userId) {
      const u = await User.findById(req.userId).select('email');
      email = u?.email || '';
    }

    const feedback = await Feedback.create({
      rating: numRating,
      comment: (comment || '').trim(),
      name: name.trim(),
      location: (location || '').trim(),
      email,
      user: req.userId || null,
      status: 'pending',
    });

    return res.status(201).json(feedback);
  } catch (error) {
    console.error('Create feedback error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * @swagger
 * /api/feedback/approved:
 *   get:
 *     summary: List approved feedback (public)
 */
router.get('/approved', async (req, res) => {
  try {
    const items = await Feedback.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .select('name comment location rating createdAt');
    return res.json(items);
  } catch (error) {
    console.error('List approved feedback error:', error);
    return res.status(500).json({ error: 'Failed to load feedback' });
  }
});

/**
 * @swagger
 * /api/feedback:
 *   get:
 *     summary: List all feedback (admin only)
 */
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const filter = {};
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    const items = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'email firstName lastName');
    return res.json(items);
  } catch (error) {
    console.error('List feedback error:', error);
    return res.status(500).json({ error: 'Failed to load feedback' });
  }
});

/**
 * @swagger
 * /api/feedback/{id}:
 *   patch:
 *     summary: Update feedback status or content (admin only)
 */
router.patch('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const item = await Feedback.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Feedback not found' });

    const {
      status, rating, comment, name, location,
    } = req.body;

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      item.status = status;
    }
    if (rating !== undefined) {
      const numRating = Number(rating);
      if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ error: 'Rating must be 1 to 5' });
      }
      item.rating = numRating;
    }
    if (comment !== undefined) item.comment = String(comment).trim();
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: 'Name cannot be empty' });
      item.name = String(name).trim();
    }
    if (location !== undefined) item.location = String(location).trim();

    await item.save();
    return res.json(item);
  } catch (error) {
    console.error('Update feedback error:', error);
    return res.status(500).json({ error: 'Failed to update feedback' });
  }
});

/**
 * @swagger
 * /api/feedback/{id}:
 *   delete:
 *     summary: Delete feedback (admin only)
 */
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Feedback not found' });
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete feedback error:', error);
    return res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

export default router;
