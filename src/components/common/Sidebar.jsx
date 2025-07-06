import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  UserGroupIcon, 
  CalendarIcon, 
  FolderIcon, 
  BellIcon,
  CogIcon,
  ChartBarIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import useAuthStore from '../../store/authStore';

const Sidebar = () => {
  const location = useLocation();
  const { userProfile, isAdmin, toggleTheme, theme } = useAuthStore();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: isAdmin() ? '/dashboard-admin' : '/dashboard-user',
      icon: HomeIcon,
      current: location.pathname === '/dashboard-admin' || location.pathname === '/dashboard-user'
    },
    {
      name: 'Teams',
      href: '/teams',
      icon: UserGroupIcon,
      current: location.pathname.startsWith('/teams')
    },
    {
      name: 'Calendar',
      href: '/calendar',
      icon: CalendarIcon,
      current: location.pathname.startsWith('/calendar')
    },
    {
      name: 'Files',
      href: '/files',
      icon: FolderIcon,
      current: location.pathname.startsWith('/files')
    },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: BellIcon,
      current: location.pathname.startsWith('/notifications')
    }
  ];

  const adminItems = [
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: ChartBarIcon,
      current: location.pathname.startsWith('/admin/analytics')
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: UserGroupIcon,
      current: location.pathname.startsWith('/admin/users')
    }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="loop-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#06b6d4" />
                  <stop offset="1" stop-color="#6366f1" />
                </linearGradient>
              </defs>
              <path d="M20 6
                a14 14 0 1 1 -9.9 4.1" stroke="url(#loop-gradient)" stroke-width="4" stroke-linecap="round" fill="none"/>
              <circle cx="20" cy="20" r="16" stroke="url(#loop-gradient)" stroke-width="2" fill="none" opacity="0.15"/>
              <circle cx="20" cy="6" r="2.5" fill="#06b6d4"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Loop</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`sidebar-item ${
                item.current ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          ))}
        </div>

        {/* Admin Section */}
        {isAdmin() && (
          <div className="pt-6 border-t border-gray-200 dark:border-dark-700">
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Admin
            </h3>
            <div className="mt-2 space-y-1">
              {adminItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-item ${
                    item.current ? 'sidebar-item-active' : 'sidebar-item-inactive'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-700">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-gray-100 rounded-md transition-colors duration-200"
        >
          {theme === 'dark' ? (
            <>
              <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Light Mode
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Dark Mode
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 