import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { sendMail } from '../utils/mailer.js';
import {
  customerConfirmationEmail, ownerAlertEmail, windowConfirmedEmail, deliveredEmail,
  orderCancelledOwnerEmail, orderRescheduledOwnerEmail, paymentReceivedEmail,
  referralRewardEmail, readyEmail, orderTotal,
} from '../utils/orderEmails.js';
import {
  lookupPromo, computeDiscount, lookupReferralUser, referralConfig, discountAmount,
  discountLabel, mintReferralReward, firstOrderConfig,
} from './promos.js';
import { stripeEnabled, createOneTimeCheckout } from '../utils/stripe.js';
import { computeChargeCents } from '../data/catalog.js';

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

// Minimum subscription commitment before it goes month-to-month (authoritative; keep in sync
// with SUBSCRIPTION_MIN_MONTHS in client/src/data/pricing.js).
const SUBSCRIPTION_MIN_MONTHS = 3;
const addMonths = (date, n) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
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
      orderType, items, subscriptionPlan, deliveryFee,
      contact, deliveryAddress, fulfillment, preferredDate, preferredTimes,
      rush, code, subtotal, agreedToTerms, paymentMethod,
    } = req.body;

    if (!['onetime', 'subscription'].includes(orderType)) {
      return res.status(400).json({ error: 'A valid order type is required' });
    }
    if (!contact?.name || !contact?.phone) {
      return res.status(400).json({ error: 'Contact name and phone are required' });
    }
    // Sanitize the cart for one-time orders; require at least one item.
    const cart = Array.isArray(items)
      ? items
        .filter((i) => i && i.name && Number(i.quantity) > 0)
        .map((i) => ({ name: i.name, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) || 0 }))
      : [];
    if (orderType === 'onetime' && cart.length === 0) {
      return res.status(400).json({ error: 'Please add at least one item' });
    }
    if (orderType === 'subscription' && !subscriptionPlan) {
      return res.status(400).json({ error: 'Please choose a subscription plan' });
    }
    if (orderType === 'subscription' && agreedToTerms !== true) {
      return res.status(400).json({ error: `Please agree to the ${SUBSCRIPTION_MIN_MONTHS}-month commitment to subscribe.` });
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
    let referrer = null;
    const promo = await lookupPromo(code);
    if (promo) {
      discount = computeDiscount(promo, subtotal);
      promoCode = promo.code;
      promo.uses += 1;
      await promo.save();
    } else if (code) {
      const rc = referralConfig(settings);
      referrer = rc.enabled ? await lookupReferralUser(code, req.userId) : null;
      if (referrer) {
        discount = discountAmount(rc.type, rc.value, subtotal);
        promoCode = referrer.referralCode;
        referredBy = referrer._id;
      }
    }

    // First-order deal: auto-apply for a signed-in customer's first one-time order, when no code was
    // used. Server-authoritative (re-checks order history), so a stale client can't claim it twice.
    if (!promoCode && !discount && orderType === 'onetime' && req.userId) {
      const fc = firstOrderConfig(settings);
      if (fc.enabled && !(await Order.exists({ user: req.userId }))) {
        discount = discountAmount(fc.type, fc.value, subtotal);
        if (discount > 0) promoCode = 'FIRST-ORDER';
      }
    }

    const order = new Order({
      orderType,
      fulfillment: fulfillment === 'pickup' ? 'pickup' : 'delivery',
      items: orderType === 'onetime' ? cart : [],
      deliveryFee: fulfillment === 'pickup' ? 0 : Math.max(0, Number(deliveryFee) || 0),
      subscriptionPlan: orderType === 'subscription' ? (subscriptionPlan || '') : '',
      commitmentMonths: orderType === 'subscription' ? SUBSCRIPTION_MIN_MONTHS : 0,
      commitmentEndsAt: orderType === 'subscription' ? addMonths(new Date(), SUBSCRIPTION_MIN_MONTHS) : null,
      agreedToTermsAt: orderType === 'subscription' ? new Date() : null,
      contact,
      deliveryAddress: deliveryAddress || {},
      preferredDate,
      preferredTimes: windows.map((w) => ({ from: w.from || '', to: w.to || '' })),
      rush: isRush,
      rushPercent: isRush ? rushPercent : 0,
      promoCode,
      discount,
      referredBy,
      // Card is only offered for one-time orders in Phase 1; everything else stays Venmo.
      paymentMethod: (paymentMethod === 'card' && orderType === 'onetime' && stripeEnabled()) ? 'card' : 'venmo',
      user: req.userId || null,
      status: 'received',
      statusHistory: [{ status: 'received', at: new Date() }],
      trackingToken: crypto.randomBytes(12).toString('hex'),
    });
    await order.save();

    // Card path: create a hosted Stripe Checkout Session for the server-authoritative amount and
    // return its URL so the client can redirect. Falls through to the Venmo response on any issue.
    let stripeCheckoutUrl = '';
    if (order.paymentMethod === 'card') {
      try {
        const amountCents = computeChargeCents(order);
        if (amountCents >= 50) {
          const base = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
          const description = (order.items || []).map((i) => `${i.quantity}× ${i.name}`).join(', ');
          const session = await createOneTimeCheckout(order, amountCents, {
            successUrl: `${base}/order?status=paid&track=${order.trackingToken}`,
            cancelUrl: `${base}/order?status=cancelled`,
            description,
          });
          if (session?.url) {
            order.stripeSessionId = session.id;
            await order.save();
            stripeCheckoutUrl = session.url;
          }
        }
      } catch (stripeErr) {
        console.error('Stripe checkout error:', stripeErr.message);
        // Leave the order as-is (unpaid); client falls back to the Venmo screen.
      }
    }

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
        // Reward the referrer: mint a one-time discount code for their next order and email it.
        if (referredBy && referrer) {
          const rc = referralConfig(settings);
          const reward = await mintReferralReward(referredBy, rc);
          if (referrer.email) {
            await sendMail({
              to: referrer.email,
              ...referralRewardEmail(referrer, reward, discountLabel(rc.type, rc.value)),
            });
          }
        }
      } catch (mailErr) {
        console.error('Order notification error:', mailErr.message);
      }
    })();

    return res.status(201).json({ ...order.toObject(), stripeCheckoutUrl });
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

