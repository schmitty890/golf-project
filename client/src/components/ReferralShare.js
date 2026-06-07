import { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import business from '../data/business';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Shows the logged-in user's referral code to share (their neighbor gets a discount).
// Renders nothing for guests or when referrals are disabled.
function ReferralShare({ className }) {
  const { token } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API_URL}/api/promos/my-referral`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [token]);

  if (!token || !data || !data.enabled || !data.code) return null;

  const shareUrl = `${window.location.origin}/order?ref=${data.code}`;
  const shareText = `Order firewood from ${business.name} and get ${data.label} your first order with my code ${data.code}.`;

  const flash = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: business.name, text: shareText, url: shareUrl });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        // ignore clipboard errors
      }
    }
    flash();
  };

  return (
    <div className={`rounded-xl border border-cream-300 bg-cream-100 p-4 ${className}`}>
      <p className="text-sm font-bold text-walnut">Refer a neighbor 🔥</p>
      <p className="mt-1 text-sm text-walnut-400">
        {`Share your link — your neighbor gets ${data.label} their first order, and once they place an order you get ${data.label} your next one.`}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-lg border border-cream-300 bg-white px-3 py-2 font-mono text-sm font-bold tracking-wide text-walnut">
          {data.code}
        </span>
        <button
          type="button"
          onClick={share}
          className="rounded-lg bg-ember px-4 py-2 text-sm font-semibold text-white hover:bg-ember-600"
        >
          {copied ? 'Link copied!' : 'Share'}
        </button>
      </div>
      <p className="mt-2 text-xs text-walnut-300">
        Sends a link that applies your code automatically.
      </p>
      {data.rewards && data.rewards.length > 0 && (
        <div className="mt-4 border-t border-cream-300 pt-3">
          <p className="text-sm font-semibold text-walnut">
            {`You've earned ${data.rewards.length} reward${data.rewards.length > 1 ? 's' : ''} — use at checkout:`}
          </p>
          <ul className="mt-2 space-y-1">
            {data.rewards.map((r) => (
              <li key={r.code} className="flex items-center gap-2 text-sm">
                <span className="rounded-md border border-cream-300 bg-white px-2 py-1 font-mono font-bold text-walnut">
                  {r.code}
                </span>
                <span className="text-walnut-400">{r.label}</span>
                <Link to={`/order?ref=${r.code}`} className="font-semibold text-ember hover:text-ember-600">
                  Use →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

ReferralShare.propTypes = {
  className: PropTypes.string,
};

ReferralShare.defaultProps = {
  className: '',
};

export default ReferralShare;
