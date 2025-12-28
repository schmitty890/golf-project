import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Rounds', href: '/scorecard', icon: ClipboardDocumentListIcon },
  { name: 'Account', href: '/account', icon: UserCircleIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

function Sidebar() {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center">
        <svg className="h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 2L20 7L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
          <circle cx="12" cy="22" r="2" fill="currentColor" />
        </svg>
        <span className="ml-2 text-lg font-semibold text-gray-900">Golf Tracker</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive }) => `group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 ${
                      isActive
                        ? 'bg-gray-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                    }`}
                  >
                    <item.icon
                      className={`h-6 w-6 shrink-0 ${
                        'group-[.active]:text-blue-600 text-gray-400 group-hover:text-blue-600'
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
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

export default Sidebar;
