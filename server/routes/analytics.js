import express from 'express';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import Order from '../models/Order.js';
import { orderBundleCount } from '../data/catalog.js';

const router = express.Router();

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Bundles represented by an order (one-time cart vs. subscription monthly size).
function bundlesForOrder(o) {
  if (o.orderType === 'subscription') return Math.round(Number(o.subscriptionBundles) || 0);
  return orderBundleCount(o.items);
}

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/**
 * @swagger
 * /api/analytics/orders:
 *   get:
 *     summary: Order/bundle timing aggregates for the admin dashboard (admin)
 *     security:
 *       - bearerAuth: []
 */
// Aggregates PAID orders by paidAt. `?days=N` (default 90) bounds the over-time series; the
// day-of-week and month breakdowns use full history so seasonal patterns show. Order volume here is
// small (a single neighborhood), so in-memory aggregation is simpler than a Mongo pipeline and lets
// us reuse orderBundleCount + the subscription rule.
router.get('/orders', auth, requireAdmin, async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, Math.round(Number(req.query.days) || 90)));
    const orders = await Order.find({ paymentStatus: 'paid', paidAt: { $ne: null } })
      .select('orderType items subscriptionBundles paidAt')
      .lean();

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (days - 1));

    const overTimeMap = new Map(); // 'YYYY-MM-DD' -> { orders, bundles }
    const monthMap = new Map(); // 'YYYY-MM' -> { orders, bundles }
    const dowAgg = DOW.map((day) => ({ day, orders: 0, bundles: 0 }));
    const totals = { orders: 0, bundles: 0 };

    orders.forEach((o) => {
      const paid = new Date(o.paidAt);
      const bundles = bundlesForOrder(o);
      totals.orders += 1;
      totals.bundles += bundles;

      const mk = ym(paid);
      const m = monthMap.get(mk) || { month: mk, orders: 0, bundles: 0 };
      m.orders += 1; m.bundles += bundles; monthMap.set(mk, m);

      const dow = dowAgg[paid.getDay()];
      dow.orders += 1; dow.bundles += bundles;

      if (paid >= cutoff) {
        const dk = ymd(paid);
        const d = overTimeMap.get(dk) || { date: dk, orders: 0, bundles: 0 };
        d.orders += 1; d.bundles += bundles; overTimeMap.set(dk, d);
      }
    });

    const sortByKey = (key) => (a, b) => (a[key] < b[key] ? -1 : 1);
    return res.json({
      days,
      totals,
      overTime: [...overTimeMap.values()].sort(sortByKey('date')),
      byMonth: [...monthMap.values()].sort(sortByKey('month')),
      byDayOfWeek: dowAgg,
    });
  } catch (error) {
    console.error('Order analytics error:', error);
    return res.status(500).json({ error: 'Failed to load analytics' });
  }
});

export default router;
