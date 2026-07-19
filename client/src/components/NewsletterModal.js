import {
  useState, useEffect, useContext, useRef, useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const SEEN_KEY = 'volw-newsletter-modal-seen-at';
const NUDGE_KEY = 'volw-nudge-shown'; // sessionStorage — shared so only one nudge pops per visit
const DAY = 24 * 60 * 60 * 1000;
const INTERVAL = 90 * DAY; // if declined, don't nudge again for ~3 months
const REVEAL_DELAY = 3000; // let the page settle before nudging

const btn = 'w-full rounded-xl bg-ember px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ember-600 disabled:opacity-50';

// Don't pop up over checkout, auth, or the admin app.
const isExcludedPath = (p) => p.startsWith('/admin')
  || p === '/order' || p === '/login' || p === '/register';

// Shown recently = declined within the interval (timestamp is written on dismiss, below).
function recentlyShown() {
  try {
    const ts = Number(localStorage.getItem(SEEN_KEY) || 0);
    return Boolean(ts) && (Date.now() - ts) < INTERVAL;
  } catch { return false; }
}

// Session guard shared with GiveawayModal so two nudges don't both appear in one visit.
function nudgeShownThisSession() {
  try { return Boolean(sessionStorage.getItem(NUDGE_KEY)); } catch { return false; }
}
function markNudgeShown() {
  try { sessionStorage.setItem(NUDGE_KEY, '1'); } catch { /* ignore */ }
}

// Nudges signed-in customers who haven't subscribed to the newsletter. Self-hides for admins,
// subscribers, excluded pages, and anyone who declined within the last ~3 months.
function NewsletterModal() {
  const { pathname } = useLocation();
  const { user, token, refreshUser } = useContext(AuthContext);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const shownThisSession = useRef(false);

  useEffect(() => {
    if (shownThisSession.current) return undefined;
    if (!token) return undefined; // logged-in users only
    if (user?.role === 'admin') return undefined;
    if (user?.newsletterSubscribed) return undefined; // already subscribed
    if (isExcludedPath(pathname)) return undefined;
    if (recentlyShown()) return undefined;
    if (nudgeShownThisSession()) return undefined;

    shownThisSession.current = true;
    markNudgeShown();
    const timer = setTimeout(() => setOpen(true), REVEAL_DELAY);
    return () => clearTimeout(timer);
  }, [pathname, token, user]);

  // Dismiss (decline): remember so we don't nudge again for ~3 months.
  const close = useCallback(() => {
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch { /* ignore */ }
    setOpen(false);
  }, []);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await axios.put(`${API_URL}/api/auth/profile`, { newsletterSubscribed: true }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshUser();
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [token, refreshUser]);

  if (!open) return null;

  let body;
  if (done) {
    body = (
      <div className="py-4 text-center">
        <div className="text-4xl">🔥</div>
        <h3 className="mt-3 text-xl font-extrabold text-walnut">You&apos;re on the list!</h3>
        <p className="mt-2 text-sm text-walnut-400">
          Thanks for subscribing — we&apos;ll only send the good stuff. You can unsubscribe anytime
          from your account.
        </p>
        <button type="button" onClick={() => setOpen(false)} className={`mt-6 ${btn}`}>Done</button>
      </div>
    );
  } else {
    body = (
      <div>
        <h3 className="text-xl font-extrabold text-walnut">Get the good stuff 🪵🔥</h3>
        <p className="mt-2 text-sm text-walnut-400">
          Seasonal firewood tips, restock alerts, and neighbor-only deals — straight to your
          inbox. No spam, unsubscribe anytime.
        </p>
        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        <button type="button" onClick={subscribe} disabled={busy} className={`mt-5 ${btn}`}>
          {busy ? 'Subscribing…' : 'Subscribe'}
        </button>
        <button
          type="button"
          onClick={close}
          className="mt-3 w-full text-center text-sm font-semibold text-walnut-400 hover:text-ember"
        >
          Maybe later
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-walnut/60 transition-opacity"
          onClick={close}
          onKeyDown={(ev) => ev.key === 'Escape' && close()}
          role="button"
          tabIndex={0}
          aria-label="Close"
        />
        <div className="relative w-full transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all sm:my-8 sm:max-w-md">
          {!done && (
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 text-walnut-300 hover:text-walnut"
            >
              ✕
            </button>
          )}
          {body}
        </div>
      </div>
    </div>
  );
}

export default NewsletterModal;
