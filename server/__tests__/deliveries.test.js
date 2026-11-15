/* eslint-disable no-underscore-dangle */
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Order from '../models/Order.js';
import deliveriesRouter, { MAX_PHOTOS_PER_ORDER } from '../routes/deliveries.js';

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use('/api/deliveries', express.json({ limit: '8mb' }), deliveriesRouter);

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

afterAll(() => { globalThis.fetch = realFetch; });

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
});
