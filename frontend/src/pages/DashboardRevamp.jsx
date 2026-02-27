import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Package,
    Activity,
    ArrowRight,
    Clock,
    Calendar,
    Users,
    FileText,
    AlertTriangle,
    BarChart3,
    Wallet,
    Receipt,
    ClipboardList,
    Truck,
    Box,
    Store,
    CreditCard
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { clsx } from 'clsx';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);

const DashboardRevamp = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [expiringStock, setExpiringStock] = useState([]);
    const [criticalAlerts, setCriticalAlerts] = useState({ overdue_invoices: [], low_stock: [] });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, activityRes, chartsRes, expiryRes, alertsRes] = await Promise.allSettled([
                api.get('/dashboard/stats'),
                api.get('/dashboard/activity'),
                api.get('/dashboard/charts'),
                api.get('/dashboard/expiring-stock'),
                api.get('/dashboard/alerts')
            ]);

            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
            if (activityRes.status === 'fulfilled') setRecentActivity(activityRes.value.data.data);
            if (chartsRes.status === 'fulfilled') setChartData(chartsRes.value.data.data);
            if (expiryRes.status === 'fulfilled') setExpiringStock(expiryRes.value.data.data);
            if (alertsRes.status === 'fulfilled') setCriticalAlerts(alertsRes.value.data.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading dashboard..." />;
    }

    // --- Chart Configurations ---
    const revenueChartData = {
        labels: chartData?.revenueVsExpenses?.labels || [],
        datasets: [
            {
                label: 'Revenue',
                data: chartData?.revenueVsExpenses?.revenue || [],
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Expenses',
                data: chartData?.revenueVsExpenses?.expenses || [],
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Waste',
                data: chartData?.revenueVsExpenses?.waste || [],
                borderColor: 'rgb(100, 116, 139)',
                backgroundColor: 'rgba(100, 116, 139, 0.1)',
                fill: true,
                tension: 0.4,
                borderDash: [5, 5]
            }
        ]
    };

    const revenueChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', align: 'end' },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
            x: { grid: { display: false } }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
    };

    const productChartData = {
        labels: chartData?.topProducts?.labels || [],
        datasets: [
            {
                label: 'Sales Volume (kg)',
                data: chartData?.topProducts?.data || [],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)'
                ],
                borderRadius: 6
            }
        ]
    };

    const productChartOptions = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } }
    };

    const hasProductData = chartData?.topProducts?.labels?.length > 0;

    // --- Helper Components ---
    const KPICard = ({ title, value, growth, isPositive, icon: Icon, color, subtitle, onClick }) => (
        <div
            className={clsx(
                "relative overflow-hidden bg-card/60 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.08)] transition-all duration-300 group",
                onClick && "cursor-pointer hover:-translate-y-1"
            )}
            onClick={onClick}
        >
            {/* Decorative background blob */}
            <div className={clsx(
                "absolute -right-6 -top-6 w-28 h-28 rounded-full mix-blend-multiply filter blur-2xl opacity-40 transition-transform duration-700 group-hover:scale-150 group-hover:opacity-60",
                color === 'emerald' ? 'bg-emerald-300' :
                    color === 'blue' ? 'bg-blue-300' :
                        color === 'violet' ? 'bg-violet-300' :
                            color === 'orange' ? 'bg-orange-300' :
                                color === 'rose' ? 'bg-rose-300' :
                                    color === 'cyan' ? 'bg-cyan-300' :
                                        color === 'amber' ? 'bg-amber-300' :
                                            'bg-indigo-300'
            )} />

            <div className="relative z-10 flex justify-between items-start mb-6">
                <div className={clsx(
                    `p-3.5 rounded-2xl transition-colors shadow-sm`,
                    color === 'emerald' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white' :
                        color === 'blue' ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white' :
                            color === 'violet' ? 'bg-gradient-to-br from-violet-400 to-violet-600 text-white' :
                                color === 'orange' ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                                    color === 'rose' ? 'bg-gradient-to-br from-rose-400 to-rose-600 text-white' :
                                        color === 'cyan' ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 text-white' :
                                            color === 'amber' ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' :
                                                'bg-gradient-to-br from-indigo-400 to-indigo-600 text-white'
                )}>
                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                </div>
                {growth !== undefined && (
                    <div className={clsx(
                        "flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-md border border-white/50",
                        isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    )}>
                        {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                        {Math.abs(growth).toFixed(1)}%
                    </div>
                )}
            </div>
            <div className="relative z-10">
                <h3 className="text-text-secondary text-xs font-bold mb-1.5 uppercase tracking-widest">{title}</h3>
                <div className="text-2xl font-black text-text-primary tracking-tight group-hover:scale-105 transition-transform origin-left">
                    {value}
                </div>
                {subtitle && <p className="text-sm font-medium text-text-secondary mt-1.5">{subtitle}</p>}
            </div>
        </div>
    );

    const ActivityItem = ({ item }) => {
        const getIcon = (type) => {
            switch (type) {
                case 'SALE': return <ShoppingCart className="w-4 h-4 text-blue-500" />;
                case 'INVOICE': return <FileText className="w-4 h-4 text-violet-500" />;
                case 'STOCK': return <Package className="w-4 h-4 text-emerald-500" />;
                default: return <Activity className="w-4 h-4 text-text-secondary" />;
            }
        };

        return (
            <div className="flex items-start space-x-3 p-3 hover:bg-card-hover rounded-xl transition-colors cursor-default">
                <div className="mt-1 p-2 bg-card-hover rounded-lg">
                    {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                    <p className="text-xs text-text-secondary truncate">{item.description}</p>
                    <div className="flex items-center mt-1 text-xs text-text-secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(item.timestamp), 'MMM dd, HH:mm')} by {item.user}
                    </div>
                </div>
                {item.amount && (
                    <div className="text-sm font-semibold text-text-primary">
                        {parseFloat(item.amount).toLocaleString()} QAR
                    </div>
                )}
            </div>
        );
    };

    // Quick Nav button config
    const quickActions = [
        { label: 'New Invoice', icon: FileText, path: '/invoices/create', color: 'from-blue-500 to-blue-600' },
        { label: 'New Sale', icon: ShoppingCart, path: '/sales', color: 'from-emerald-500 to-emerald-600' },
        { label: 'Add Stock', icon: Package, path: '/stock', color: 'from-violet-500 to-violet-600' },
        { label: 'Add Customer', icon: Users, path: '/customers', color: 'from-cyan-500 to-cyan-600' },
        { label: 'New Purchase', icon: Truck, path: '/purchases/create', color: 'from-amber-500 to-amber-600' },
        { label: 'Expenses', icon: Wallet, path: '/expenses', color: 'from-rose-500 to-rose-600' },
        { label: 'Quotations', icon: ClipboardList, path: '/quotations', color: 'from-indigo-500 to-indigo-600' },
        { label: 'Reports', icon: BarChart3, path: '/reports', color: 'from-slate-500 to-slate-600' },
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-12 bg-slate-50/30 p-2 sm:p-4 rounded-3xl">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0A0F1C] text-white shadow-2xl p-8 lg:p-12 border border-white/5">
                <div className="absolute top-0 right-0 -mt-32 -mr-32 w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob"></div>
                <div className="absolute bottom-0 left-0 -mb-32 -ml-32 w-96 h-96 bg-violet-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-2">
                            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.name}
                        </h1>
                        <p className="text-text-secondary text-base lg:text-lg max-w-xl">
                            Here's what's happening in your business today.
                            {stats?.pending_orders?.value > 0 && (
                                <> You have <span className="text-white font-semibold">{stats.pending_orders.value} pending invoices</span> to review.</>
                            )}
                            {expiringStock.length > 0 && (
                                <> <span className="text-amber-400 font-semibold">{expiringStock.length} items</span> are near expiry.</>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-4 bg-card/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                        <div className="text-right">
                            <div className="text-2xl font-bold font-mono">{format(new Date(), 'HH:mm')}</div>
                            <div className="text-sm text-text-secondary">{format(new Date(), 'EEEE, MMM dd, yyyy')}</div>
                        </div>
                        <Calendar className="w-10 h-10 text-emerald-400" />
                    </div>
                </div>
            </div>

            {/* KPI Grid - 3 rows of 4 for total 12 main KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <KPICard
                    title="Total Revenue"
                    value={`${(stats?.revenue?.value || 0).toLocaleString()} QAR`}
                    growth={stats?.revenue?.growth}
                    isPositive={stats?.revenue?.isPositive}
                    icon={DollarSign}
                    color="emerald"
                    subtitle="vs. last month"
                />
                <KPICard
                    title="Gross Profit"
                    value={`${(stats?.profit?.value || 0).toLocaleString()} QAR`}
                    growth={stats?.profit?.growth}
                    isPositive={stats?.profit?.isPositive}
                    icon={TrendingUp}
                    color="cyan"
                    subtitle="vs. last month"
                />
                <KPICard
                    title="Today's B2B Sales"
                    value={`${(stats?.today_sales?.value || 0).toLocaleString()} QAR`}
                    growth={stats?.today_sales?.growth}
                    isPositive={stats?.today_sales?.isPositive}
                    icon={Receipt}
                    color="indigo"
                    subtitle="vs. yesterday"
                    onClick={() => navigate('/sales')}
                />
                <KPICard
                    title="POS Sales Today"
                    value={`${(stats?.pos_today_sales?.value || 0).toLocaleString()} QAR`}
                    isPositive={stats?.pos_today_sales?.isPositive}
                    icon={CreditCard}
                    color="violet"
                    subtitle="retail cash/card"
                    onClick={() => navigate('/pos/dashboard')}
                />
                <KPICard
                    title="Active POS Sessions"
                    value={stats?.pos_active_sessions?.value || 0}
                    isPositive={stats?.pos_active_sessions?.isPositive}
                    icon={Store}
                    color="blue"
                    subtitle="registers currently open"
                    onClick={() => navigate('/pos/dashboard')}
                />
                <KPICard
                    title="Pending Invoices"
                    value={stats?.pending_orders?.value || 0}
                    growth={stats?.pending_orders?.growth}
                    isPositive={stats?.pending_orders?.isPositive}
                    icon={FileText}
                    color="orange"
                    subtitle="vs. last month"
                    onClick={() => navigate('/invoices')}
                />
                <KPICard
                    title="Unpaid Invoices"
                    value={stats?.unpaid_invoices?.value || 0}
                    isPositive={stats?.unpaid_invoices?.isPositive}
                    icon={FileText}
                    color={stats?.unpaid_invoices?.value > 0 ? 'rose' : 'emerald'}
                    subtitle={`${(stats?.unpaid_invoices?.totalValue || 0).toLocaleString()} QAR Pending`}
                    onClick={() => navigate('/invoices')}
                />
                <KPICard
                    title="Total Expenses"
                    value={`${(stats?.expenses?.value || 0).toLocaleString()} QAR`}
                    growth={stats?.expenses?.growth}
                    isPositive={stats?.expenses?.isPositive}
                    icon={Wallet}
                    color="amber"
                    subtitle="vs. last month"
                    onClick={() => navigate('/expenses')}
                />
                <KPICard
                    title="Total Customers"
                    value={stats?.customers?.value || 0}
                    growth={stats?.customers?.growth}
                    isPositive={stats?.customers?.isPositive}
                    icon={Users}
                    color="blue"
                    subtitle="new this month"
                    onClick={() => navigate('/customers')}
                />
                <KPICard
                    title="Total Stock"
                    value={`${parseFloat(stats?.total_stock?.value || 0).toLocaleString()} kg`}
                    icon={Box}
                    color="amber"
                    subtitle="active warehouse inventory"
                    onClick={() => navigate('/stock')}
                />
                <KPICard
                    title="Low Stock Alerts"
                    value={stats?.low_stock?.value || 0}
                    isPositive={stats?.low_stock?.isPositive}
                    icon={AlertTriangle}
                    color={stats?.low_stock?.value > 0 ? 'rose' : 'emerald'}
                    subtitle="items <= min quantity"
                    onClick={() => navigate('/stock/inventory')}
                />
                <KPICard
                    title="Monthly Waste"
                    value={`${parseFloat(stats?.waste?.value || 0).toLocaleString()} kg`}
                    growth={stats?.waste?.growth}
                    isPositive={stats?.waste?.isPositive}
                    icon={TrendingDown}
                    color="slate"
                    subtitle="vs. last month"
                    onClick={() => navigate('/waste')}
                />
            </div>

            {/* Critical Alerts Dashboard */}
            {(criticalAlerts.overdue_invoices.length > 0 || criticalAlerts.low_stock.length > 0) && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-text-primary">Critical Alerts</h3>
                                <p className="text-sm text-text-secondary">Requires immediate attention</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Overdue Invoices List */}
                        {criticalAlerts.overdue_invoices.length > 0 && (
                            <div className="bg-card/80 rounded-xl border border-red-100 p-4">
                                <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center">
                                    <FileText className="w-4 h-4 mr-2 text-rose-500" />
                                    Overdue Invoices ({criticalAlerts.overdue_invoices.length})
                                </h4>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                    {criticalAlerts.overdue_invoices.map(inv => (
                                        <div key={inv.id} className="flex items-center justify-between p-2 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" onClick={() => navigate('/invoices')}>
                                            <div>
                                                <p className="text-sm font-medium text-text-primary">{inv.title}</p>
                                                <p className="text-xs text-text-secondary">{inv.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-red-600">{(parseFloat(inv.amount)).toLocaleString()} QAR</p>
                                                <p className="text-xs font-semibold text-red-500">{inv.days_overdue} days overdue</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Low Stock List */}
                        {criticalAlerts.low_stock.length > 0 && (
                            <div className="bg-card/80 rounded-xl border border-amber-100 p-4">
                                <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center">
                                    <Box className="w-4 h-4 mr-2 text-amber-500" />
                                    Low Stock Alerts ({criticalAlerts.low_stock.length})
                                </h4>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                    {criticalAlerts.low_stock.map(stock => (
                                        <div key={stock.id} className="flex items-center justify-between p-2 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer" onClick={() => navigate('/stock/inventory')}>
                                            <div>
                                                <p className="text-sm font-medium text-text-primary">{stock.title}</p>
                                                <p className="text-xs text-text-secondary">{stock.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-bold ${stock.amount === 0 ? 'text-red-600' : 'text-amber-600'}`}>{stock.amount} kg left</p>
                                                <p className={`text-xs font-semibold ${stock.amount === 0 ? 'text-red-500' : 'text-amber-500'}`}>{stock.urgency}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Near-Expiry Alert Banner */}
            {expiringStock.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-text-primary">Near-Expiry Stock Alerts</h3>
                                <p className="text-sm text-text-secondary">{expiringStock.length} items expiring within 7 days</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-700 hover:bg-amber-100"
                            onClick={() => navigate('/stock/inventory')}
                        >
                            View All <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {expiringStock.slice(0, 6).map(item => (
                            <div
                                key={item.id}
                                className={clsx(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                                    item.urgency === 'critical'
                                        ? 'bg-red-50 border-red-200'
                                        : item.urgency === 'warning'
                                            ? 'bg-amber-50 border-amber-200'
                                            : 'bg-card border-theme-border'
                                )}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                                    item.urgency === 'critical'
                                        ? 'bg-red-100 text-red-700'
                                        : item.urgency === 'warning'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-blue-100 text-blue-700'
                                )}>
                                    {item.days_remaining}d
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-text-primary truncate">{item.product_name}</p>
                                    <p className="text-xs text-text-secondary">{item.weight} kg • {item.warehouse}</p>
                                </div>
                                <div className="text-xs text-text-secondary">{format(new Date(item.expiry_date), 'MMM dd')}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts & Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6 h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-text-primary">Revenue Analysis</h2>
                                <p className="text-sm text-text-secondary">Income vs Expenses over last 6 months</p>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            {chartData && <Line data={revenueChartData} options={revenueChartOptions} />}
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Top Selling Products Chart */}
                        <Card className="p-6">
                            <h3 className="text-lg font-bold text-text-primary mb-4">Top Selling Products</h3>
                            <div className="h-[250px] w-full">
                                {hasProductData ? (
                                    <Bar data={productChartData} options={productChartOptions} />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-text-secondary">
                                        <Package className="w-12 h-12 mb-3 text-gray-300" />
                                        <p className="text-sm font-medium">No sales data for the last 30 days</p>
                                        <p className="text-xs mt-1">Products will appear here once sales are recorded</p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Quick Actions */}
                        <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white border-none">
                            <h3 className="text-lg font-bold mb-4">Quick Navigation</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {quickActions.map((action) => (
                                    <button
                                        key={action.path}
                                        onClick={() => navigate(action.path)}
                                        className="p-3 bg-card/10 hover:bg-card/20 rounded-xl transition-all text-left group"
                                    >
                                        <div className={clsx("p-1.5 rounded-lg bg-gradient-to-r w-fit mb-2", action.color)}>
                                            <action.icon className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="text-sm font-medium text-gray-200 group-hover:text-white">{action.label}</div>
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Sidebar / Activity Feed */}
                <div className="lg:col-span-1">
                    <Card className="h-[750px] flex flex-col overflow-hidden !p-0">
                        <div className="p-5 border-b border-theme-border flex justify-between items-center bg-card rounded-t-2xl flex-shrink-0">
                            <h2 className="text-lg font-bold text-text-primary">Recent Activity</h2>
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </div>
                        <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1 custom-scrollbar">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((item) => (
                                    <ActivityItem key={item.id} item={item} />
                                ))
                            ) : (
                                <div className="text-center py-10 text-text-secondary">No recent activity</div>
                            )}
                        </div>
                        <div className="p-4 border-t border-theme-border bg-background rounded-b-2xl flex-shrink-0">
                            <Button variant="ghost" className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => navigate('/audit-logs')}>
                                View Full History <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DashboardRevamp;
