import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import { AuthContext } from '../context/AuthContext';
import { useAdminChat } from '../context/AdminChatContext';

// Site-wide unread indicator for the admin — shows on every page (incl. the public storefront) so
// the owner notices pending chats while away from the dashboard. Bottom-left so it clears Woody.
// Hidden on the chat page itself (where you're already reading) and for non-admins.
function AdminUnreadFab() {
  const { user } = useContext(AuthContext);
  const { totalUnread = 0 } = useAdminChat();
  const { pathname } = useLocation();

  if (user?.role !== 'admin' || totalUnread <= 0 || pathname === '/admin/chat') return null;

  return (
    <Link
      to="/admin/chat"
      aria-label={`${totalUnread} unread chat message${totalUnread === 1 ? '' : 's'}`}
      className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full bg-ember px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-ember-600"
    >
      <ChatBubbleLeftRightIcon className="h-5 w-5" aria-hidden="true" />
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-ember">
        {totalUnread}
      </span>
    </Link>
  );
}

export default AdminUnreadFab;
