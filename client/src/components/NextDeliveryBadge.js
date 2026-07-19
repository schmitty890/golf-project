import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { nextAvailableDate, relativeDayLabel } from '../utils/dates';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Shows the next date we can deliver, computed from the owner's lead-days + calendar closures
// (the same availability rules the order form uses). `variant="light"` suits dark backgrounds
// (Home hero); default suits light/cream sections.
function NextDeliveryBadge({ className = '', variant = 'default' }) {
  const [next, setNext] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/settings/availability`)
      .then((res) => {
        const d = res.data || {};
        setNext(nextAvailableDate(d.leadDays, d.dateOverrides));
      })
      .catch(() => setNext(null));
  }, []);

  if (!next) return null;

  const chipClass = variant === 'light'
    ? 'bg-cream/10 text-cream ring-1 ring-inset ring-cream/20'
    : 'bg-ember/10 text-ember';

  return (
    <div className={className}>
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${chipClass}`}>
        <span aria-hidden="true">🚚</span>
        Next available delivery:
        {' '}
        {relativeDayLabel(next)}
      </span>
    </div>
  );
}

NextDeliveryBadge.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'light']),
};

NextDeliveryBadge.defaultProps = {
  className: '',
  variant: 'default',
};

export default NextDeliveryBadge;
