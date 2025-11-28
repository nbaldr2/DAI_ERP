import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { clsx } from 'clsx';
import {
  Bell,
  Search,
  Sun,
  Moon,
  Globe,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Menu
} from 'lucide-react';

const Header = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, toggleSidebar } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageToggle = () => {
    const newLanguage = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLanguage);
    document.body.dir = newLanguage === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', newLanguage === 'ar');
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    window.location.href = '/login';
  };

  // Mock notifications (replace with real data)
  const notifications = [
    {
      id: 1,
      title: 'Stock Alert',
      message: 'Tomatoes expiring in 2 days',
      time: '5 minutes ago',
      type: 'warning'
    },
    {
      id: 2,
      title: 'New Sale',
      message: 'Order #1234 completed',
      time: '1 hour ago',
      type: 'success'
    },
    {
      id: 3,
      title: 'Low Stock',
      message: 'Onions below minimum quantity',
      time: '3 hours ago',
      type: 'error'
    }
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left side - Mobile menu button + Search */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Search bar */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              className="pl-10 pr-4 py-2 w-64 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-4">
          {/* Language toggle */}
          <button
            onClick={handleLanguageToggle}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors group"
            title={i18n.language === 'en' ? 'عربي' : 'English'}
          >
            <Globe className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
            <span className="sr-only">Toggle language</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors group"
            title={theme === 'light' ? t('settings.dark') : t('settings.light')}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
            ) : (
              <Sun className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
            )}
            <span className="sr-only">Toggle theme</span>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-md hover:bg-gray-100 transition-colors group"
            >
              <Bell className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse">
                  <span className="sr-only">New notifications</span>
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg animate-fade-in-scale">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t('dashboard.alerts')}
                  </h3>
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      {t('common.noData')}
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0"
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={clsx(
                              'w-2 h-2 rounded-full mt-2',
                              {
                                'bg-yellow-500': notification.type === 'warning',
                                'bg-green-500': notification.type === 'success',
                                'bg-red-500': notification.type === 'error',
                              }
                            )}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 transition-colors group"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-primary-400 to-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
            </button>

            {/* User dropdown menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg animate-fade-in-scale">
                <div className="p-4 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-sm text-gray-500">{user?.username}</p>
                  <span className={clsx(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2',
                    {
                      'bg-purple-100 text-purple-800': user?.role === 'ADMIN',
                      'bg-blue-100 text-blue-800': user?.role === 'WAREHOUSE',
                      'bg-green-100 text-green-800': user?.role === 'SALES',
                      'bg-yellow-100 text-yellow-800': user?.role === 'ACCOUNTANT',
                      'bg-gray-100 text-gray-800': user?.role === 'VIEWER',
                    }
                  )}>
                    {user?.role}
                  </span>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      // Navigate to profile
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 mr-3" />
                    {t('settings.profile')}
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      // Navigate to settings
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    {t('nav.settings')}
                  </button>
                </div>

                <div className="py-2 border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    {t('nav.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
