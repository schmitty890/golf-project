import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Shows the current site-wide wood type (e.g. "Mixed seasoned hardwood"), set by the owner.
// `variant="light"` suits dark backgrounds (Home hero); default suits light/cream sections.
function WoodTypeBadge({ className = '', variant = 'default', showNote = true }) {
  const [woodType, setWoodType] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/settings/availability`)
      .then((res) => setWoodType(res.data?.woodType || null))
      .catch(() => setWoodType(null));
  }, []);

  if (!woodType?.label) return null;

  const chipClass = variant === 'light'
    ? 'bg-cream/10 text-cream ring-1 ring-inset ring-cream/20'
    : 'bg-ember/10 text-ember';
  const noteClass = variant === 'light' ? 'text-cream-300' : 'text-walnut-400';

  return (
    <div className={className}>
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${chipClass}`}>
        <span aria-hidden="true">🪵</span>
        This week&apos;s wood:
        {' '}
        {woodType.label}
      </span>
      {showNote && woodType.note && (
        <p className={`mt-1 text-xs ${noteClass}`}>{woodType.note}</p>
      )}
    </div>
  );
}

WoodTypeBadge.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'light']),
  showNote: PropTypes.bool,
};

WoodTypeBadge.defaultProps = {
  className: '',
  variant: 'default',
  showNote: true,
};

export default WoodTypeBadge;
