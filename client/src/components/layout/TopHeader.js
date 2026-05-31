import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/24/outline';
import ProfileDropdown from './ProfileDropdown';

function TopHeader({ onMenuClick }) {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-cream-300 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={onMenuClick}
        className="-m-2.5 p-2.5 text-walnut lg:hidden"
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-cream-300 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 items-center justify-between gap-x-4 self-stretch lg:gap-x-6">
        <Link to="/" className="text-sm font-semibold text-walnut hover:text-ember">
          ← Back to site
        </Link>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Profile dropdown */}
          <ProfileDropdown />
        </div>
      </div>
    </div>
  );
}

TopHeader.propTypes = {
  onMenuClick: PropTypes.func.isRequired,
};

export default TopHeader;
