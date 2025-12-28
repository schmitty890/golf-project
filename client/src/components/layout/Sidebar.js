import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Rounds', href: '/scorecard', icon: ClipboardDocumentListIcon },
  { name: 'Account', href: '/account', icon: UserCircleIcon },
];

function Sidebar({ collapsed = false }) {
  return (
    <div className={`flex grow flex-col gap-y-5 overflow-y-auto overflow-x-hidden border-r border-gray-200 bg-white pb-4 transition-[padding] duration-300 ease-in-out ${collapsed ? 'px-3' : 'px-6'}`}>
      {/* Logo */}
      <div className={`flex h-16 shrink-0 items-center transition-all duration-300 ease-in-out ${collapsed ? 'justify-center' : ''}`}>
        <svg className="h-8 w-8 shrink-0 text-indigo-600" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 2L20 7L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
          <circle cx="12" cy="22" r="2" fill="currentColor" />
        </svg>
        <span className={`ml-2 text-lg font-semibold text-gray-900 whitespace-nowrap transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100'}`}>
          Golf Tracker
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul className={`space-y-1 transition-all duration-300 ease-in-out ${collapsed ? '' : '-mx-2'}`}>
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    title={collapsed ? item.name : undefined}
                    className={({ isActive }) => `group flex rounded-md p-2 text-sm font-semibold leading-6 transition-all duration-300 ease-in-out ${
                      collapsed ? 'justify-center' : 'gap-x-3'
                    } ${
                      isActive
                        ? 'bg-gray-50 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                    }`}
                  >
                    <item.icon
                      className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-indigo-600 transition-colors duration-200"
                      aria-hidden="true"
                    />
                    <span className={`whitespace-nowrap transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                      {item.name}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  );
}

Sidebar.propTypes = {
  collapsed: PropTypes.bool,
};

Sidebar.defaultProps = {
  collapsed: false,
};

export default Sidebar;
