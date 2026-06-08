import { useContext } from 'react';
import { Link } from 'react-router-dom';
import business from '../../data/business';
import { AuthContext } from '../../context/AuthContext';

// Permanent launch-offer bar above the header (not dismissable).
// The first-order deal is claimed by signing in, so logged-out visitors are sent to register.
function AnnouncementBar() {
  const { token } = useContext(AuthContext);
  const offer = business.launchOffer;
  if (!offer) return null;

  const to = token ? (offer.href || '/order') : '/register';
  const cta = token ? (offer.cta || 'Order now') : 'Sign in to claim';

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
