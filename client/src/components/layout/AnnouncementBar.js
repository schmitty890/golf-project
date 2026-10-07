import { Link } from 'react-router-dom';
import business from '../../data/business';

// Permanent announcement bar above the header (not dismissable).
function AnnouncementBar() {
  const offer = business.launchOffer;
  if (!offer) return null;

  const to = offer.href || '/order';
  const cta = offer.cta || 'Order now';

  return (
    <div className="bg-ember text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-3 px-4 py-2 text-center text-sm font-medium sm:px-6 lg:px-8">
        <p>
          {offer.text}
          <Link to={to} className="ml-2 font-semibold underline underline-offset-2 hover:text-cream">
            {cta}
            {' '}
            &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
}

export default AnnouncementBar;
