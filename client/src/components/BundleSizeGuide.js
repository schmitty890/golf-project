import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import business from '../data/business';
import { products } from '../data/pricing';

const SINGLE = products.find((p) => p.id === 'standard-bundle')?.price || 15;
const PACK = products.find((p) => p.id === 'three-bundle-pack')?.price || 40;

// Best price for N bundles: as many 3-packs as fit, singles for the rest.
export const priceForBundles = (n) => Math.floor(n / 3) * PACK + (n % 3) * SINGLE;

const HINTS = {
  1: 'One cozy evening around the firepit',
  3: 'A weekend of fires',
  6: 'A few weekends — or one big get-together',
  9: 'Plenty for a month of fire nights',
  12: 'Stocked up for the season',
  15: 'The full stack — great for holidays and parties',
};

const SIZE_PHOTOS = business.bundleSizePhotos || [];

// Photo closest to a bundle count (above the largest shows the largest).
export function nearestSizePhoto(count) {
  const photos = SIZE_PHOTOS;
  if (!photos.length || count <= 0) return null;
  return photos.reduce((best, p) => (
    Math.abs(p.count - count) < Math.abs(best.count - count) ? p : best
  ), photos[0]);
}

// "How much wood is that?" — the same pile photographed at 1, 3, 6, 9, 12, 15 bundles.
// Full mode: tap a size to switch photos. Compact mode (order page): follows `count`.
function BundleSizeGuide({ initialCount = 3, count = null, compact = false }) {
  const photos = SIZE_PHOTOS;
  const [picked, setPicked] = useState(initialCount);
  const follow = count !== null;
  const photo = nearestSizePhoto(follow ? count : picked);

  // Warm the cache for the other sizes once the guide is on screen, so switching is instant.
  useEffect(() => {
    if (compact) return;
    photos.forEach((p) => { const img = new Image(); img.src = p.src; });
  }, [compact, photos]);

  if (!photo) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-cream-300 bg-white p-3">
        <img
          src={photo.src}
          alt={photo.alt}
          width="900"
          height="1200"
          className="aspect-[3/4] w-24 shrink-0 rounded-lg object-cover sm:w-28"
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-walnut">
            {photo.count === count
              ? `Here's what ${count} bundle${count === 1 ? '' : 's'} looks like`
              : `About what ${count} bundles looks like`}
          </p>
          <p className="mt-1 text-xs text-walnut-400">
            {photo.count === count ? HINTS[photo.count] : `Photo shows ${photo.count} real VOLW bundles.`}
          </p>
          <a href="/pricing#sizes" className="mt-2 inline-block text-xs font-semibold text-ember hover:text-ember-600">
            Compare sizes →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Number of bundles">
        {photos.map((p) => (
          <button
            key={p.count}
            type="button"
            role="radio"
            aria-checked={p.count === photo.count}
            onClick={() => setPicked(p.count)}
            className={`min-w-[3rem] rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              p.count === photo.count
                ? 'bg-ember text-white shadow-sm'
                : 'bg-white text-walnut ring-1 ring-cream-300 hover:ring-ember'
            }`}
          >
            {p.count}
          </button>
        ))}
      </div>

      <figure className="mt-5">
        <img
          src={photo.src}
          alt={photo.alt}
          width="900"
          height="1200"
          className="aspect-[3/4] w-full rounded-2xl object-cover shadow-lg ring-1 ring-walnut/10"
        />
        <figcaption className="mt-3 text-center">
          <span className="block text-lg font-extrabold text-walnut">
            {`${photo.count} bundle${photo.count === 1 ? '' : 's'} — $${priceForBundles(photo.count)}`}
          </span>
          <span className="block text-sm text-walnut-400">{HINTS[photo.count]}</span>
        </figcaption>
      </figure>
    </div>
  );
}

BundleSizeGuide.propTypes = {
  initialCount: PropTypes.number,
  count: PropTypes.number,
  compact: PropTypes.bool,
};

BundleSizeGuide.defaultProps = {
  initialCount: 3,
  count: null,
  compact: false,
};

export default BundleSizeGuide;
