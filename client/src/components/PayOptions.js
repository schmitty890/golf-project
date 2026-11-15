import { useState } from 'react';
import PropTypes from 'prop-types';
import { CreditCardIcon } from '@heroicons/react/24/outline';
import { startCardCheckout, venmoPayUrl } from '../utils/payments';

// "Pay this order" buttons for an existing unpaid order: card (fresh Stripe Checkout) + Venmo.
// Used after a canceled/failed card attempt and on the tracking page.
function PayOptions({
  trackingToken, amount = '', venmoHandle = '', cardEnabled = false,
}) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const venmoUrl = venmoPayUrl(venmoHandle, amount);
  const handle = (venmoHandle || '').replace(/^@/, '');

  const payByCard = async () => {
    setStarting(true);
    setError('');
    try {
      window.location = await startCardCheckout(trackingToken);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  };

  return (
    <div className="space-y-3">
      {cardEnabled && (
        <button
          type="button"
          onClick={payByCard}
          disabled={starting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-ember px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-ember-600 disabled:opacity-60"
        >
          <CreditCardIcon className="h-5 w-5" aria-hidden="true" />
          {starting ? 'Opening secure checkout…' : `Pay${amount ? ` $${amount}` : ''} by card`}
        </button>
      )}
      {venmoUrl && (
        <a
          href={venmoUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center rounded-xl bg-[#3D95CE] px-4 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
        >
          {amount ? `Pay $${amount} with Venmo` : 'Pay with Venmo'}
          {` · @${handle}`}
        </a>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    </div>
  );
}

PayOptions.propTypes = {
  trackingToken: PropTypes.string.isRequired,
  amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  venmoHandle: PropTypes.string,
  cardEnabled: PropTypes.bool,
};

PayOptions.defaultProps = {
  amount: '',
  venmoHandle: '',
  cardEnabled: false,
};

export default PayOptions;
