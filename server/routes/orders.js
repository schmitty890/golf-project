import express from 'express';
import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';

const router = express.Router();

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
      subscriptionPlan, season, contact, deliveryAddress, fulfillment,
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
      user: req.userId || null,
      statusHistory: [{ status: 'pending', at: new Date() }],
    });
    await order.save();

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
      .populate('user', 'email firstName lastName');
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
