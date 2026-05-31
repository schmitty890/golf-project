import { useState } from 'react';
import { Link } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/20/solid';
import business from '../../data/business';

const DISMISS_KEY = 'volw-offer-dismissed';

// Slim launch-offer bar above the header. Dismissible; the choice persists in localStorage.
function AnnouncementBar() {
  const offer = business.launchOffer;
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === 'true',
  );

  if (!offer || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="relative bg-ember text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-3 px-10 py-2 text-center text-sm font-medium sm:px-6 lg:px-8">
        <p>
          {offer.text}
          {offer.cta && offer.href && (
            <Link to={offer.href} className="ml-2 font-semibold underline underline-offset-2 hover:text-cream">
              {offer.cta}
              {' '}
              &rarr;
            </Link>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/80 hover:text-white"
      >
        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

export default AnnouncementBar;
