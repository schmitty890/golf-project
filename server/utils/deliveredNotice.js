/* eslint-disable no-underscore-dangle */
import Order from '../models/Order.js';
import DeliveryPhoto from '../models/DeliveryPhoto.js';
import { sendMail } from './mailer.js';
import { deliveredEmail, deliveryPhotoCid } from './orderEmails.js';

const EXT = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' };

// Email the customer "your firewood is delivered", with the drop-off photos shown inline.
// Sends once per order unless `force` (the owner re-sending from the Delivery map).
// Returns { sent, photoCount, sentAt, reason }. Never throws for mail problems.
export async function sendDeliveredEmail(order, { force = false } = {}) {
  const to = order?.contact?.email || '';
  if (!to) return { sent: false, photoCount: 0, reason: 'no-email' };
  if (order.deliveredEmailSentAt && !force) {
    return {
      sent: false, photoCount: 0, sentAt: order.deliveredEmailSentAt, reason: 'already-sent',
    };
  }

  const photos = await DeliveryPhoto.find({ order: order._id }).sort({ createdAt: 1 }).lean();
  const attachments = photos.map((p, i) => ({
    filename: `delivery-${i + 1}.${EXT[p.contentType] || 'jpg'}`,
    content: Buffer.from(p.data.buffer || p.data),
    contentType: p.contentType,
    cid: deliveryPhotoCid(i),
  }));
  const ok = await sendMail({ to, ...deliveredEmail(order, photos.length), attachments });

  // Stamp even when SMTP is off/failed so the safety-net job doesn't retry forever; the owner
  // can always re-send from the Delivery map.
  const sentAt = new Date();
  await Order.updateOne(
    { _id: order._id },
    { $set: { deliveredEmailSentAt: sentAt, deliveredEmailHeldAt: null } },
  );
  // eslint-disable-next-line no-param-reassign
  order.deliveredEmailSentAt = sentAt;
  // eslint-disable-next-line no-param-reassign
  order.deliveredEmailHeldAt = null;
  return {
    sent: ok, photoCount: photos.length, sentAt, reason: ok ? '' : 'mail-failed',
  };
}

// Held emails the owner never released (closed the tab, lost signal): send after this long.
export const HELD_EMAIL_GRACE_MS = 20 * 60 * 1000;

export async function sendOverdueDeliveredEmails(now = new Date()) {
  const due = await Order.find({
    status: 'completed',
    deliveredEmailSentAt: null,
    deliveredEmailHeldAt: { $ne: null, $lte: new Date(now.getTime() - HELD_EMAIL_GRACE_MS) },
  });
  // eslint-disable-next-line no-restricted-syntax
  for (const order of due) {
    // eslint-disable-next-line no-await-in-loop
    await sendDeliveredEmail(order);
  }
  if (due.length) console.log(`[delivered] sent ${due.length} held delivery email(s)`);
  return due.length;
}

export default { sendDeliveredEmail, sendOverdueDeliveredEmails };
