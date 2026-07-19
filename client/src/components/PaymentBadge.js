import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Advertises how customers can pay, driven by the same `cardEnabled` flag the order form uses
// (server-derived from stripeEnabled()). Shows card+Venmo when Stripe is on, Venmo-only otherwise.
// `variant="light"` suits dark backgrounds (Home hero); default suits light/cream sections.
function PaymentBadge({ className = '', variant = 'default' }) {
  const [cardEnabled, setCardEnabled] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/settings/availability`)
      .then((res) => setCardEnabled(Boolean(res.data?.cardEnabled)))
      .catch(() => setCardEnabled(false));
  }, []);

  if (cardEnabled === null) return null;

  const chipClass = variant === 'light'
    ? 'bg-cream/10 text-cream ring-1 ring-inset ring-cream/20'
    : 'bg-ember/10 text-ember';

  return (
    <div className={className}>
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${chipClass}`}>
        <span aria-hidden="true">{cardEnabled ? '💳' : '💵'}</span>
        {cardEnabled ? 'Pay by card or Venmo' : 'Pay by Venmo'}
      </span>
    </div>
  );
}

PaymentBadge.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'light']),
};

PaymentBadge.defaultProps = {
  className: '',
  variant: 'default',
};

export default PaymentBadge;
