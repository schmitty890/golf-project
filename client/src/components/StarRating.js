import { useState } from 'react';
import PropTypes from 'prop-types';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';

const SIZES = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

// Star rating. Read-only by default; pass `onChange` to make it an interactive input.
function StarRating({
  value, onChange, size, className,
}) {
  const [hover, setHover] = useState(0);
  const editable = typeof onChange === 'function';
  const dim = SIZES[size] || SIZES.md;
  const shown = hover || value;

  return (
    <div className={`flex items-center gap-0.5 ${className}`} role={editable ? 'radiogroup' : 'img'} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= shown;
        const Icon = filled ? StarSolid : StarOutline;
        const star = <Icon className={`${dim} ${filled ? 'text-ember' : 'text-walnut-200'}`} aria-hidden="true" />;
        if (!editable) return <span key={n}>{star}</span>;
        return (
          <button
            type="button"
            key={n}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}

StarRating.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

StarRating.defaultProps = {
  value: 0,
  onChange: null,
  size: 'md',
  className: '',
};

export default StarRating;
