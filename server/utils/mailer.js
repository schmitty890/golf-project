import nodemailer from 'nodemailer';

// Lazily-built SMTP transport from env. If SMTP isn't configured, sendMail() becomes a
// safe no-op that just logs — so the app runs fine in dev and "turns on" once the owner
// adds credentials. Never throws to callers.
let transport;
let initialized = false;

function getTransport() {
  if (initialized) return transport;
  initialized = true;
  const {
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
  } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const port = Number(SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // implicit TLS on 465; STARTTLS otherwise
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } else {
    transport = null;
  }
  return transport;
}

// Send an email. Returns true on success, false on failure/no-op — so batch senders can tally
// delivery. Resolves silently (logging) when unconfigured or when `to` is empty. Never throws.
// `headers` lets callers add e.g. a List-Unsubscribe header for newsletter deliverability.
export async function sendMail({
  to, subject, html, text, replyTo, headers,
}) {
  if (!to) return false;
  const t = getTransport();
  if (!t) {
    console.log(`[mail] would send "${subject}" to ${to} (SMTP not configured)`);
    return false;
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
      ...(replyTo ? { replyTo } : {}),
      ...(headers ? { headers } : {}),
    });
    return true;
  } catch (err) {
    console.error(`[mail] failed to send "${subject}" to ${to}:`, err.message);
    return false;
  }
}

export default { sendMail };
