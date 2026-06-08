import express from 'express';
import { sendMail } from '../utils/mailer.js';
import { contactFormEmail } from '../utils/orderEmails.js';

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public contact form → emails the owner (no DB record). Reply-To is the sender so the owner can reply.
router.post('/', async (req, res) => {
  try {
    const {
      name, email, phone, message, company,
    } = req.body;

    // Honeypot: real users never fill the hidden "company" field. Silently accept + drop.
    if (company) return res.json({ success: true });

    const cleanName = String(name || '').trim().slice(0, 100);
    const cleanEmail = String(email || '').trim().slice(0, 200);
    const cleanPhone = String(phone || '').trim().slice(0, 40);
    const cleanMessage = String(message || '').trim().slice(0, 4000);

    if (!cleanName) return res.status(400).json({ error: 'Please enter your name.' });
    if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: 'Please enter a valid email.' });
    if (!cleanMessage) return res.status(400).json({ error: 'Please enter a message.' });

    if (process.env.OWNER_EMAIL) {
      await sendMail({
        to: process.env.OWNER_EMAIL,
        replyTo: cleanEmail,
        ...contactFormEmail({
          name: cleanName, email: cleanEmail, phone: cleanPhone, message: cleanMessage,
        }),
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

export default router;
