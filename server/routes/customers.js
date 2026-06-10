import express from 'express';
import Order from '../models/Order.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { orderTotal } from '../utils/orderEmails.js';

const router = express.Router();

// Compact per-order summary for the admin customers view.
const summarize = (o) => ({
  id: String(o._id),
  createdAt: o.createdAt,
  orderType: o.orderType,
  subscriptionBundles: o.subscriptionBundles || 0,
  subscriptionWeek: o.subscriptionWeek || '',
  items: (o.items || []).map((i) => ({ name: i.name, quantity: i.quantity })),
  status: o.status,
  paymentStatus: o.paymentStatus,
  fulfillment: o.fulfillment,
  phone: o.contact?.phone || '',
  total: orderTotal(o)?.total || 0,
});

// Roll a list of (desc-sorted) order summaries into per-customer stats.
const rollUp = (orders) => ({
  orderCount: orders.length,
  lastOrderAt: orders[0]?.createdAt || null,
  totalValue: orders.reduce((s, o) => s + (o.total || 0), 0),
  counts: {
    onetime: orders.filter((o) => o.orderType === 'onetime').length,
    subscription: orders.filter((o) => o.orderType === 'subscription').length,
  },
  orders,
});

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Admin — list customers (registered accounts + guest buyers) with order stats
 *     tags: [Customers]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: '{ accounts, guests }' }
 *       403: { description: Admin access required }
 */
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const [users, orders] = await Promise.all([
      User.find().select('-password').sort({ createdAt: -1 }).lean(),
      Order.find().sort({ createdAt: -1 }).lean(),
    ]);

    // Bucket orders by account id (when linked) or guest email (when not).
    const byUser = new Map();
    const byGuest = new Map(); // key -> { email, name, phone, orders[] }
    orders.forEach((o) => {
      const summary = summarize(o);
      if (o.user) {
        const k = String(o.user);
        if (!byUser.has(k)) byUser.set(k, []);
        byUser.get(k).push(summary);
      } else {
        const email = (o.contact?.email || '').trim().toLowerCase();
        const key = email || `__noemail__:${o._id}`;
        if (!byGuest.has(key)) {
          byGuest.set(key, {
            email, name: o.contact?.name || '', phone: o.contact?.phone || '', orders: [],
          });
        }
        byGuest.get(key).orders.push(summary);
      }
    });

    // Account holders — include everyone, even with zero orders.
    const accounts = users.map((u) => {
      const list = byUser.get(String(u._id)) || [];
      return {
        userId: String(u._id),
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        phone: list[0]?.phone || '', // most-recent order's phone, if any
        ...rollUp(list),
      };
    }).sort((a, b) => (b.lastOrderAt ? new Date(b.lastOrderAt) : 0)
      - (a.lastOrderAt ? new Date(a.lastOrderAt) : 0));

    // Guest buyers — grouped by email (orders with no account).
    const guests = Array.from(byGuest.values()).map((g) => ({
      email: g.email,
      name: g.name,
      phone: g.phone,
      ...rollUp(g.orders),
    })).sort((a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt));

    return res.json({ accounts, guests });
  } catch (error) {
    console.error('List customers error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
