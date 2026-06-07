/* eslint-disable no-console, no-await-in-loop */
// One-off maintenance: regenerate every saved referral code to the brand-based
// format (FIREWOOD##), removing personal names from existing codes. Safe to re-run.
//
//   node server/scripts/regenReferralCodes.js   (run once)
//
// Attribution is unaffected: orders link the referrer by user id (referredBy),
// not by the code string.

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { generateReferralCode } from '../routes/promos.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dirname, '..', '.env') });

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set (expected in server/.env)');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Regenerating referral codes…');

  const users = await User.find({ referralCode: { $exists: true, $ne: null } })
    .select('referralCode email');
  console.log(`Found ${users.length} code(s) to regenerate.`);

  for (let i = 0; i < users.length; i += 1) {
    const user = users[i];
    const old = user.referralCode;
    user.referralCode = await generateReferralCode();
    await user.save();
    console.log(`  ${old} → ${user.referralCode}  (${user.email})`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
