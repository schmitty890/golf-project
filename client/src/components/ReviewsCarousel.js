import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import StarRating from './StarRating';

// One-card-at-a-time carousel of reviews. Each item: { name, text, detail, rating }.
function ReviewsCarousel({ items }) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  const go = useCallback((next) => setIndex((next + count) % count), [count]);

  // Gentle auto-advance; pauses nothing fancy, just cycles. Cleared on unmount/!multi.
  useEffect(() => {
    if (count <= 1) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 7000);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;
  const active = items[Math.min(index, count - 1)];

  return (
    <div className="mx-auto mt-12 max-w-2xl">
      <div className="flex items-center gap-3">
        {count > 1 && (
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="shrink-0 rounded-full border border-cream-300 bg-cream p-2 text-walnut hover:border-ember hover:text-ember"
            aria-label="Previous review"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        )}

        <figure className="flex-1 rounded-2xl border border-cream-300 bg-cream p-8 shadow-sm">
          {active.rating ? (
            <StarRating value={active.rating} size="md" />
          ) : (
            <span className="text-4xl font-extrabold leading-none text-ember" aria-hidden="true">“</span>
          )}
          <blockquote className="mt-3 text-base text-walnut-400">{active.text}</blockquote>
          <figcaption className="mt-4 text-sm font-bold text-walnut">
            {active.name}
            {active.detail && (
              <span className="block font-normal text-walnut-300">{active.detail}</span>
            )}
          </figcaption>
        </figure>

        {count > 1 && (
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="shrink-0 rounded-full border border-cream-300 bg-cream p-2 text-walnut hover:border-ember hover:text-ember"
            aria-label="Next review"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {count > 1 && (
        <div className="mt-5 flex justify-center gap-2">
          {items.map((it, i) => (
            <button
              type="button"
              // eslint-disable-next-line react/no-array-index-key
              key={`dot-${it.name}-${i}`}
              onClick={() => setIndex(i)}
              aria-label={`Go to review ${i + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                i === index ? 'w-6 bg-ember' : 'w-2.5 bg-cream-300 hover:bg-walnut-200'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

ReviewsCarousel.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    text: PropTypes.string,
    detail: PropTypes.string,
    rating: PropTypes.number,
  })).isRequired,
};

export default ReviewsCarousel;
