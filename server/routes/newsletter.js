/* eslint-disable no-underscore-dangle */
import express from 'express';
import crypto from 'crypto';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import User from '../models/User.js';
import NewsletterCampaign from '../models/NewsletterCampaign.js';
import { sendMail } from '../utils/mailer.js';
import { newsletterEmail } from '../utils/orderEmails.js';

const router = express.Router();

// Gmail (free) allows ~500 recipients / 24h over SMTP. Cap each batch safely under that; a large
// list goes out over several days, one "send next batch" per day.
const BATCH_SIZE = 400;
const SEND_DELAY_MS = 150; // gentle pacing between messages within a batch

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// ---- Admin: subscriber count (for the compose UI) ----
router.get('/subscribers/count', auth, requireAdmin, async (req, res) => {
  try {
    const count = await User.countDocuments({ newsletterSubscribed: true });
    return res.json({ count });
  } catch (error) {
    console.error('Subscriber count error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---- Admin: list recent campaigns (surfaces an in-progress one to resume) ----
router.get('/campaigns', auth, requireAdmin, async (req, res) => {
  try {
    const campaigns = await NewsletterCampaign.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('subject heading status sentCount failedCount lastBatchAt createdAt')
      .lean();
    return res.json({ campaigns });
  } catch (error) {
    console.error('List campaigns error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---- Admin: create a campaign (does not send yet) ----
router.post('/campaigns', auth, requireAdmin, async (req, res) => {
  try {
    const subject = String(req.body.subject || '').trim();
    const heading = String(req.body.heading || '').trim();
    const body = String(req.body.body || '').trim();
    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required.' });
    }
    const campaign = await NewsletterCampaign.create({
      subject, heading, body, status: 'sending', sentTo: [],
    });
    return res.status(201).json({ campaign });
  } catch (error) {
    console.error('Create campaign error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---- Admin: send a test copy to yourself (preview before sending to the list) ----
router.post('/test', auth, requireAdmin, async (req, res) => {
  try {
    const subject = String(req.body.subject || '').trim();
    const heading = String(req.body.heading || '').trim();
    const body = String(req.body.body || '').trim();
    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required.' });
    }
    const user = await User.findById(req.userId).select('email unsubscribeToken');
    if (!user?.email) return res.status(400).json({ error: 'No email on your account.' });
    if (!user.unsubscribeToken) {
      user.unsubscribeToken = crypto.randomBytes(16).toString('hex');
      await user.save();
    }
    const unsubscribeUrl = `${process.env.SITE_URL || ''}/unsubscribe/${user.unsubscribeToken}`;
    const ok = await sendMail({
      to: user.email,
      ...newsletterEmail({
        subject: `[TEST] ${subject}`, heading, body, unsubscribeUrl,
      }),
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
    });
    if (!ok) return res.status(502).json({ error: 'Email failed to send (check SMTP config).' });
    return res.json({ sent: true, to: user.email });
  } catch (error) {
    console.error('Test newsletter error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---- Admin: send the next batch (up to BATCH_SIZE) of a campaign ----
router.post('/campaigns/:id/send-batch', auth, requireAdmin, async (req, res) => {
  try {
    const campaign = await NewsletterCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Recipients: still-subscribed users not already emailed for this campaign.
    const remainingUsers = await User.find({
      newsletterSubscribed: true,
      _id: { $nin: campaign.sentTo },
    }).select('email unsubscribeToken');

    const batch = remainingUsers.slice(0, BATCH_SIZE);
    const base = process.env.SITE_URL || '';

    let sentThisBatch = 0;
    let failedThisBatch = 0;
    for (let i = 0; i < batch.length; i += 1) {
      const u = batch[i];
      // Mint an unsubscribe token the first time we email this user.
      if (!u.unsubscribeToken) {
        u.unsubscribeToken = crypto.randomBytes(16).toString('hex');
        // eslint-disable-next-line no-await-in-loop
        await u.save();
      }
      const unsubscribeUrl = `${base}/unsubscribe/${u.unsubscribeToken}`;
      // eslint-disable-next-line no-await-in-loop
      const ok = await sendMail({
        to: u.email,
        ...newsletterEmail({
          subject: campaign.subject,
          heading: campaign.heading,
          body: campaign.body,
          unsubscribeUrl,
        }),
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
      });
      if (ok) {
        sentThisBatch += 1;
        campaign.sentTo.push(u._id);
      } else {
        failedThisBatch += 1;
      }
      // eslint-disable-next-line no-await-in-loop
      if (SEND_DELAY_MS) await sleep(SEND_DELAY_MS);
    }

    campaign.sentCount += sentThisBatch;
    campaign.failedCount += failedThisBatch;
    campaign.lastBatchAt = new Date();
    const remaining = remainingUsers.length - sentThisBatch;
    if (remaining <= 0) campaign.status = 'done';
    await campaign.save();

    return res.json({
      sentThisBatch,
      failedThisBatch,
      totalSent: campaign.sentCount,
      remaining: Math.max(0, remaining),
      status: campaign.status,
    });
  } catch (error) {
    console.error('Send batch error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---- Public: one-click unsubscribe by token (no auth) ----
router.post('/unsubscribe/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '');
    if (!token) return res.status(400).json({ error: 'Invalid link' });
    const user = await User.findOne({ unsubscribeToken: token });
    // Idempotent: report success even if the token is unknown or already unsubscribed, so we
    // don't leak which tokens are valid and repeated clicks are harmless.
    if (user && user.newsletterSubscribed) {
      user.newsletterSubscribed = false;
      user.newsletterSubscribedAt = null;
      await user.save();
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
