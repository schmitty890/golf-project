/* eslint-disable jsx-a11y/label-has-associated-control */
import {
  useState, useEffect, useContext, useRef, useCallback,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import neighborhoods from '../data/neighborhoods';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const SEEN_KEY = 'volw-giveaway-modal-seen-at';
const NUDGE_KEY = 'volw-nudge-shown'; // sessionStorage — shared so only one nudge pops per visit
const DAY = 24 * 60 * 60 * 1000;
const REVEAL_DELAY = 2500; // let the page settle before nudging

const inputClass = 'block w-full rounded-xl border border-cream-300 bg-white px-4 py-3 text-base text-walnut placeholder:text-walnut-200 transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30';
const btn = 'w-full rounded-xl bg-ember px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-ember-600 disabled:opacity-50';

// Don't pop up over checkout, auth, or the admin app.
const isExcludedPath = (p) => p.startsWith('/admin')
  || p === '/order' || p === '/login' || p === '/register';

function recentlyShown() {
  const ts = Number(localStorage.getItem(SEEN_KEY) || 0);
  return Boolean(ts) && (Date.now() - ts) < DAY;
}

// Session guard shared with NewsletterModal so two nudges don't both appear in one visit.
function nudgeShownThisSession() {
  try { return Boolean(sessionStorage.getItem(NUDGE_KEY)); } catch { return false; }
}
function markNudgeShown() {
  try { sessionStorage.setItem(NUDGE_KEY, '1'); } catch { /* ignore */ }
}

// Once-per-day nudge for visitors who haven't entered the monthly giveaway. Guests are pointed to
// sign up; signed-in neighbors pick their neighborhood inline (saved to their account) and enter in
// one tap. Self-hides when the giveaway is off, the visitor is already entered, or shown < 24h ago.
function GiveawayModal() {
  const { pathname } = useLocation();
  const { user, token, refreshUser } = useContext(AuthContext);

  const [status, setStatus] = useState(null); // { enabled, eligible, joined, prizeBundles }
  const [open, setOpen] = useState(false);
  const [neighborhood, setNeighborhood] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const shownThisSession = useRef(false);

  // Decide whether to show, at most once per session. Re-checks on navigation so a visitor who
  // lands on an excluded page (e.g. /login) still gets nudged once they reach a normal page.
  useEffect(() => {
    if (shownThisSession.current) return;
    if (user?.role === 'admin') return;
    if (isExcludedPath(pathname)) return;
    if (recentlyShown()) return;
    if (nudgeShownThisSession()) return;

    let cancelled = false;
    let timer;
    const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const url = `${API_URL}/api/giveaway/${token ? 'me' : 'public'}`;
    axios.get(url, headers).then((res) => {
      if (cancelled) return;
      const s = res.data || {};
      // Guests have no account, so they're never "joined" — nudge them to sign up.
      if (!s.enabled || s.joined) return;
      if (nudgeShownThisSession()) return;
      shownThisSession.current = true;
      markNudgeShown();
      localStorage.setItem(SEEN_KEY, String(Date.now()));
      setStatus(s);
      timer = setTimeout(() => !cancelled && setOpen(true), REVEAL_DELAY);
    }).catch(() => { /* ignore — never block the page on this */ });

    // eslint-disable-next-line consistent-return
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pathname, token, user]);

  const close = useCallback(() => setOpen(false), []);

  const enter = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      // Signed-in but no saved neighborhood: save it to their account first, then enter.
      if (status && !status.eligible) {
        if (!neighborhood) {
          setError('Please pick your neighborhood.');
          setBusy(false);
          return;
        }
        await axios.put(`${API_URL}/api/auth/profile`, { address: { neighborhood } }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await refreshUser();
      }
      await axios.post(`${API_URL}/api/giveaway/join`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [status, neighborhood, token, refreshUser]);

  if (!open || !status) return null;

  const bundles = status.prizeBundles || 1;
  const prize = `${bundles} free bundle${bundles === 1 ? '' : 's'}`;

  let body;
  if (done) {
    body = (
      <div className="py-4 text-center">
        <div className="text-4xl">🎉</div>
        <h3 className="mt-3 text-xl font-extrabold text-walnut">You&apos;re entered — good luck!</h3>
        <p className="mt-2 text-sm text-walnut-400">
          {`You're in this month's drawing for ${prize}. We pick one neighbor at random.`}
        </p>
        <button type="button" onClick={close} className={`mt-6 ${btn}`}>Done</button>
      </div>
    );
  } else if (!token) {
    body = (
      <div>
        <h3 className="text-xl font-extrabold text-walnut">{`Win ${prize} this month 🎁`}</h3>
        <p className="mt-2 text-sm text-walnut-400">
          We give away free firewood to one neighbor every month. Create a free account to enter —
          it takes a few seconds.
        </p>
        <Link to="/register" onClick={close} className={`mt-5 inline-block text-center ${btn}`}>
          Create a free account to enter
        </Link>
        <p className="mt-3 text-center text-sm text-walnut-400">
          Already have one?
          {' '}
          <Link to="/login" onClick={close} className="font-semibold text-ember hover:underline">Sign in</Link>
        </p>
      </div>
    );
  } else {
    body = (
      <div>
        <h3 className="text-xl font-extrabold text-walnut">{`Enter to win ${prize} 🎁`}</h3>
        <p className="mt-2 text-sm text-walnut-400">
          One neighbor wins free firewood every month. Enter once and you&apos;re in the drawing
          automatically each month.
        </p>
        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {!status.eligible && (
          <div className="mt-4">
            <label htmlFor="gm-hood" className="block text-sm font-semibold text-walnut">Your neighborhood</label>
            <select
              id="gm-hood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className={`mt-2 ${inputClass}`}
            >
              <option value="">Select…</option>
              {neighborhoods.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-walnut-300">
              We&apos;ll save this to your account for faster ordering, too.
            </p>
          </div>
        )}
        <button type="button" onClick={enter} disabled={busy} className={`mt-5 ${btn}`}>
          {busy ? 'Entering…' : 'Enter the drawing'}
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

export default GiveawayModal;
