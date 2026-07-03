import Order from '../models/Order.js';
import Settings from '../models/Settings.js';
import GiveawayMember from '../models/GiveawayMember.js';
import { sendMail } from '../utils/mailer.js';
import { reminderEmail, giveawayReminderEmail } from '../utils/orderEmails.js';

// Local 'YYYY-MM-DD' / 'YYYY-MM' helpers (avoid UTC shift from toISOString).
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return ymd(d);
};

// Send the "evening before" reminder to confirmed orders happening tomorrow.
// Idempotent: each order is stamped with reminderSentAt so it's emailed at most once.
async function runReminderPass() {
  const tomorrow = tomorrowStr();
  const orders = await Order.find({
    status: 'confirmed',
    'schedule.date': tomorrow,
    reminderSentAt: null,
  });
  const due = orders.filter((o) => o.contact?.email);
  if (due.length === 0) return;

  await Promise.all(due.map(async (order) => {
    await sendMail({
      to: order.contact.email,
      ...reminderEmail(order),
    });
    // eslint-disable-next-line no-param-reassign
    order.reminderSentAt = new Date();
    await order.save();
  }));
  console.log(`[reminders] sent ${due.length} reminder(s) for ${tomorrow}`);
}

// Once per month, email the standing giveaway list "you're entered — good luck!". Idempotent via
// Settings.giveaway.lastReminderMonth — fires on the first tick of a new month, never repeats.
async function runGiveawayReminderPass() {
  const settings = await Settings.findOne({ key: 'availability' });
  const g = settings?.giveaway;
  if (!g?.enabled) return;
  const month = ym(new Date());
  if (g.lastReminderMonth === month) return;

  const members = await GiveawayMember.find({ active: true }).populate('user', 'firstName email address');
  const due = members.filter((m) => m.user?.email && m.user.address?.neighborhood);
  await Promise.all(due.map((m) => sendMail({
    to: m.user.email,
    ...giveawayReminderEmail(m.user, g.prizeBundles || 1),
  })));
  await Settings.findOneAndUpdate({ key: 'availability' }, { $set: { 'giveaway.lastReminderMonth': month } });
  console.log(`[giveaway] sent ${due.length} monthly reminder(s) for ${month}`);
}

// Safeguard: if the owner left live-chat availability on, flip it off once it's been on longer than
// AUTO_OFF_HOURS — so the customer-facing green "online" dot can't linger overnight. Idempotent: it
// only acts while `available` is true and `availableSince` is stale.
const AUTO_OFF_HOURS = 2;
async function runChatAutoOffPass() {
  const settings = await Settings.findOne({ key: 'availability' });
  if (!settings?.chat?.available) return;
  const since = settings.chat.availableSince;
  const staleBefore = Date.now() - AUTO_OFF_HOURS * 60 * 60 * 1000;
  // No timestamp (legacy on-state) or an old one → turn it off.
  if (since && since.getTime() > staleBefore) return;
  await Settings.findOneAndUpdate(
    { key: 'availability' },
    { $set: { 'chat.available': false, 'chat.availableSince': null } },
  );
  console.log(`[chat] auto-turned availability off (was on > ${AUTO_OFF_HOURS}h)`);
}

// In-process scheduler: check hourly, send only during the evening (local 17:00–21:59).
// Self-contained (no external cron); the reminderSentAt guard makes repeat ticks safe.
export function startReminderJob() {
  const tick = async () => {
    try {
      const hour = new Date().getHours();
      if (hour >= 17 && hour <= 21) await runReminderPass();
      await runGiveawayReminderPass();
      await runChatAutoOffPass();
    } catch (err) {
      console.error('Reminder job error:', err.message);
    }
  };
  setInterval(tick, 60 * 60 * 1000); // hourly
  tick(); // run once on boot (covers an evening restart)
}

export default { startReminderJob };
