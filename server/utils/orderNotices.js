// "New order" side effects: the customer's confirmation, the owner's alert, and the referrer's
// reward code. Venmo orders run this when they're placed; card orders run it only once Stripe
// says they're paid (from finalizeCheckoutSession), so an abandoned checkout never looks like a
// real order.
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { sendMail } from './mailer.js';
import {
  customerConfirmationEmail, ownerAlertEmail, referralRewardEmail,
} from './orderEmails.js';
import { referralConfig, discountLabel, mintReferralReward } from '../routes/promos.js';

// Never throws — notification problems must not fail an order or a webhook.
export async function sendNewOrderNotices(order) {
  try {
    let customerEmail = order.contact?.email || '';
    if (!customerEmail && order.user) {
      const u = await User.findById(order.user).select('email');
      customerEmail = u?.email || '';
    }
    if (customerEmail) {
      await sendMail({ to: customerEmail, ...customerConfirmationEmail(order) });
    }
    if (process.env.OWNER_EMAIL) {
      await sendMail({ to: process.env.OWNER_EMAIL, ...ownerAlertEmail(order) });
    }
    // Reward the referrer: mint a one-time discount code for their next order and email it.
    if (order.referredBy) {
      const referrer = await User.findById(order.referredBy)
        .select('firstName lastName referralCode email');
      if (referrer) {
        const settings = await Settings.findOne({ key: 'availability' });
        const rc = referralConfig(settings);
        const reward = await mintReferralReward(referrer._id, rc); // eslint-disable-line no-underscore-dangle
        if (referrer.email) {
          await sendMail({
            to: referrer.email,
            ...referralRewardEmail(referrer, reward, discountLabel(rc.type, rc.value)),
          });
        }
      }
    }
  } catch (err) {
    console.error('Order notification error:', err.message);
  }
}

export default { sendNewOrderNotices };
