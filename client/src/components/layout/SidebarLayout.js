import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
import TopHeader from './TopHeader';

function SidebarLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <>
      {/* Mobile sidebar - slides in from left */}
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Static sidebar for desktop */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-[width] duration-300 ease-in-out ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>
        <Sidebar collapsed={sidebarCollapsed} />
        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition-transform duration-200 hover:scale-110"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Main content area - offset by sidebar width on desktop */}
      <div className={`transition-[padding] duration-300 ease-in-out ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <TopHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </>
  );
}

SidebarLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SidebarLayout;
