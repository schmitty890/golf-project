import { useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { AuthContext } from '../../context/AuthContext';

function ProfileDropdown() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Menu as="div" className="relative">
      <MenuButton className="-m-1.5 flex items-center p-1.5">
        <span className="sr-only">Open user menu</span>
        {/* User avatar */}
        {user?.profilePicture ? (
          <img
            src={user.profilePicture}
            alt="Profile"
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500">
            <span className="text-sm font-medium leading-none text-white">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </span>
        )}
        <span className="hidden lg:flex lg:items-center">
          <span
            className="ml-4 text-sm font-semibold leading-6 text-gray-900"
            aria-hidden="true"
          >
            {user?.email || 'User'}
          </span>
          <ChevronDownIcon
            className="ml-2 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </span>
      </MenuButton>

      <MenuItems
        transition
        className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
      >
        <MenuItem>
          <Link
            to="/account"
            className="flex items-center gap-x-2 px-3 py-1 text-sm leading-6 text-gray-900 data-[focus]:bg-gray-50"
          >
            <UserCircleIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            Account
          </Link>
        </MenuItem>
        <MenuItem>
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full px-3 py-1 text-left text-sm leading-6 text-gray-900 data-[focus]:bg-gray-50"
          >
            Sign out
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}

export default ProfileDropdown;
