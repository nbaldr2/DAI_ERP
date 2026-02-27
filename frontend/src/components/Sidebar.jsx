import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { clsx } from 'clsx';
import { Tooltip } from 'react-tooltip';
import {
  LayoutDashboard,
  Package,
  Trash2,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Users,
  Warehouse,
  FileText,
  BarChart3,
  Shield,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  Building2,
  ClipboardList,
  DollarSign,
  ScrollText,
  Store,
  FolderOpen
} from 'lucide-react';

const Sidebar = () => {
  const { t } = useTranslation();
  const { user, logout, hasPermission } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const menuItems = [
    {
      label: t('nav.dashboard'),
      icon: LayoutDashboard,
      path: '/dashboard',
      permission: null
    },
    {
      label: t('nav.stock'),
      icon: Package,
      path: '/stock',
      permission: 'stock:read'
    },
    {
      label: t('nav.waste'),
      icon: Trash2,
      path: '/waste',
      permission: 'waste:read'
    },
    {
      label: t('nav.sales'),
      icon: ShoppingCart,
      path: '/sales',
      permission: 'sales:read'
    },
    {
      label: 'POS Dashboard',
      icon: Store,
      path: '/pos-dashboard',
      permission: null
    },
    {
      type: 'divider'
    },
    {
      label: t('nav.products'),
      icon: ShoppingBag,
      path: '/products',
      permission: 'products:read'
    },
    {
      label: t('nav.suppliers'),
      icon: Truck,
      path: '/suppliers',
      permission: 'suppliers:read'
    },
    {
      label: t('nav.customers'),
      icon: Users,
      path: '/customers',
      permission: 'customers:read'
    },
    {
      label: t('nav.warehouses'),
      icon: Warehouse,
      path: '/warehouses',
      permission: 'warehouses:read'
    },
    {
      type: 'divider'
    },
    {
      label: t('nav.quotations', 'Quotations'),
      icon: ScrollText,
      path: '/quotations',
      permission: 'quotations:read'
    },
    {
      label: t('nav.invoices'),
      icon: FileText,
      path: '/invoices',
      permission: 'invoices:read'
    },
    {
      label: t('nav.deliveryNotes', 'Delivery Notes'),
      icon: Truck,
      path: '/delivery-notes',
      permission: 'invoices:read'
    },
    {
      label: t('nav.expenses', 'Expenses'),
      icon: DollarSign,
      path: '/expenses',
      permission: 'expenses:read'
    },
    {
      label: t('nav.purchases'),
      icon: ClipboardList,
      path: '/purchases',
      permission: 'purchases:read'
    },
    {
      label: t('nav.reports'),
      icon: BarChart3,
      path: '/reports',
      permission: 'reports:read'
    },
    {
      label: t('nav.auditLogs'),
      icon: Shield,
      path: '/audit-logs',
      permission: 'audit:read'
    },
    {
      label: 'Documents',
      icon: FolderOpen,
      path: '/documents',
      permission: null
    }
    ,
    {
      type: 'divider'
    },
    {
      label: t('nav.users', 'Users'),
      icon: Shield,
      path: '/users',
      permission: 'users:read'
    }
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.type === 'divider') return true;
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <>
      {/* Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-30 flex flex-col bg-card border-r border-theme-border transition-all duration-300 backdrop-blur-md',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-theme-border">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <img
                src="/logo/dai.png"
                alt="DAI Trading Logo"
                className="w-60 h-60 rounded-2xl object-contain"
              />
            </div>
            {!sidebarCollapsed && (
              <div className="animate-slide-in-right">
                <h1 className="text-lg font-bold text-text-primary">Dai Trading</h1>
                <p className="text-xs text-text-secondary">ERP System</p>
              </div>
            )}
          </div>

          {/* Collapse button */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-card-hover transition-colors"
          >
            <Menu className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-theme-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-400 to-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            {!sidebarCollapsed && (
              <div className="animate-slide-in-right">
                <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                <p className="text-xs text-text-secondary">{user?.role}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item, index) => {
            if (item.type === 'divider') {
              return (
                <div
                  key={index}
                  className="my-4 border-t border-theme-border"
                />
              );
            }

            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group stagger-item',
                    sidebarCollapsed ? 'justify-center px-2 py-3' : 'space-x-3',
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                      : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className="flex items-center justify-center w-6 h-6"
                      data-tooltip-id="sidebar-tooltip"
                      data-tooltip-content={!sidebarCollapsed ? undefined : item.label}
                      data-tooltip-place="right"
                    >
                      <Icon
                        className={clsx(
                          'w-5 h-5 transition-colors',
                          isActive ? 'text-primary-600' : 'text-text-secondary group-hover:text-text-primary'
                        )}
                      />
                    </div>
                    {!sidebarCollapsed && (
                      <>
                        <span className="animate-slide-in-right">{item.label}</span>
                        {isActive && (
                          <ChevronRight className="w-4 h-4 ml-auto text-primary-500 animate-bounce" />
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Settings & Logout */}
        <div className="p-4 border-t border-theme-border space-y-1">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              clsx(
                'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                sidebarCollapsed ? 'justify-center px-2 py-3' : 'space-x-3',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
              )
            }
          >
            <div
              className="flex items-center justify-center w-6 h-6"
              data-tooltip-id="sidebar-tooltip"
              data-tooltip-content={!sidebarCollapsed ? undefined : t('nav.settings')}
              data-tooltip-place="right"
            >
              <Settings className="w-5 h-5 text-text-secondary" />
            </div>
            {!sidebarCollapsed && (
              <span className="animate-slide-in-right">{t('nav.settings')}</span>
            )}
          </NavLink>

          <button
            onClick={handleLogout}
            className={clsx(
              'flex items-center w-full px-3 py-2.5 text-left rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200',
              sidebarCollapsed ? 'justify-center px-2 py-3' : 'space-x-3'
            )}
          >
            <div
              className="flex items-center justify-center w-6 h-6"
              data-tooltip-id="sidebar-tooltip"
              data-tooltip-content={!sidebarCollapsed ? undefined : t('nav.logout')}
              data-tooltip-place="right"
            >
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            {!sidebarCollapsed && (
              <span className="animate-slide-in-right">{t('nav.logout')}</span>
            )}
          </button>
        </div>
      </div>
      <Tooltip id="sidebar-tooltip" place="right" effect="solid" />

      {/* Mobile backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-20 bg-black/50 lg:hidden transition-opacity duration-300',
          sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
        onClick={toggleSidebar}
      />
    </>
  );
};

export default Sidebar;
