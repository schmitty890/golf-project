/* eslint-disable no-underscore-dangle */
import express from 'express';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import GiveawayMember from '../models/GiveawayMember.js';
import GiveawayDraw from '../models/GiveawayDraw.js';
import { mintGiveawayPrize } from './promos.js';
import { sendMail } from '../utils/mailer.js';
import { giveawayWinnerEmail } from '../utils/orderEmails.js';

const router = express.Router();

export function currentMonth(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function giveawayConfig() {
  const doc = await Settings.findOne({ key: 'availability' });
  const g = doc?.giveaway || {};
  return { enabled: Boolean(g.enabled), prizeBundles: g.prizeBundles || 1 };
}

const fullName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || (u?.email || 'Customer');

// Public — drives the homepage CTA.
router.get('/public', async (req, res) => {
  try {
    const { enabled, prizeBundles } = await giveawayConfig();
    const memberCount = await GiveawayMember.countDocuments({ active: true });
    return res.json({ enabled, prizeBundles, memberCount });
  } catch (error) {
    return res.json({ enabled: false, prizeBundles: 1, memberCount: 0 });
  }
});

// Signed-in customer's status.
router.get('/me', auth, async (req, res) => {
  try {
    const { enabled, prizeBundles } = await giveawayConfig();
    const [user, member, memberCount] = await Promise.all([
      User.findById(req.userId).select('address'),
      GiveawayMember.findOne({ user: req.userId }),
      GiveawayMember.countDocuments({ active: true }),
    ]);
    return res.json({
      enabled,
      prizeBundles,
      month: currentMonth(),
      eligible: Boolean(user?.address?.neighborhood),
      joined: Boolean(member?.active),
      memberCount,
    });
  } catch (error) {
    console.error('Giveaway me error:', error);
    return res.status(500).json({ error: 'Failed to load giveaway status' });
  }
});

// Join the standing list (once). Requires the giveaway to be on + a saved neighborhood.
router.post('/join', auth, async (req, res) => {
  try {
    const { enabled } = await giveawayConfig();
    if (!enabled) return res.status(400).json({ error: 'No active giveaway right now.' });
    const user = await User.findById(req.userId).select('address');
    if (!user?.address?.neighborhood) {
      return res.status(400).json({ error: 'Add your delivery address to enter.' });
    }
    await GiveawayMember.findOneAndUpdate(
      { user: req.userId },
      { $set: { active: true } },
      { upsert: true, setDefaultsOnInsert: true, new: true },
    );
    return res.json({ joined: true });
  } catch (error) {
    console.error('Giveaway join error:', error);
    return res.status(500).json({ error: 'Failed to join the giveaway' });
  }
});

// Opt out of the standing list.
router.post('/leave', auth, async (req, res) => {
  try {
    await GiveawayMember.findOneAndUpdate({ user: req.userId }, { $set: { active: false } });
    return res.json({ joined: false });
  } catch (error) {
    console.error('Giveaway leave error:', error);
    return res.status(500).json({ error: 'Failed to leave the giveaway' });
  }
});

// Admin: members + status + past winners.
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { enabled, prizeBundles } = await giveawayConfig();
    const month = currentMonth();
    const [members, draw, pastDraws] = await Promise.all([
      GiveawayMember.find({ active: true }).populate('user', 'firstName lastName email address').lean(),
      GiveawayDraw.findOne({ month }).populate('winner', 'firstName lastName email').lean(),
      GiveawayDraw.find().sort({ month: -1 }).limit(12)
        .populate('winner', 'firstName lastName email')
        .lean(),
    ]);
    return res.json({
      enabled,
      prizeBundles,
      month,
      drawn: Boolean(draw),
      winner: draw ? { name: fullName(draw.winner), email: draw.winner?.email || '', code: draw.prizeCode } : null,
      members: members
        .filter((m) => m.user)
        .map((m) => ({
          name: fullName(m.user),
          email: m.user.email || '',
          neighborhood: m.user.address?.neighborhood || '',
          eligible: Boolean(m.user.address?.neighborhood),
        })),
      pastWinners: pastDraws.map((d) => ({
        month: d.month, name: fullName(d.winner), code: d.prizeCode, bundles: d.prizeBundles,
      })),
    });
  } catch (error) {
    console.error('Giveaway admin error:', error);
    return res.status(500).json({ error: 'Failed to load giveaway' });
  }
});

// Admin: draw this month's winner.
router.post('/draw', auth, requireAdmin, async (req, res) => {
  try {
    const { prizeBundles } = await giveawayConfig();
    const month = currentMonth();
    if (await GiveawayDraw.findOne({ month })) {
      return res.status(400).json({ error: 'This month has already been drawn.' });
    }
    const members = await GiveawayMember.find({ active: true }).populate('user', 'firstName lastName email address');
    const eligible = members.filter((m) => m.user && m.user.address?.neighborhood);
    if (eligible.length === 0) {
      return res.status(400).json({ error: 'No eligible entrants to draw from yet.' });
    }
    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    const winner = pick.user;
    const reward = await mintGiveawayPrize(winner._id, prizeBundles);
    await GiveawayDraw.create({
      month, winner: winner._id, prizeCode: reward.code, prizeBundles,
    });
    if (winner.email) {
      sendMail({ to: winner.email, ...giveawayWinnerEmail(winner, reward, prizeBundles) });
    }
    return res.json({
      month, name: fullName(winner), email: winner.email || '', code: reward.code, bundles: prizeBundles,
    });
  } catch (error) {
    console.error('Giveaway draw error:', error);
    return res.status(500).json({ error: 'Failed to draw a winner' });
  }
});

export default router;
