/* eslint-disable no-underscore-dangle */
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Order from '../models/Order.js';
import deliveriesRouter, { MAX_PHOTOS_PER_ORDER } from '../routes/deliveries.js';
import ordersRouter from '../routes/orders.js';
import { ensureOrderGeo } from '../utils/geocode.js';
import { setTransportForTests } from '../utils/mailer.js';
import { sendOverdueDeliveredEmails, HELD_EMAIL_GRACE_MS } from '../utils/deliveredNotice.js';

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use('/api/deliveries', express.json({ limit: '8mb' }), deliveriesRouter);
app.use('/api/orders', express.json(), ordersRouter);

const tokenFor = (user) => `Bearer ${jwt.sign({ userId: String(user._id) }, process.env.JWT_SECRET)}`;
const JPEG = `data:image/jpeg;base64,${Buffer.from('fake-jpeg-bytes').toString('base64')}`;

let admin;
let customer;
const realFetch = globalThis.fetch;

// Census geocoder stand-in: matches "100 Vine St", misses everything else.
const censusMock = async (url) => {
  censusMock.calls.push(url);
  const address = new URL(url).searchParams.get('address');
  const hit = address.startsWith('100 Vine St');
  return {
    ok: true,
    json: async () => ({
      result: { addressMatches: hit ? [{ coordinates: { x: -81.07, y: 35.11 } }] : [] },
    }),
  };
};
censusMock.calls = [];

const makeOrder = (over = {}) => Order.create({
  orderType: 'onetime',
  items: [{ name: '3-Bundle Pack', quantity: 2, unitPrice: 40 }],
  contact: { name: 'Pat Neighbor', phone: '555-111-2222', email: 'pat@example.com' },
  deliveryAddress: { street: '100 Vine St', neighborhood: 'Napa' },
  status: 'completed',
  statusHistory: [{ status: 'received', at: new Date('2026-11-10T15:00:00Z') },
    { status: 'completed', at: new Date('2026-11-14T22:00:00Z') }],
  paymentStatus: 'paid',
  ...over,
});

beforeEach(async () => {
  censusMock.calls = [];
  globalThis.fetch = censusMock;
  admin = await User.create({
    name: 'Owner', email: 'owner@example.com', password: 'secret123', role: 'admin',
  });
  customer = await User.create({ name: 'Cust', email: 'cust@example.com', password: 'secret123' });
});

// Records every email instead of sending it.
const outbox = [];
setTransportForTests({ sendMail: async (msg) => { outbox.push(msg); } });
beforeEach(() => { outbox.length = 0; });

const waitFor = async (fn) => {
  for (let i = 0; i < 40; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await fn()) return;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => { setTimeout(r, 25); });
  }
};

afterAll(() => { globalThis.fetch = realFetch; setTransportForTests(null); });

