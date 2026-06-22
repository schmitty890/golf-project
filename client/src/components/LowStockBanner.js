import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Customer-facing low-stock urgency nudge. Renders nothing unless the owner enabled the banner AND
// prepared stock is at/below the threshold (the API decides — it never returns a count otherwise).
// `cta` shows an "Order now" link (hide it on the order page itself, where it'd be redundant).
function LowStockBanner({ className = '', cta = true }) {
  const [state, setState] = useState({ show: false });

  useEffect(() => {
    axios.get(`${API_URL}/api/inventory/public`)
      .then((res) => setState(res.data || { show: false }))
      .catch(() => setState({ show: false }));
  }, []);

  if (!state.show) return null;

  const n = state.bundlesReady;
  const message = state.soldOut
    ? 'Fresh batch coming soon — check back shortly!'
    : `Only ${n} bundle${n === 1 ? '' : 's'} left this week — order soon!`;

  return (
    <div className={`rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 ${className}`}>
      <span aria-hidden="true">🔥 </span>
      {message}
      {cta && !state.soldOut && (
        <Link to="/order" className="ml-2 underline underline-offset-2 hover:text-ember">
          Order now &rarr;
        </Link>
      )}
    </div>
  );
}

LowStockBanner.propTypes = {
  className: PropTypes.string,
  cta: PropTypes.bool,
};

LowStockBanner.defaultProps = {
  className: '',
  cta: true,
};

export default LowStockBanner;
