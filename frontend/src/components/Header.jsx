import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import notificationService from '../services/notificationService';
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
  Menu,
  Check,
  CheckCheck,
  ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const Header = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, toggleSidebar } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationService.getAll();
      if (response.data.success) {
        setNotifications(response.data.data);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  // Mark as read
  const handleMarkAsRead = async (id, event) => {
    event.stopPropagation();
    try {
      await notificationService.markAsRead(id);

      // Optimistically update UI
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();

      // Optimistically update UI
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

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
    localStorage.setItem('language', newLanguage);
    const dir = newLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.body.dir = dir;
    if (newLanguage === 'ar') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    window.location.href = '/login';
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'WARNING': return 'bg-yellow-500';
      case 'SUCCESS': return 'bg-green-500';
      case 'ERROR': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <header className="bg-card border-b border-theme-border sticky top-0 z-10 transition-all duration-300 backdrop-blur-md">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left side - Mobile menu button + Search */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-card-hover transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5 text-text-secondary" />
          </button>

          {/* Search bar */}
          <div className="relative hidden md:block group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary group-hover:text-primary-500 transition-colors" />
            <input
              type="text"
              placeholder={t('common.search')}
              className="pl-10 pr-4 py-2 w-64 bg-background border border-theme-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all hover:bg-card-hover hover:shadow-sm"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-4">
          {/* POS Button - Only for ADMIN and SALES */}
          {(user?.role === 'ADMIN' || user?.role === 'SALES') && (
            <button
              onClick={() => navigate('/pos')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium text-sm hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">POS</span>
            </button>
          )}

          {/* Language toggle */}
          <button
            onClick={handleLanguageToggle}
            className="p-2 rounded-md hover:bg-card-hover transition-colors group"
            title={i18n.language === 'en' ? 'عربي' : 'English'}
          >
            <Globe className="w-5 h-5 text-text-secondary group-hover:text-primary-600 transition-colors" />
            <span className="sr-only">Toggle language</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-card-hover transition-colors group"
            title={theme === 'light' ? t('settings.dark') : t('settings.light')}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-text-secondary group-hover:text-primary-600 transition-colors" />
            ) : (
              <Sun className="w-5 h-5 text-text-secondary group-hover:text-primary-600 transition-colors" />
            )}
            <span className="sr-only">Toggle theme</span>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                if (!notificationsOpen) fetchNotifications(); // Refresh on open
              }}
              className="relative p-2 rounded-md hover:bg-card-hover transition-colors group"
            >
              <Bell className={clsx(
                "w-5 h-5 text-text-secondary group-hover:text-primary-600 transition-colors",
                { "text-primary-600 shake-animation": unreadCount > 0 }
              )} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse border-2 border-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-card border border-theme-border rounded-xl shadow-2xl animate-fade-in-scale origin-top-right overflow-hidden z-50">
                <div className="p-4 border-b border-theme-border bg-card-hover flex justify-between items-center">
                  <h3 className="text-sm font-bold text-text-primary flex items-center">
                    <Bell className="w-4 h-4 mr-2 text-primary-600" />
                    {t('dashboard.alerts')}
                    {unreadCount > 0 && (
                      <span className="ml-2 bg-primary-100 text-primary-700 py-0.5 px-2 rounded-full text-xs">
                        {unreadCount} New
                      </span>
                    )}
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center transition-colors"
                    >
                      <CheckCheck className="w-3 h-3 mr-1" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[28rem] overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center text-text-secondary">
                      <div className="w-12 h-12 bg-card-hover rounded-full flex items-center justify-center mb-3">
                        <Bell className="w-6 h-6 text-text-secondary" />
                      </div>
                      <p className="text-sm font-medium text-text-primary">No notifications</p>
                      <p className="text-xs text-text-secondary mt-1">You're all caught up!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-theme-border">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={clsx(
                            'p-4 hover:bg-card-hover transition-all duration-200 cursor-pointer group relative',
                            { 'bg-primary-900/30': !notification.is_read }
                          )}
                          onClick={() => !notification.is_read && handleMarkAsRead(notification.id, event)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={clsx(
                              'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                              getNotificationIcon(notification.type)
                            )} />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <p className={clsx(
                                  "text-sm",
                                  !notification.is_read ? "font-bold text-text-primary" : "font-medium text-text-secondary"
                                )}>
                                  {notification.title}
                                </p>
                                <span className="text-xs text-text-secondary whitespace-nowrap ml-2">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              <p className={clsx("text-sm break-words", !notification.is_read ? "text-text-primary" : "text-text-secondary")}>
                                {notification.message}
                              </p>

                              <div className="mt-2 flex items-center justify-between">
                                <span className={clsx(
                                  "text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-semibold",
                                  {
                                    'bg-yellow-50 text-yellow-700 border-yellow-200': notification.type === 'WARNING',
                                    'bg-green-50 text-green-700 border-green-200': notification.type === 'SUCCESS',
                                    'bg-red-50 text-red-700 border-red-200': notification.type === 'ERROR',
                                    'bg-blue-50 text-blue-700 border-blue-200': notification.type === 'INFO',
                                  }
                                )}>
                                  {notification.type}
                                </span>

                                {!notification.is_read && (
                                  <button
                                    onClick={(e) => handleMarkAsRead(notification.id, e)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-card rounded-full text-text-secondary hover:text-green-600"
                                    title="Mark as read"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          {!notification.is_read && (
                            <div className="absolute top-1/2 right-2 -translate-y-1/2 w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Footer if needed */}
                <div className="p-2 border-t border-theme-border bg-card-hover text-center">
                  <button className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors">
                    View all activity
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-card-hover transition-colors group"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-primary-400 to-primary-500 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                <p className="text-xs text-text-secondary">{user?.role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-text-secondary group-hover:text-text-primary" />
            </button>

            {/* User dropdown menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-card border border-theme-border rounded-xl shadow-xl animate-fade-in-scale z-50 overflow-hidden">
                <div className="p-4 border-b border-theme-border bg-card-hover/50">
                  <p className="text-sm font-bold text-text-primary truncate">{user?.name}</p>
                  <p className="text-xs text-text-secondary truncate">{user?.username}</p>
                  <span className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-2 border',
                    {
                      'bg-purple-50 text-purple-700 border-purple-200': user?.role === 'ADMIN',
                      'bg-blue-50 text-blue-700 border-blue-200': user?.role === 'WAREHOUSE',
                      'bg-green-50 text-green-700 border-green-200': user?.role === 'SALES',
                      'bg-yellow-50 text-yellow-700 border-yellow-200': user?.role === 'ACCOUNTANT',
                      'bg-background text-text-secondary border-theme-border': user?.role === 'VIEWER',
                    }
                  )}>
                    {user?.role}
                  </span>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      // Navigate to profile
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-text-primary hover:bg-card-hover rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4 mr-3 text-text-secondary" />
                    {t('settings.profile')}
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      // Navigate to settings
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-text-primary hover:bg-card-hover rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-3 text-text-secondary" />
                    {t('nav.settings')}
                  </button>
                </div>

                <div className="p-1 border-t border-theme-border">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
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
