import express from 'express';
import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { sendMail } from '../utils/mailer.js';
import {
  customerConfirmationEmail, ownerAlertEmail, windowConfirmedEmail, deliveredEmail,
  orderCancelledOwnerEmail, orderRescheduledOwnerEmail,
} from '../utils/orderEmails.js';
import {
  lookupPromo, computeDiscount, lookupReferralUser, referralConfig, discountAmount,
} from './promos.js';

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Today's date as a local 'YYYY-MM-DD' string (avoids UTC shift from toISOString).
const todayStr = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// Add N days to a 'YYYY-MM-DD' string, returning a 'YYYY-MM-DD' string (local time).
const addDaysStr = (s, n) => {
  const [y, m, day] = s.split('-').map(Number);
  const d = new Date(y, m - 1, day + n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// Validate a requested date + time windows against admin availability/lead-time rules.
// Returns { error } on failure, or { windows, isRush, rushPercent } on success.
// Shared by order creation and reschedule. `settings` is the availability Settings doc.
const validateSchedule = ({ preferredDate, preferredTimes, rush }, settings) => {
  const windows = Array.isArray(preferredTimes) ? preferredTimes.filter((w) => w && w.from) : [];
  if (!DATE_RE.test(preferredDate || '')) return { error: 'Please choose a valid date' };
  if (preferredDate < todayStr()) return { error: 'That date is in the past' };
  if (windows.length === 0) return { error: 'Please choose at least one time window' };

  const override = settings?.dateOverrides?.[preferredDate];
  if (override !== undefined
    && (!Array.isArray(override) || !windows.every((w) => override.includes(w.from)))) {
    return { error: 'Sorry, that date and time is no longer available' };
  }

  const leadDays = settings?.leadDays ?? 1;
  const rushEnabled = settings?.rushEnabled ?? true;
  const rushPercent = settings?.rushPercent ?? 25;
  const wantsRush = Boolean(rush) && rushEnabled;
  let isRush = false;
  if (preferredDate < addDaysStr(todayStr(), leadDays)) {
    if (!wantsRush) {
      const notice = leadDays === 1 ? 'next-day notice' : `${leadDays} days' notice`;
      return { error: `Orders need at least ${notice}. Choose a later date or request a rush order.` };
    }
    isRush = true;
  }
  return { windows, isRush, rushPercent };
};

// Soft auth: if a valid Bearer token is present, attach req.userId; otherwise continue
// as a guest. Used by the public order-create route.
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
  return next();
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - orderType
 *         - contact
 *         - deliveryAddress
 *       properties:
 *         orderType:
 *           type: string
 *           enum: [bundle, pack, subscription]
 *         items:
 *           type: array
 *           items:
 *             type: object
 *         packName:
 *           type: string
 *         subscriptionPlan:
 *           type: string
 *         contact:
 *           type: object
 *         deliveryAddress:
 *           type: object
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a firewood order request (public; associates with user if logged in)
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Invalid input
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      orderType, items, packName, bundleCount,
      subscriptionPlan, season, contact, deliveryAddress, fulfillment, preferredDate, preferredTimes,
      rush, code, subtotal,
    } = req.body;

    if (!['bundle', 'pack', 'subscription'].includes(orderType)) {
      return res.status(400).json({ error: 'A valid order type is required' });
    }
    if (!contact?.name || !contact?.phone) {
      return res.status(400).json({ error: 'Contact name and phone are required' });
    }
    // Delivery orders need an address; pickup orders don't.
    if (fulfillment !== 'pickup' && !deliveryAddress?.street) {
      return res.status(400).json({ error: 'Delivery street address is required' });
    }

    // Validate the requested date + time windows against admin availability/lead-time.
    const settings = await Settings.findOne({ key: 'availability' });
    const sched = validateSchedule({ preferredDate, preferredTimes, rush }, settings);
    if (sched.error) {
      return res.status(400).json({ error: sched.error });
    }
    const { windows, isRush, rushPercent } = sched;

    // Apply a promo OR a neighbor's referral code (re-validated; owner honors final total).
    let promoCode = '';
    let discount = 0;
    let referredBy = null;
    const promo = await lookupPromo(code);
    if (promo) {
      discount = computeDiscount(promo, subtotal);
      promoCode = promo.code;
      promo.uses += 1;
      await promo.save();
    } else if (code) {
      const rc = referralConfig(settings);
      const referrer = rc.enabled ? await lookupReferralUser(code, req.userId) : null;
      if (referrer) {
        discount = discountAmount(rc.type, rc.value, subtotal);
        promoCode = referrer.referralCode;
        referredBy = referrer._id;
      }
    }

    const order = new Order({
      orderType,
      fulfillment: fulfillment === 'pickup' ? 'pickup' : 'delivery',
      items: orderType === 'bundle' ? (items || []) : [],
      packName: orderType === 'pack' ? (packName || '') : '',
      bundleCount: orderType === 'pack' ? (bundleCount || 0) : 0,
      subscriptionPlan: orderType === 'subscription' ? (subscriptionPlan || '') : '',
      season: orderType === 'subscription' ? (season || '') : '',
      contact,
      deliveryAddress: deliveryAddress || {},
      preferredDate,
      preferredTimes: windows.map((w) => ({ from: w.from || '', to: w.to || '' })),
      rush: isRush,
      rushPercent: isRush ? rushPercent : 0,
      promoCode,
      discount,
      referredBy,
      user: req.userId || null,
      statusHistory: [{ status: 'pending', at: new Date() }],
    });
    await order.save();

    // Fire-and-forget notifications — never block or fail the order on email issues.
    (async () => {
      try {
        let customerEmail = order.contact?.email || '';
        if (!customerEmail && req.userId) {
          const u = await User.findById(req.userId).select('email');
          customerEmail = u?.email || '';
        }
        if (customerEmail) {
          await sendMail({ to: customerEmail, ...customerConfirmationEmail(order, settings?.pickupInstructions) });
        }
        if (process.env.OWNER_EMAIL) {
          await sendMail({ to: process.env.OWNER_EMAIL, ...ownerAlertEmail(order) });
        }
      } catch (mailErr) {
        console.error('Order notification error:', mailErr.message);
      }
    })();

    return res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Server error creating order' });
  }
});

