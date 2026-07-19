import { Link } from 'react-router-dom';
import Logo from '../Logo';
import SocialIcon from '../SocialIcon';
import business from '../../data/business';

function Footer() {
  return (
    <footer id="site-footer" className="bg-walnut text-cream">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <Logo size="sm" />
            <p className="mt-4 text-lg font-extrabold tracking-tight">
              VOLW
              {' '}
              <span className="text-ember">Firewood</span>
            </p>
            <p className="mt-2 text-sm text-cream-300">
              Firewood delivered to
              {' '}
              {business.serviceArea}
              .
            </p>
            {business.social?.length > 0 && (
              <div className="mt-4 flex gap-3">
                {business.social.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    className="text-cream-300 transition-colors hover:text-ember"
                  >
                    <SocialIcon name={s.name} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ember">Contact</h3>
            <ul className="mt-4 space-y-2 text-sm text-cream-300">
              <li>
                <a href={`mailto:${business.email}`} className="hover:text-ember">
                  {business.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ember">Order</h3>
            <ul className="mt-4 space-y-2 text-sm text-cream-300">
              <li>
                <Link to="/order" className="hover:text-ember">Order Firewood</Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-ember">View Pricing</Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-ember">Subscriptions</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-walnut-400 pt-6 text-center text-xs text-cream-300">
          &copy;
          {' '}
          {business.established}
          {' '}
          {business.name}
          . Serving
          {' '}
          {business.serviceArea}
          {' '}
          exclusively.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
