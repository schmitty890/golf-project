/* eslint-disable no-console, no-await-in-loop */
// One-off maintenance: give existing orders a trackingToken so their public /track/<token> link works.
// Safe to re-run (only fills orders missing a token).
//
//   node server/scripts/backfillTrackingTokens.js   (run once)

import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Order from '../models/Order.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dirname, '..', '.env') });

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set (expected in server/.env)');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Backfilling tracking tokens…');

  const orders = await Order.find({
    $or: [{ trackingToken: { $exists: false } }, { trackingToken: '' }, { trackingToken: null }],
  }).select('_id');
  console.log(`Found ${orders.length} order(s) without a token.`);

  for (let i = 0; i < orders.length; i += 1) {
    const order = orders[i];
    order.trackingToken = crypto.randomBytes(12).toString('hex');
    await order.save();
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
