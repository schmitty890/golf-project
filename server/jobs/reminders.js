import Order from '../models/Order.js';
import { sendMail } from '../utils/mailer.js';
import { reminderEmail } from '../utils/orderEmails.js';

// Local 'YYYY-MM-DD' helpers (avoid UTC shift from toISOString).
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

// In-process scheduler: check hourly, send only during the evening (local 17:00–21:59).
// Self-contained (no external cron); the reminderSentAt guard makes repeat ticks safe.
export function startReminderJob() {
  const tick = async () => {
    try {
      const hour = new Date().getHours();
      if (hour >= 17 && hour <= 21) await runReminderPass();
    } catch (err) {
      console.error('Reminder job error:', err.message);
    }
  };
  setInterval(tick, 60 * 60 * 1000); // hourly
  tick(); // run once on boot (covers an evening restart)
}

export default { startReminderJob };
