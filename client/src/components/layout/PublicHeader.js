import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Logo from '../Logo';
import { AuthContext } from '../../context/AuthContext';

const navLinks = [
  { name: 'Pricing', href: '/#pricing' },
  { name: 'Subscriptions', href: '/#subscriptions' },
  { name: 'How It Works', href: '/#how-it-works' },
  { name: 'Contact', href: '/#contact' },
];

function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { token } = useContext(AuthContext);

  return (
    <header className="sticky top-0 z-40 border-b border-cream-300 bg-cream/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center" aria-label="VOLW Firewood home">
          <Logo size="xl" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-x-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-semibold text-walnut hover:text-ember transition-colors"
            >
              {link.name}
            </a>
          ))}
          <Link
            to={token ? '/my-orders' : '/login'}
            className="text-sm font-semibold text-walnut hover:text-ember transition-colors"
          >
            {token ? 'My Orders' : 'Sign In'}
          </Link>
          <Link
            to="/order"
            className="rounded-md bg-ember px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ember-600 transition-colors"
          >
            Order Firewood
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden -m-2.5 p-2.5 text-walnut"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-cream-300 bg-cream px-4 py-4 md:hidden">
          <div className="flex flex-col gap-y-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-semibold text-walnut hover:text-ember"
              >
                {link.name}
              </a>
            ))}
            <Link
              to={token ? '/my-orders' : '/login'}
              onClick={() => setMobileOpen(false)}
              className="text-sm font-semibold text-walnut hover:text-ember"
            >
              {token ? 'My Orders' : 'Sign In'}
            </Link>
            <Link
              to="/order"
              onClick={() => setMobileOpen(false)}
              className="rounded-md bg-ember px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-ember-600"
            >
              Order Firewood
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default PublicHeader;
