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
  referralRewardEmail, readyEmail, orderTotal, orderCancelledCustomerEmail,
} from '../utils/orderEmails.js';
import {
  lookupPromo, computeDiscount, lookupReferralUser, referralConfig, discountAmount,
  discountLabel, mintReferralReward, firstOrderConfig, hasPriorOrder,
} from './promos.js';
import {
  stripeEnabled, createOneTimeCheckout, createSubscriptionCheckout, createBillingPortalSession,
  cancelSubscription, retrieveCheckoutSession,
} from '../utils/stripe.js';
import { finalizeCheckoutSession } from '../utils/finalizeCheckout.js';
import {
  computeChargeCents, subscriptionMonthly, SUB_MIN_BUNDLES, SUB_MAX_BUNDLES,
  SUBSCRIPTION_WEEK_VALUES, orderBundleCount, FIRST_ORDER_MIN_BUNDLES, KINDLING_NAME,
} from '../data/catalog.js';
import { applyOrderInventory, restoreOrderInventory } from '../utils/inventory.js';

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

// Legacy subscription commitment months — only referenced by the in-app cancel route for old
// orders. New subscriptions cancel anytime via the Stripe Customer Portal.
const SUBSCRIPTION_MIN_MONTHS = 3;

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
      orderType, items, subscriptionBundles, subscriptionWeek,
      contact, deliveryAddress, preferredDate, preferredTimes,
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
    // Subscriptions: validate the requested size is a whole number in range.
    const subBundles = Math.round(Number(subscriptionBundles) || 0);
    if (orderType === 'subscription'
      && (subBundles < SUB_MIN_BUNDLES || subBundles > SUB_MAX_BUNDLES)) {
      return res.status(400).json({
        error: `Please choose ${SUB_MIN_BUNDLES}–${SUB_MAX_BUNDLES} bundles per month`,
      });
    }
    if (orderType === 'subscription' && agreedToTerms !== true) {
      return res.status(400).json({ error: 'Please authorize the monthly subscription to continue.' });
    }
    // Subscriptions bill automatically by card (Stripe), so they require Stripe to be enabled.
    if (orderType === 'subscription' && !stripeEnabled()) {
      return res.status(400).json({ error: 'Subscriptions need card payment — coming soon.' });
    }
    // Every order is delivered, so a street address is always required.
    if (!deliveryAddress?.street) {
      return res.status(400).json({ error: 'Delivery street address is required' });
    }

    // Scheduling. One-time orders pick a specific date + time window (validated against
    // availability/lead-time). Subscriptions instead pick a preferred WEEK of the month, so the
    // owner fulfills within that week — no specific date/lead-time check.
    const settings = await Settings.findOne({ key: 'availability' });

    // Fire Starter Pack add-on: require it offered + in stock for the ordered count, and stamp the
    // authoritative admin price on the cart item (so the stored order + total can't be tampered).
    const kindlingItem = cart.find((i) => i.name === KINDLING_NAME);
    if (kindlingItem) {
      const k = settings?.kindling || {};
      const available = k.enabled ? (Number(k.quantity) || 0) : 0;
      if (available <= 0) {
        return res.status(400).json({ error: 'Fire Starter Packs are out of stock right now.' });
      }
      if (kindlingItem.quantity > available) {
        return res.status(400).json({ error: `Only ${available} Fire Starter Pack${available === 1 ? '' : 's'} left.` });
      }
      kindlingItem.unitPrice = Number(k.price) || 0;
    }
    const extraPrices = { [KINDLING_NAME]: Number(settings?.kindling?.price) || 0 };

    let windows = [];
    let isRush = false;
    let rushPercent = 0;
    let subWeek = '';
    if (orderType === 'subscription') {
      subWeek = String(subscriptionWeek || 'any');
      if (!SUBSCRIPTION_WEEK_VALUES.includes(subWeek)) {
        return res.status(400).json({ error: 'Please choose a delivery week' });
      }
    } else {
      const sched = validateSchedule({ preferredDate, preferredTimes, rush }, settings);
      if (sched.error) {
        return res.status(400).json({ error: sched.error });
      }
      ({ windows, isRush, rushPercent } = sched);
    }

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
    // used. Server-authoritative (re-checks order history + the bundle minimum), so a stale client
    // can't claim it twice or on a too-small order (e.g. one $15 bundle covered by a $15 deal).
    if (!promoCode && !discount && orderType === 'onetime' && req.userId) {
      const fc = firstOrderConfig(settings);
      const enoughBundles = orderBundleCount(cart) >= FIRST_ORDER_MIN_BUNDLES;
      // Block reuse across multiple sign-ups: no prior order by this account, phone, or address.
      const usedBefore = await hasPriorOrder({
        userId: req.userId,
        phone: contact?.phone,
        street: deliveryAddress?.street,
      });
      if (fc.enabled && enoughBundles && !usedBefore) {
        discount = discountAmount(fc.type, fc.value, subtotal);
        if (discount > 0) promoCode = 'FIRST-ORDER';
      }
    }

    // Subscriptions always bill by card (auto-pay). One-time: card when requested + Stripe on, else Venmo.
    let resolvedPayment = 'venmo';
    if (orderType === 'subscription') resolvedPayment = 'card';
    else if (paymentMethod === 'card' && stripeEnabled()) resolvedPayment = 'card';

    const order = new Order({
      orderType,
      fulfillment: 'delivery',
      items: orderType === 'onetime' ? cart : [],
      woodType: settings?.woodType?.label || '',
      deliveryFee: 0,
      subscriptionPlan: orderType === 'subscription' ? `${subBundles}bundle` : '',
      subscriptionBundles: orderType === 'subscription' ? subBundles : 0,
      subscriptionMonthly: orderType === 'subscription' ? subscriptionMonthly(subBundles) : 0,
      subscriptionWeek: orderType === 'subscription' ? subWeek : '',
      // Cancel anytime (Stripe portal) — no minimum commitment.
      commitmentMonths: 0,
      commitmentEndsAt: null,
      agreedToTermsAt: orderType === 'subscription' ? new Date() : null,
      contact,
      deliveryAddress: deliveryAddress || {},
      preferredDate: orderType === 'onetime' ? preferredDate : '',
      preferredTimes: windows.map((w) => ({ from: w.from || '', to: w.to || '' })),
      rush: isRush,
      rushPercent: isRush ? rushPercent : 0,
      promoCode,
      discount,
      referredBy,
      paymentMethod: resolvedPayment,
      user: req.userId || null,
      status: 'received',
      statusHistory: [{ status: 'received', at: new Date() }],
      trackingToken: crypto.randomBytes(12).toString('hex'),
    });
    await order.save();

    // Card path: create a hosted Stripe Checkout Session and return its URL so the client can
    // redirect. One-time → a one-off charge; subscription → recurring monthly (card on file).
    let stripeCheckoutUrl = '';
    if (order.paymentMethod === 'card') {
      try {
        const base = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
        const successUrl = `${base}/order?status=paid&track=${order.trackingToken}`;
        const cancelUrl = `${base}/order?status=cancelled`;
        let session = null;
        if (order.orderType === 'subscription') {
          const monthlyCents = Math.round((order.subscriptionMonthly || 0) * 100);
          if (monthlyCents >= 50) {
            session = await createSubscriptionCheckout(order, monthlyCents, { successUrl, cancelUrl });
          }
        } else {
          const amountCents = computeChargeCents(order, extraPrices);
          if (amountCents >= 50) {
            const description = (order.items || []).map((i) => `${i.quantity}× ${i.name}`).join(', ');
            session = await createOneTimeCheckout(order, amountCents, { successUrl, cancelUrl, description });
          }
        }
        if (session?.url) {
          order.stripeSessionId = session.id;
          await order.save();
          stripeCheckoutUrl = session.url;
        }
      } catch (stripeErr) {
        console.error('Stripe checkout error:', stripeErr.message);
        // Leave the order as-is (unpaid); client falls back to the standard confirmation screen.
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
          await sendMail({ to: customerEmail, ...customerConfirmationEmail(order) });
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

    // Self-heal a card payment whose webhook was delayed or misconfigured: if Stripe says the
    // Checkout Session is paid but this order isn't yet, finalize it here (idempotent + race-safe).
    // Gated so already-paid and Venmo orders make no Stripe call.
    if (order.paymentStatus !== 'paid' && order.paymentMethod === 'card'
      && order.stripeSessionId && stripeEnabled()) {
      try {
        const session = await retrieveCheckoutSession(order.stripeSessionId);
        if (session?.payment_status === 'paid') {
          await finalizeCheckoutSession(order, session);
          order.paymentStatus = 'paid';
        }
      } catch (stripeErr) {
        console.error('Track reconciliation error:', stripeErr.message);
      }
    }

    return res.json({
      status: order.status,
      statusHistory: order.statusHistory,
      fulfillment: order.fulfillment,
      orderType: order.orderType,
      items: order.items,
      subscriptionPlan: order.subscriptionPlan,
      subscriptionBundles: order.subscriptionBundles,
      subscriptionWeek: order.subscriptionWeek,
      preferredDate: order.preferredDate,
      preferredTimes: order.preferredTimes,
      schedule: order.schedule,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      discount: order.discount || 0,
      rush: order.rush,
      rushPercent: order.rushPercent || 0,
      createdAt: order.createdAt,
      customerName: (order.contact?.name || '').split(' ')[0],
      total: orderTotal(order)?.total ?? null,
      venmoHandle: process.env.VENMO_HANDLE || '',
    });
  } catch (error) {
    console.error('Track order error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Public reorder-prefill lookup (same unguessable-token privacy model as /track/:token). Returns
// just enough to seed the order form from an emailed "reorder" link — the client feeds this through
// the same prefill path it uses for the in-app "Order again" button.
router.get('/reorder/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '');
    if (!token) return res.status(404).json({ error: 'Not found' });
    const order = await Order.findOne({ trackingToken: token });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json({
      orderType: order.orderType,
      items: (order.items || []).map((i) => ({ name: i.name, quantity: i.quantity })),
      subscriptionBundles: order.subscriptionBundles,
      subscriptionWeek: order.subscriptionWeek,
      fulfillment: order.fulfillment,
      deliveryAddress: order.deliveryAddress,
    });
  } catch (error) {
    console.error('Reorder lookup error:', error);
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

// Admin CSV export of orders for bookkeeping / taxes. MUST be registered before `GET /:id` so the
// literal `export.csv` path isn't read as an order id. Totals use the authoritative orderTotal().
router.get('/export.csv', auth, requireAdmin, async (req, res) => {
  try {
    const {
      from, to, status, orderType,
    } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (orderType) filter.orderType = orderType;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999); // inclusive through end of the "to" day
        filter.createdAt.$lte = end;
      }
    }
    const orders = await Order.find(filter).sort({ createdAt: 1 });

    const csvCell = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    const itemsText = (o) => (o.orderType === 'subscription'
      ? `${o.subscriptionBundles || 0} bundles/mo subscription`
      : (o.items || []).map((i) => `${i.quantity}× ${i.name}`).join('; '));

    const headers = [
      'Order date', 'Customer', 'Phone', 'Email', 'Type', 'Items', 'Bundles',
      'Total', 'Payment status', 'Payment method', 'Order status', 'Delivery date', 'Neighborhood',
    ];
    const rows = orders.map((o) => [
      ymd(o.createdAt),
      o.contact?.name || '',
      o.contact?.phone || '',
      o.contact?.email || '',
      o.orderType === 'subscription' ? 'Subscription' : 'One-time',
      itemsText(o),
      o.orderType === 'subscription' ? (o.subscriptionBundles || 0) : orderBundleCount(o.items),
      orderTotal(o)?.total ?? '',
      o.paymentStatus || '',
      o.paymentMethod || '',
      o.status || '',
      o.schedule?.date || o.preferredDate || '',
      o.deliveryAddress?.neighborhood || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');

    const range = `${from ? ymd(from) : 'all'}_to_${to ? ymd(to) : 'all'}`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="volw-orders-${range}.csv"`);
    return res.send(`\ufeff${csv}`); // lead with a UTF-8 BOM so Excel reads accented names correctly
  } catch (error) {
    console.error('Export orders error:', error);
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
      status, adminNotes, schedule, paymentStatus, cancelReason,
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
      if (status === 'cancelled') {
        order.cancelReason = (cancelReason || '').trim();
        // Stop any recurring charges on a cancelled subscription.
        if (order.stripeSubscriptionId && order.subscriptionStatus !== 'canceled') {
          try {
            await cancelSubscription(order.stripeSubscriptionId);
            order.subscriptionStatus = 'canceled';
          } catch (subErr) {
            console.error('Stripe subscription cancel error:', subErr.message);
          }
        }
      }
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

    // Keep prepared-bundle stock in sync with the payment toggle (Venmo orders are marked paid by
    // hand here). Deduct on unpaid→paid, restore on paid→unpaid. Idempotent + audited internally.
    if (order.paymentStatus === 'paid' && prevPayment !== 'paid') {
      await applyOrderInventory(order);
    } else if (order.paymentStatus === 'unpaid' && prevPayment === 'paid') {
      await restoreOrderInventory(order);
    }

    // Notify the customer on key transitions (fire-and-forget).
    const customerEmail = order.contact?.email || '';
    if (customerEmail && order.status !== prevStatus) {
      let email = null;
      if (order.status === 'confirmed' && order.schedule?.from) {
        email = windowConfirmedEmail(order);
      } else if (order.status === 'ready') {
        email = readyEmail(order);
      } else if (order.status === 'completed') {
        email = deliveredEmail(order);
      } else if (order.status === 'cancelled') {
        email = orderCancelledCustomerEmail(order, order.cancelReason);
      }
      if (email) sendMail({ to: customerEmail, ...email });
    }

    // Send a short receipt when the owner marks an order paid.
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
    if (['completed', 'cancelled'].includes(order.status)) {
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
    if (['completed', 'cancelled'].includes(order.status)) {
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
    // A new date/time invalidates any confirmed window — reset to received, clear schedule.
    if (order.status === 'confirmed') {
      order.schedule = { date: '', from: '', to: '' };
      order.status = 'received';
      order.statusHistory.push({ status: 'received', at: new Date() });
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

// Subscriber self-service: open the Stripe Customer Portal to manage/cancel a subscription.
router.post('/:id/billing-portal', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (String(order.user || '') !== String(req.userId)) {
      return res.status(403).json({ error: 'Not your order' });
    }
    if (!order.stripeCustomerId) {
      return res.status(400).json({ error: 'No subscription on file for this order' });
    }
    const base = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
    const session = await createBillingPortalSession(order.stripeCustomerId, `${base}/my-orders`);
    if (!session?.url) return res.status(503).json({ error: 'Billing portal unavailable' });
    return res.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