// Public order tracking by token (no auth). Returns a PII-light view — no phone/email/address.
router.get('/track/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '');
    if (!token) return res.status(404).json({ error: 'Not found' });
    const order = await Order.findOne({ trackingToken: token });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Reveal the pickup address only once the order is confirmed (and it's a pickup order).
    const confirmedStages = ['confirmed', 'ready', 'completed', 'delivered'];
    let pickupAddress = '';
    if (order.fulfillment === 'pickup' && confirmedStages.includes(order.status)) {
      const settings = await Settings.findOne({ key: 'availability' });
      pickupAddress = settings?.pickupAddress || '';
    }
    return res.json({
      status: order.status,
      statusHistory: order.statusHistory,
      fulfillment: order.fulfillment,
      orderType: order.orderType,
      items: order.items,
      subscriptionPlan: order.subscriptionPlan,
      preferredDate: order.preferredDate,
      preferredTimes: order.preferredTimes,
      schedule: order.schedule,
      paymentStatus: order.paymentStatus,
      rush: order.rush,
      createdAt: order.createdAt,
      customerName: (order.contact?.name || '').split(' ')[0],
      total: orderTotal(order)?.total ?? null,
      venmoHandle: process.env.VENMO_HANDLE || '',
      pickupAddress,
    });
  } catch (error) {
    console.error('Track order error:', error);
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
    const {
      status, adminNotes, schedule, paymentStatus,
    } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const ALLOWED_STATUSES = ['received', 'confirmed', 'ready', 'completed', 'cancelled'];
    const prevStatus = order.status;
    if (status !== undefined && status !== order.status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      order.statusHistory.push({ status, at: new Date() });
      order.status = status;
    }
    const prevPayment = order.paymentStatus;
    if (paymentStatus !== undefined) {
      if (!['unpaid', 'paid'].includes(paymentStatus)) {
        return res.status(400).json({ error: 'Invalid payment status' });
      }
      if (paymentStatus !== order.paymentStatus) {
        order.paymentStatus = paymentStatus;
        order.paidAt = paymentStatus === 'paid' ? new Date() : null;
      }
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
        email = windowConfirmedEmail(order, settings?.pickupAddress);
      } else if (order.status === 'ready') {
        const settings = await Settings.findOne({ key: 'availability' });
        email = readyEmail(order, settings?.pickupAddress);
      } else if (order.status === 'completed') {
        email = deliveredEmail(order);
      }
      if (email) sendMail({ to: customerEmail, ...email });
    }

    // Send a short receipt when the owner marks an order paid (fire-and-forget).
    if (customerEmail && order.paymentStatus === 'paid' && prevPayment !== 'paid') {
      sendMail({ to: customerEmail, ...paymentReceivedEmail(order) });
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
    // Subscriptions are locked in until the minimum commitment ends (owner can override in Admin).
    if (order.orderType === 'subscription' && order.commitmentEndsAt
      && new Date() < order.commitmentEndsAt) {
      return res.status(400).json({ error: `Your subscription has a ${order.commitmentMonths || SUBSCRIPTION_MIN_MONTHS}-month minimum — contact us to make changes.` });
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
