/* eslint-disable no-underscore-dangle */
import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import Order from '../models/Order.js';
import DeliveryPhoto from '../models/DeliveryPhoto.js';
import { ensureOrderGeo } from '../utils/geocode.js';
import { streetKey } from '../utils/dedupe.js';
import { orderTotal } from '../utils/orderEmails.js';
import { orderBundleCount } from '../data/catalog.js';

// Admin-only delivery map: every delivered order with where / who / when, map pins, and photos.
const router = express.Router();
router.use(auth, requireAdmin);

export const MAX_PHOTOS_PER_ORDER = 6;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const DELIVERED = ['completed', 'delivered']; // 'delivered' = legacy status name
const UPCOMING = ['received', 'pending', 'confirmed', 'ready'];

const isId = (id) => mongoose.isValidObjectId(id);
const hasPin = (geo) => Number.isFinite(geo?.lat) && Number.isFinite(geo?.lng);

// When it was delivered: the last "completed" status change, else the scheduled/preferred day.
function deliveredOn(order) {
  const done = (order.statusHistory || []).filter((h) => DELIVERED.includes(h.status));
  if (done.length) return new Date(done[done.length - 1].at).toISOString();
  return order.schedule?.date || order.preferredDate || '';
}

function toRecord(order, photoIds) {
  const total = orderTotal(order);
  return {
    _id: order._id,
    status: order.status,
    delivered: DELIVERED.includes(order.status),
    date: DELIVERED.includes(order.status)
      ? deliveredOn(order)
      : (order.schedule?.date || order.preferredDate || ''),
    createdAt: order.createdAt,
    name: order.contact?.name || '',
    phone: order.contact?.phone || '',
    street: order.deliveryAddress?.street || '',
    unit: order.deliveryAddress?.unit || '',
    neighborhood: order.deliveryAddress?.neighborhood || '',
    addressKey: order.streetKey || streetKey(order.deliveryAddress?.street),
    orderType: order.orderType,
    items: order.items || [],
    bundles: order.orderType === 'subscription'
      ? (order.subscriptionBundles || 0)
      : orderBundleCount(order.items),
    total: total ? total.total : null,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    geo: hasPin(order.geo)
      ? { lat: order.geo.lat, lng: order.geo.lng, source: order.geo.source }
      : null,
    photoIds,
  };
}

/**
 * @swagger
 * /api/deliveries:
 *   get:
 *     summary: Delivered orders with map pins + photo ids (admin); ?include=upcoming adds open ones
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  const statuses = req.query.include === 'upcoming'
    ? [...DELIVERED, ...UPCOMING]
    : DELIVERED;
  const orders = await Order.find({ status: { $in: statuses } }).sort({ createdAt: -1 });

  // Pin any address never looked up — once per address, reusing a pin another order at the same
  // street already has. Sequential on purpose (tiny volume, polite to the free geocoder).
  const known = new Map();
  orders.forEach((o) => {
    const key = o.streetKey || streetKey(o.deliveryAddress?.street);
    if (key && hasPin(o.geo) && !known.has(key)) known.set(key, o.geo);
  });
  // eslint-disable-next-line no-restricted-syntax
  for (const o of orders) {
    // eslint-disable-next-line no-await-in-loop
    if (!o.geo?.source) await ensureOrderGeo(o, { cache: known });
  }

  const photos = await DeliveryPhoto.find({ order: { $in: orders.map((o) => o._id) } })
    .select('_id order').sort({ createdAt: 1 }).lean();
  const byOrder = new Map();
  photos.forEach((p) => {
    const k = String(p.order);
    byOrder.set(k, [...(byOrder.get(k) || []), p._id]);
  });

  return res.json({ deliveries: orders.map((o) => toRecord(o, byOrder.get(String(o._id)) || [])) });
});

// Drop a pin by hand ("Fix pin") — for addresses the geocoder misses or places slightly off.
// Applies to every order at the same street so repeat customers move together.
router.patch('/:orderId/location', async (req, res) => {
  if (!isId(req.params.orderId)) return res.status(404).json({ error: 'Order not found' });
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'Valid lat and lng are required' });
  }
  const order = await Order.findById(req.params.orderId).select('streetKey deliveryAddress');
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const geo = {
    lat, lng, source: 'manual', at: new Date(),
  };
  const key = order.streetKey || streetKey(order.deliveryAddress?.street);
  const filter = key ? { $or: [{ _id: order._id }, { streetKey: key }] } : { _id: order._id };
  await Order.updateMany(filter, { $set: { geo } });
  return res.json({ geo: { lat, lng, source: 'manual' } });
});

// Upload a delivery photo as a data URL (the admin page resizes to ~1600px JPEG first).
router.post('/:orderId/photos', async (req, res) => {
  if (!isId(req.params.orderId)) return res.status(404).json({ error: 'Order not found' });
  const dataUrl = /^data:(image\/(?:jpeg|webp|png));base64,([A-Za-z0-9+/=]+)$/;
  const match = dataUrl.exec(String(req.body?.dataUrl || ''));
  if (!match) return res.status(400).json({ error: 'Send a JPEG, WebP or PNG image' });
  const data = Buffer.from(match[2], 'base64');
  if (!data.length) return res.status(400).json({ error: 'Empty image' });
  if (data.length > MAX_PHOTO_BYTES) return res.status(413).json({ error: 'Photo is too large' });

  const exists = await Order.exists({ _id: req.params.orderId });
  if (!exists) return res.status(404).json({ error: 'Order not found' });
  const count = await DeliveryPhoto.countDocuments({ order: req.params.orderId });
  if (count >= MAX_PHOTOS_PER_ORDER) {
    return res.status(409).json({ error: `Up to ${MAX_PHOTOS_PER_ORDER} photos per delivery` });
  }
  const photo = await DeliveryPhoto.create({
    order: req.params.orderId, contentType: match[1], data,
  });
  return res.status(201).json({ photoId: photo._id });
});

// The image bytes (admin-only — the page fetches with the auth header and shows a blob URL).
router.get('/photos/:photoId', async (req, res) => {
  if (!isId(req.params.photoId)) return res.status(404).json({ error: 'Photo not found' });
  const photo = await DeliveryPhoto.findById(req.params.photoId);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  res.set('Content-Type', photo.contentType);
  res.set('Cache-Control', 'private, max-age=86400');
  return res.send(photo.data);
});

router.delete('/photos/:photoId', async (req, res) => {
  if (!isId(req.params.photoId)) return res.status(404).json({ error: 'Photo not found' });
  const gone = await DeliveryPhoto.findByIdAndDelete(req.params.photoId);
  if (!gone) return res.status(404).json({ error: 'Photo not found' });
  return res.json({ ok: true });
});

export default router;