describe('admin delivery map', () => {
  test('requires a signed-in admin', async () => {
    await request(app).get('/api/deliveries').expect(401);
    await request(app).get('/api/deliveries').set('Authorization', tokenFor(customer)).expect(403);
  });

  test('lists delivered orders with when, who, bundles, total and a geocoded pin', async () => {
    await makeOrder();
    await makeOrder({ status: 'confirmed', contact: { name: 'Future', phone: '555-000-0000' } });
    const res = await request(app).get('/api/deliveries').set('Authorization', tokenFor(admin)).expect(200);
    expect(res.body.deliveries).toHaveLength(1);
    const [d] = res.body.deliveries;
    expect(d).toMatchObject({
      name: 'Pat Neighbor', street: '100 Vine St', bundles: 6, total: 80, delivered: true,
    });
    expect(d.date).toBe('2026-11-14T22:00:00.000Z');
    expect(d.geo).toEqual({ lat: 35.11, lng: -81.07, source: 'census' });
    expect(censusMock.calls).toHaveLength(1);
    expect(censusMock.calls[0]).toContain('Lake+Wylie');
    expect(censusMock.calls[0]).not.toContain('Pat');

    const upcoming = await request(app).get('/api/deliveries?include=upcoming')
      .set('Authorization', tokenFor(admin)).expect(200);
    expect(upcoming.body.deliveries).toHaveLength(2);
  });

  test('geocodes each address once and does not retry a miss', async () => {
    await makeOrder();
    await makeOrder(); // same street — reuses the pin
    await makeOrder({ deliveryAddress: { street: '9 Nowhere Ln' } });
    const auth = tokenFor(admin);
    const first = await request(app).get('/api/deliveries').set('Authorization', auth).expect(200);
    expect(censusMock.calls).toHaveLength(2);
    expect(first.body.deliveries.filter((d) => d.geo)).toHaveLength(2);
    expect(first.body.deliveries.find((d) => d.street === '9 Nowhere Ln').geo).toBeNull();

    await request(app).get('/api/deliveries').set('Authorization', auth).expect(200);
    expect(censusMock.calls).toHaveLength(2);
  });

  test('Fix pin sets a manual location for every order at that street', async () => {
    const a = await makeOrder({ deliveryAddress: { street: '9 Nowhere Ln' } });
    const b = await makeOrder({ deliveryAddress: { street: '9 nowhere ln.' } });
    const auth = tokenFor(admin);
    await request(app).patch(`/api/deliveries/${a._id}/location`).set('Authorization', auth)
      .send({ lat: 'x', lng: 1 })
      .expect(400);
    await request(app).patch(`/api/deliveries/${a._id}/location`).set('Authorization', auth)
      .send({ lat: 35.1, lng: -81.05 })
      .expect(200);
    const again = await Order.findById(b._id);
    expect(again.geo).toMatchObject({ lat: 35.1, lng: -81.05, source: 'manual' });
  });

  test('photos: upload, fetch, cap, type check, delete', async () => {
    const order = await makeOrder();
    const auth = tokenFor(admin);
    await request(app).post(`/api/deliveries/${order._id}/photos`).set('Authorization', auth)
      .send({ dataUrl: 'data:text/html;base64,PGI+aGk8L2I+' })
      .expect(400);

    const up = await request(app).post(`/api/deliveries/${order._id}/photos`).set('Authorization', auth)
      .send({ dataUrl: JPEG })
      .expect(201);
    const img = await request(app).get(`/api/deliveries/photos/${up.body.photoId}`)
      .set('Authorization', auth).expect(200);
    expect(img.headers['content-type']).toBe('image/jpeg');
    expect(Buffer.from(img.body).toString()).toBe('fake-jpeg-bytes');
    await request(app).get(`/api/deliveries/photos/${up.body.photoId}`)
      .set('Authorization', tokenFor(customer)).expect(403);

    const list = await request(app).get('/api/deliveries').set('Authorization', auth).expect(200);
    expect(list.body.deliveries[0].photoIds).toEqual([up.body.photoId]);

    for (let i = 1; i < MAX_PHOTOS_PER_ORDER; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app).post(`/api/deliveries/${order._id}/photos`).set('Authorization', auth)
        .send({ dataUrl: JPEG })
        .expect(201);
    }
    await request(app).post(`/api/deliveries/${order._id}/photos`).set('Authorization', auth)
      .send({ dataUrl: JPEG })
      .expect(409);

    await request(app).delete(`/api/deliveries/photos/${up.body.photoId}`).set('Authorization', auth).expect(200);
    await request(app).get(`/api/deliveries/photos/${up.body.photoId}`).set('Authorization', auth).expect(404);
  });

  test('ensureOrderGeo reuses a saved pin for the same street before geocoding', async () => {
    const first = await makeOrder();
    await ensureOrderGeo(first);
    expect(censusMock.calls).toHaveLength(1);
    const second = await makeOrder({ deliveryAddress: { street: '100 vine st.' } });
    const geo = await ensureOrderGeo(second);
    expect(geo).toMatchObject({ lat: 35.11, lng: -81.07, source: 'census' });
    expect(censusMock.calls).toHaveLength(1);
    const miss = await makeOrder({ deliveryAddress: { street: '9 Nowhere Ln' } });
    expect(await ensureOrderGeo(miss)).toMatchObject({ source: 'failed' });
    await ensureOrderGeo(miss);
    expect(censusMock.calls).toHaveLength(2);
  });

  test('marking an order Delivered drops its pin in the background', async () => {
    const order = await makeOrder({ status: 'ready', statusHistory: [] });
    await request(app).patch(`/api/orders/${order._id}`).set('Authorization', tokenFor(admin))
      .send({ status: 'completed' })
      .expect(200);
    let saved;
    for (let i = 0; i < 20; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      saved = await Order.findById(order._id);
      if (saved.geo?.source) break;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => { setTimeout(r, 50); });
    }
    expect(saved.geo).toMatchObject({ lat: 35.11, lng: -81.07, source: 'census' });
  });

  test('Mark delivered without the hold sends the thank-you email right away', async () => {
    const order = await makeOrder({ status: 'ready', statusHistory: [] });
    await request(app).patch(`/api/orders/${order._id}`).set('Authorization', tokenFor(admin))
      .send({ status: 'completed' })
      .expect(200);
    await waitFor(() => outbox.length > 0);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe('pat@example.com');
    expect(outbox[0].attachments).toBeUndefined();
    expect((await Order.findById(order._id)).deliveredEmailSentAt).toBeTruthy();
  });

  test('held email goes out with the drop-off photos inline once released', async () => {
    const auth = tokenFor(admin);
    const order = await makeOrder({ status: 'ready', statusHistory: [] });
    const marked = await request(app).patch(`/api/orders/${order._id}`).set('Authorization', auth)
      .send({ status: 'completed', holdDeliveredEmail: true })
      .expect(200);
    expect(marked.body.deliveredEmailHeldAt).toBeTruthy();
    await new Promise((r) => { setTimeout(r, 100); });
    expect(outbox).toHaveLength(0);

    for (let i = 0; i < 2; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app).post(`/api/deliveries/${order._id}/photos`).set('Authorization', auth)
        .send({ dataUrl: JPEG })
        .expect(201);
    }
    const res = await request(app).post(`/api/deliveries/${order._id}/email`).set('Authorization', auth)
      .send({})
      .expect(200);
    expect(res.body).toMatchObject({ sent: true, photoCount: 2 });
    expect(outbox).toHaveLength(1);
    const [msg] = outbox;
    expect(msg.attachments).toHaveLength(2);
    expect(msg.attachments[0]).toMatchObject({ cid: 'delivery-0@volw', contentType: 'image/jpeg' });
    expect(msg.attachments[0].content.toString()).toBe('fake-jpeg-bytes');
    expect(msg.html).toContain('cid:delivery-0@volw');
    expect(msg.html).toContain('cid:delivery-1@volw');
    expect(msg.text).toContain('2 photos');
    const saved = await Order.findById(order._id);
    expect(saved.deliveredEmailSentAt).toBeTruthy();
    expect(saved.deliveredEmailHeldAt).toBeNull();

    // Once only, unless the owner re-sends on purpose.
    const again = await request(app).post(`/api/deliveries/${order._id}/email`).set('Authorization', auth)
      .send({})
      .expect(200);
    expect(again.body).toMatchObject({ sent: false, reason: 'already-sent' });
    await request(app).post(`/api/deliveries/${order._id}/email`).set('Authorization', auth)
      .send({ resend: true })
      .expect(200);
    expect(outbox).toHaveLength(2);
  });

  test('delivery email: admin only, needs an email and a delivered order', async () => {
    const noEmail = await makeOrder({ contact: { name: 'No Mail', phone: '555' } });
    const open = await makeOrder({ status: 'ready' });
    await request(app).post(`/api/deliveries/${open._id}/email`).set('Authorization', tokenFor(customer))
      .send({})
      .expect(403);
    await request(app).post(`/api/deliveries/${noEmail._id}/email`).set('Authorization', tokenFor(admin))
      .send({})
      .expect(400);
    await request(app).post(`/api/deliveries/${open._id}/email`).set('Authorization', tokenFor(admin))
      .send({})
      .expect(409);
    expect(outbox).toHaveLength(0);
  });

  test('a held email the owner never released is sent by the safety net', async () => {
    const now = new Date();
    const heldAt = new Date(now - HELD_EMAIL_GRACE_MS - 1000);
    const stale = await makeOrder({ deliveredEmailHeldAt: heldAt });
    await makeOrder({ deliveredEmailHeldAt: new Date(now - 60 * 1000) }); // still within grace
    expect(await sendOverdueDeliveredEmails(now)).toBe(1);
    expect(outbox).toHaveLength(1);
    expect((await Order.findById(stale._id)).deliveredEmailSentAt).toBeTruthy();
    expect(await sendOverdueDeliveredEmails(now)).toBe(0);
  });
});