/**
 * @swagger
 * /api/orders/mine:
 *   get:
 *     summary: Get the current user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of the user's orders
 */
router.get('/mine', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId }).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    console.error('Get my orders error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List all orders (admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of all orders
 *       403:
 *         description: Admin access required
 */
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { status, orderType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (orderType) filter.orderType = orderType;
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'email firstName lastName')
      .populate('referredBy', 'firstName lastName email');
    return res.json(orders);
  } catch (error) {
    console.error('List orders error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get a single order (admin or owner)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'email firstName lastName role');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Admin can view any order; otherwise only the owner.
    const requester = await User.findById(req.userId).select('role');
    const isAdmin = requester?.role === 'admin';
    const isOwner = order.user && order.user._id.toString() === req.userId;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   patch:
 *     summary: Update an order's status or admin notes (admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order updated
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Not found
 */
router.patch('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes, schedule } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const prevStatus = order.status;
    if (status !== undefined && status !== order.status) {
      order.statusHistory.push({ status, at: new Date() });
      order.status = status;
    }
    if (adminNotes !== undefined) order.adminNotes = adminNotes;
    if (schedule !== undefined) {
      order.schedule = {
        date: schedule.date || '',
        from: schedule.from || '',
        to: schedule.to || '',
      };
    }
    await order.save();

    // Notify the customer on key transitions (fire-and-forget).
    const customerEmail = order.contact?.email || '';
    if (customerEmail && order.status !== prevStatus) {
      let email = null;
      if (order.status === 'confirmed' && order.schedule?.from) {
        const settings = await Settings.findOne({ key: 'availability' });
        email = windowConfirmedEmail(order, settings?.pickupInstructions);
      } else if (order.status === 'delivered') {
        email = deliveredEmail(order);
      }
      if (email) sendMail({ to: customerEmail, ...email });
    }

    return res.json(order);
  } catch (error) {
    console.error('Update order error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   patch:
 *     summary: Cancel your own order (the order's owner)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    // Owner-only — a customer can cancel their own order.
    if (!order.user || order.user.toString() !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: `This order is already ${order.status}.` });
    }

    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', at: new Date() });
    await order.save();

    // Let the owner know (fire-and-forget).
    if (process.env.OWNER_EMAIL) {
      sendMail({ to: process.env.OWNER_EMAIL, ...orderCancelledOwnerEmail(order) });
    }

    return res.json(order);
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/orders/{id}/reschedule:
 *   patch:
 *     summary: Reschedule your own order's date/time (the order's owner)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/reschedule', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!order.user || order.user.toString() !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: `This order is already ${order.status}.` });
    }

    const { preferredDate, preferredTimes, rush } = req.body;
    const settings = await Settings.findOne({ key: 'availability' });
    const sched = validateSchedule({ preferredDate, preferredTimes, rush }, settings);
    if (sched.error) {
      return res.status(400).json({ error: sched.error });
    }

    order.preferredDate = preferredDate;
    order.preferredTimes = sched.windows.map((w) => ({ from: w.from || '', to: w.to || '' }));
    order.rush = sched.isRush;
    order.rushPercent = sched.isRush ? sched.rushPercent : 0;
    // A new date/time invalidates any confirmed window — reset to pending, clear schedule.
    if (order.status === 'confirmed') {
      order.schedule = { date: '', from: '', to: '' };
      order.status = 'pending';
      order.statusHistory.push({ status: 'pending', at: new Date() });
    }
    await order.save();

    if (process.env.OWNER_EMAIL) {
      sendMail({ to: process.env.OWNER_EMAIL, ...orderRescheduledOwnerEmail(order) });
    }

    return res.json(order);
  } catch (error) {
    console.error('Reschedule order error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Delete an order (admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order deleted
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Not found
 */
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json({ message: 'Order deleted' });
  } catch (error) {
    console.error('Delete order error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
