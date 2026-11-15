import { useState } from 'react';
import PropTypes from 'prop-types';

const METHODS = [
  { id: 'venmo', label: 'Venmo' },
  { id: 'card', label: 'Card' },
  { id: 'cash', label: 'Cash' },
];

// Admin payment control. "Mark paid" asks how they paid (so a card order settled by Venmo reads
// "Venmo — Paid"); "Mark unpaid" needs a confirm, so a stray double-tap can't silently undo a
// payment. Calls onChange(paymentStatus, paymentMethod?).
function MarkPaidControl({ paid, onChange, size = 'sm' }) {
  const [choosing, setChoosing] = useState(false);
  const pad = size === 'md' ? 'px-3 py-1.5' : 'px-2 py-1';
  const btn = `rounded-md border border-cream-300 ${pad} text-sm font-semibold text-walnut hover:border-ember`;

  if (paid) {
    return (
      <button
        type="button"
        className={btn}
        onClick={() => {
          // eslint-disable-next-line no-alert
          if (window.confirm('Mark this order unpaid? Its bundles will be put back in stock.')) {
            onChange('unpaid');
          }
        }}
      >
        Mark unpaid
      </button>
    );
  }

  if (!choosing) {
    return (
      <button type="button" className={btn} onClick={() => setChoosing(true)}>
        Mark paid
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-green-50 p-1.5">
      <span className="px-1 text-xs font-semibold text-green-800">Paid by</span>
      {METHODS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => { setChoosing(false); onChange('paid', m.id); }}
          className={`rounded-md border border-green-600 bg-white ${pad} text-sm font-semibold text-green-700 hover:bg-green-600 hover:text-white`}
        >
          {m.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setChoosing(false)}
        className="px-1 text-xs font-semibold text-walnut-400 hover:text-walnut"
      >
        Cancel
      </button>
    </span>
  );
}

MarkPaidControl.propTypes = {
  paid: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['sm', 'md']),
};

MarkPaidControl.defaultProps = {
  size: 'sm',
};

export default MarkPaidControl;
