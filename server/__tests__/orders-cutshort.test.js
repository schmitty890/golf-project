/* eslint-disable no-underscore-dangle */
import express from 'express';
import request from 'supertest';
import Order from '../models/Order.js';
import Settings from '../models/Settings.js';
import ordersRouter from '../routes/orders.js';
import { ownerAlertEmail, customerConfirmationEmail } from '../utils/orderEmails.js';
import { setTransportForTests } from '../utils/mailer.js';

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use('/api/orders', ordersRouter);

setTransportForTests({ sendMail: async () => {} });
afterAll(() => setTransportForTests(null));

// A weekday comfortably past any lead time, as local YYYY-MM-DD.
function futureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const orderBody = (over = {}) => ({
  orderType: 'onetime',
  items: [{ name: 'Standard Bundle', quantity: 2 }],
  contact: { name: 'Sam Stove', phone: '555-222-3333', email: 'sam@example.com' },
  deliveryAddress: { street: '12 Ember Ln', neighborhood: 'Napa' },
  preferredDate: futureDate(),
  paymentMethod: 'venmo',
  ...over,
});

beforeEach(async () => {
  await Settings.findOneAndUpdate(
    { key: 'availability' },
    { $set: { key: 'availability', 'inventory.bundlesPrepared': 100 } },
    { upsert: true },
  );
});

describe('cut-short wood option', () => {
  test('defaults to standard length', async () => {
    const res = await request(app).post('/api/orders').send(orderBody());
    expect(res.status).toBe(201);
    expect((await Order.findById(res.body._id || res.body.order?._id)).cutShort).toBe(false);
  });

  test('saves the request and carries it to reorder + tracking', async () => {
    const res = await request(app).post('/api/orders').send(orderBody({ cutShort: true }));
    expect(res.status).toBe(201);
    const order = await Order.findById(res.body._id || res.body.order?._id);
    expect(order.cutShort).toBe(true);
    const re = await request(app).get(`/api/orders/reorder/${order.trackingToken}`).expect(200);
    expect(re.body.cutShort).toBe(true);
    const tr = await request(app).get(`/api/orders/track/${order.trackingToken}`).expect(200);
    expect(tr.body.cutShort).toBe(true);
  });

  test('only a literal true counts', async () => {
    const res = await request(app).post('/api/orders').send(orderBody({ cutShort: 'yes' }));
    expect(res.status).toBe(201);
    expect((await Order.findById(res.body._id || res.body.order?._id)).cutShort).toBe(false);
  });

  test('emails flag it for the owner and confirm it to the customer', () => {
    const order = new Order({
      orderType: 'onetime',
      items: [{ name: 'Standard Bundle', quantity: 1, unitPrice: 15 }],
      contact: { name: 'Sam' },
      cutShort: true,
    });
    const owner = ownerAlertEmail(order);
    expect(owner.subject).toContain('[CUT ≤16″]');
    expect(owner.text).toContain('16″ or shorter');
    expect(customerConfirmationEmail(order).text).toContain('16″ or shorter');
    const plain = ownerAlertEmail(new Order({ orderType: 'onetime', items: [] }));
    expect(plain.subject).not.toContain('CUT');
  });
});
