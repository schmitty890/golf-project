import { useContext } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  UserCircleIcon,
  InboxStackIcon,
  CalendarDaysIcon,
  StarIcon,
  ListBulletIcon,
  TicketIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  ChatBubbleLeftRightIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';
import Logo from '../Logo';
import { AuthContext } from '../../context/AuthContext';
import { useAdminChat } from '../../context/AdminChatContext';

function Sidebar({ collapsed = false }) {
  const { user } = useContext(AuthContext);
  const { totalUnread = 0 } = useAdminChat();

  const navigation = [
    { name: 'My Orders', href: '/my-orders', icon: ClipboardDocumentListIcon },
    { name: 'Account', href: '/account', icon: UserCircleIcon },
  ];

  if (user?.role === 'admin') {
    navigation.push({ name: 'Schedule', href: '/admin/schedule', icon: ListBulletIcon });
    navigation.push({ name: 'Orders (Admin)', href: '/admin/orders', icon: InboxStackIcon });
    navigation.push({ name: 'Customers', href: '/admin/customers', icon: UserGroupIcon });
    navigation.push({ name: 'Availability', href: '/admin/availability', icon: CalendarDaysIcon });
    navigation.push({ name: 'Feedback', href: '/admin/feedback', icon: StarIcon });
    navigation.push({ name: 'Promo codes', href: '/admin/promos', icon: TicketIcon });
    navigation.push({ name: 'Inventory', href: '/admin/inventory', icon: ArchiveBoxIcon });
    navigation.push({
      name: 'Live chat', href: '/admin/chat', icon: ChatBubbleLeftRightIcon, badge: totalUnread,
    });
    navigation.push({ name: 'Giveaway', href: '/admin/giveaway', icon: GiftIcon });
  }

  return (
    <div className={`flex grow flex-col gap-y-5 overflow-y-auto overflow-x-hidden border-r border-cream-300 bg-cream pb-4 transition-[padding] duration-300 ease-in-out ${collapsed ? 'px-3' : 'px-6'}`}>
      {/* Logo */}
      <div className="flex shrink-0 items-center justify-center py-4 transition-all duration-300 ease-in-out">
        <Logo size={collapsed ? 'sm' : 'xl'} />
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
                    title={collapsed ? item.name : undefined}
                    className={({ isActive }) => `group flex rounded-md p-2 text-sm font-semibold leading-6 transition-all duration-300 ease-in-out ${
                      collapsed ? 'justify-center' : 'gap-x-3'
                    } ${
                      isActive
                        ? 'bg-cream-300 text-ember'
                        : 'text-walnut hover:bg-cream-300 hover:text-ember'
                    }`}
                  >
                    <span className="relative shrink-0">
                      <item.icon
                        className="h-6 w-6 text-walnut-300 group-hover:text-ember transition-colors duration-200"
                        aria-hidden="true"
                      />
                      {collapsed && item.badge > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      )}
                    </span>
                    <span className={`whitespace-nowrap transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                      {item.name}
                    </span>
                    {!collapsed && item.badge > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1.5 text-xs font-bold text-white">
                        {item.badge}
                      </span>
                    )}
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
