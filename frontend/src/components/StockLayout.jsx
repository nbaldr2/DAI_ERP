import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ClipboardList, ArrowRightLeft, History } from 'lucide-react';

const StockLayout = () => {
    const location = useLocation();

    const tabs = [
        { name: 'Dashboard', path: '/stock/dashboard', icon: LayoutDashboard },
        { name: 'Inventory', path: '/stock/inventory', icon: Package },
        { name: 'Adjustments', path: '/stock/adjustments', icon: ClipboardList },
        { name: 'Transfers', path: '/stock/transfers', icon: ArrowRightLeft },
        { name: 'Ledger', path: '/stock/ledger', icon: History },
    ];

    return (
        <div className="space-y-6">
            {/* Stock Navigation */}
            <div className="bg-card rounded-lg shadow-sm border p-2">
                <nav className="flex space-x-2 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = location.pathname.startsWith(tab.path);

                        return (
                            <Link
                                key={tab.path}
                                to={tab.path}
                                className={`
                  flex items-center px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors
                  ${isActive
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'}
                `}
                            >
                                <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-primary-600' : 'text-text-secondary'}`} />
                                {tab.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Main Content */}
            <Outlet />
        </div>
    );
};

export default StockLayout;
