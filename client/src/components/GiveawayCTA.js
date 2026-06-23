import {
  useEffect, useState, useContext, useCallback,
} from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const btn = 'rounded-xl bg-ember px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-ember-600 disabled:opacity-50';

// Monthly "win a free bundle" call to action. Self-hides when the giveaway is off. Signed-in
// members can join/leave the standing list; guests are nudged to create an account.
// `variant="compact"` is a small card for My Orders; "section" is the full homepage band.
function GiveawayCTA({ variant }) {
  const { token } = useContext(AuthContext);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const url = `${API_URL}/api/giveaway/${token ? 'me' : 'public'}`;
    axios.get(url, headers).then((res) => setState(res.data)).catch(() => setState(null));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const act = useCallback((path) => {
    setBusy(true);
    axios.post(`${API_URL}/api/giveaway/${path}`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => load())
      .catch(() => { /* ignore — keep current state */ })
      .finally(() => setBusy(false));
  }, [token, load]);

  if (!state || !state.enabled) return null;

  const bundles = state.prizeBundles || 1;
  const prize = `${bundles} free bundle${bundles === 1 ? '' : 's'}`;

  let action;
  if (!token) {
    action = <Link to="/register" className={btn}>Create an account to enter</Link>;
  } else if (!state.eligible) {
    action = <Link to="/account" className={btn}>Add your address to enter</Link>;
  } else if (state.joined) {
    action = (
      <div className="flex items-center gap-3">
        <span className="font-semibold text-green-700">✓ You&apos;re in this month&apos;s drawing!</span>
        <button type="button" onClick={() => act('leave')} disabled={busy} className="text-sm text-walnut-400 underline hover:text-ember">
          Leave
        </button>
      </div>
    );
  } else {
    action = (
      <button type="button" onClick={() => act('join')} disabled={busy} className={btn}>
        Join the monthly drawing
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="rounded-xl border border-ember/30 bg-ember/5 p-4">
        <p className="text-sm font-semibold text-walnut">{`🎁 Monthly giveaway — win ${prize}`}</p>
        <div className="mt-2">{action}</div>
      </div>
    );
  }

  return (
    <section className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-ember/10 px-3 py-1 text-sm font-semibold text-ember">
          🎁 Monthly giveaway
        </span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-walnut">{`Win ${prize} every month`}</h2>
        <p className="mt-3 text-lg text-walnut-400">
          Free firewood, on the house. We draw one neighbor at random each month — sign in, save
          your delivery address, and you&apos;re entered every month automatically.
        </p>
        {state.memberCount > 0 && (
          <p className="mt-2 text-sm text-walnut-300">
            {`${state.memberCount} neighbor${state.memberCount === 1 ? '' : 's'} entered`}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center">{action}</div>
      </div>
    </section>
  );
}

GiveawayCTA.propTypes = {
  variant: PropTypes.oneOf(['section', 'compact']),
};

GiveawayCTA.defaultProps = {
  variant: 'section',
};

export default GiveawayCTA;
