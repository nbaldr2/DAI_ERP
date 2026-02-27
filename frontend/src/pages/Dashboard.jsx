import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Users,
  Truck,
  ShoppingCart,
  BarChart3,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';
import { format } from 'date-fns';
import { clsx } from 'clsx';
// Import Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [nearExpiry, setNearExpiry] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stockTrends, setStockTrends] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadStockTrends();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [stockResponse, nearExpiryResponse] = await Promise.all([
        api.reports.stockSummary(),
        api.reports.nearExpiry({ days: 7 }),
      ]);

      setStats(stockResponse.data.data);
      setNearExpiry(nearExpiryResponse.data.data || []);

      // Mock recent activity data
      setRecentActivity([
        {
          id: 1,
          type: 'sale',
          title: 'New Sale Created',
          description: 'Sale #1234 - 150kg Tomatoes to Carrefour',
          timestamp: new Date(),
          user: 'Sales Manager',
          icon: ShoppingCart,
          color: 'green'
        },
        {
          id: 2,
          type: 'stock',
          title: 'Stock Received',
          description: 'New batch of Cabbage from Mahshid Mehregan',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          user: 'Warehouse Manager',
          icon: Package,
          color: 'blue'
        },
        {
          id: 3,
          type: 'waste',
          title: 'Waste Recorded',
          description: '5.5kg of Sweet Pepper damaged during transport',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          user: 'Warehouse Manager',
          icon: AlertTriangle,
          color: 'orange'
        }
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStockTrends = async () => {
    try {
      setTrendsLoading(true);
      // Add the stock trends API endpoint
      const response = await api.get('/stock/trends?days=30');
      setStockTrends(response.data.data);
    } catch (error) {
      console.error('Failed to load stock trends:', error);
    } finally {
      setTrendsLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading dashboard..." />;
  }

  // Prepare chart data
  const chartData = {
    labels: stockTrends ? Object.keys(stockTrends).slice(0, 10) : [],
    datasets: stockTrends ? Object.entries(stockTrends).slice(0, 5).map(([productName, data], index) => {
      const colors = [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 205, 86, 0.8)',
        'rgba(153, 102, 255, 0.8)'
      ];

      return {
        label: productName,
        data: data.map(point => point.balance),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('0.8', '0.1'),
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6
      };
    }) : []
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 12
        },
        padding: 10
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function (value) {
            return value + ' kg';
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, onClick, hoverTitle }) => (
    <div title={hoverTitle}>
      <Card
        className="stagger-item relative overflow-hidden group cursor-pointer"
        hoverable
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-secondary mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-text-primary mb-2">{value}</h3>
            {subtitle && (
              <p className="text-sm text-text-secondary">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                {trend > 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={clsx(
                  'text-sm font-medium',
                  trend > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {Math.abs(trend)}%
                </span>
                <span className="text-sm text-text-secondary ml-1">vs last week</span>
              </div>
            )}
          </div>
          <div className={clsx(
            'p-4 rounded-2xl transition-all duration-300 group-hover:scale-110',
            `bg-${color}-100`
          )}>
            <Icon className={clsx('w-8 h-8', `text-${color}-600`)} />
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-green-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </Card>
    </div>
  );

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours === 0) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return format(date, 'MMM dd');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="relative bg-gradient-to-r from-green-500 via-green-600 to-green-700 rounded-3xl p-8 text-white shadow-2xl overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-card/10 rounded-full -translate-y-32 translate-x-32 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-card/5 rounded-full translate-y-24 -translate-x-24 animate-float" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 animate-slide-in-up">
                {t('dashboard.welcome')}, {user?.name}! 👋
              </h1>
              <p className="text-xl text-green-100 animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
                Here's what's happening with your inventory today
              </p>
            </div>
            <div className="hidden lg:flex items-center space-x-4 animate-slide-in-left">
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {format(new Date(), 'MMM dd')}
                </div>
                <div className="text-green-200">
                  {format(new Date(), 'EEEE')}
                </div>
              </div>
              <Calendar className="w-12 h-12 text-primary-200" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('dashboard.totalStock')}
          value={`${parseFloat(stats?.total_stock_kg || 0).toLocaleString()} kg`}
          subtitle="Across all warehouses"
          icon={Package}
          color="blue"
          trend={5.2}
          onClick={() => navigate('/stock')}
          hoverTitle="Open Stock Management"
        />
        <StatCard
          title={t('dashboard.availableStock')}
          value={`${parseFloat(stats?.total_available_kg || 0).toLocaleString()} kg`}
          subtitle="Ready for sale"
          icon={TrendingUp}
          color="green"
          trend={2.1}
          onClick={() => navigate('/stock')}
          hoverTitle="View Available Stock"
        />
        <StatCard
          title={t('dashboard.totalWaste')}
          value={`${parseFloat(stats?.total_waste_kg || 0).toLocaleString()} kg`}
          subtitle="This month"
          icon={AlertTriangle}
          color="orange"
          trend={-1.5}
          onClick={() => navigate('/waste')}
          hoverTitle="Open Waste Management"
        />
        <StatCard
          title={t('dashboard.nearExpiry')}
          value={nearExpiry?.length || 0}
          subtitle="Items expiring soon"
          icon={AlertTriangle}
          color="red"
          onClick={() => navigate('/reports')}
          hoverTitle="View Near-Expiry Report"
        />
      </div>

      {/* Stock Trends Chart */}
      <Card
        title="Stock Trends"
        subtitle="Available quantity by product over time"
        className="stagger-item"
      >
        <div className="h-80">
          {trendsLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p className="text-text-secondary">Loading stock trends...</p>
              </div>
            </div>
          ) : stockTrends && Object.keys(stockTrends).length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-background to-card-hover rounded-xl">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-text-secondary mx-auto mb-4" />
                <p className="text-text-primary font-medium">No stock trend data available</p>
                <p className="text-sm text-text-secondary mt-1">
                  Stock movements will be displayed here
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <Card
          title="Recent Activity"
          subtitle="Latest system updates"
          className="stagger-item h-[500px] flex flex-col overflow-hidden"
        >
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 custom-scrollbar pr-2 -mr-2">
              {Array.isArray(recentActivity) && recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-card-hover transition-colors group"
                  >
                    <div className={clsx(
                      'p-2 rounded-lg group-hover:scale-110 transition-transform',
                      `bg-${activity.color}-100/50`
                    )}>
                      <Icon className={clsx('w-4 h-4', `text-${activity.color}-600`)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary group-hover:text-green-600 transition-colors">
                        {activity.title}
                      </p>
                      <p className="text-sm text-text-secondary truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-text-secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimeAgo(activity.timestamp)}
                        <span className="mx-2">•</span>
                        {activity.user}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-shrink-0 pt-4 mt-auto border-t border-theme-border -mx-6 -mb-6 px-6 pb-6 bg-card-hover rounded-b-xl">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/audit-logs')}
              title="Open Audit Logs"
            >
              View All Activity
            </Button>
          </div>
        </Card>
      </div>

      {/* Near Expiry Alert */}
      {nearExpiry && Array.isArray(nearExpiry) && nearExpiry.length > 0 && (
        <Card
          title="⚠️ Expiry Alerts"
          subtitle={`${nearExpiry.length} items expiring within 7 days`}
          className="stagger-item border-l-4 border-l-orange-500 dark:bg-orange-500/5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearExpiry.slice(0, 6).map((item, index) => (
              <div
                key={item.id || index}
                className="p-4 bg-card rounded-lg border border-theme-border hover:shadow-md transition-all duration-200 group stagger-item"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-text-primary group-hover:text-orange-500 transition-colors">
                      {item.product?.name_en}
                    </h4>
                    <p className="text-sm text-text-secondary">
                      {item.warehouse?.name} • {parseFloat(item.available_qty).toLocaleString()} kg
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={clsx(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium',
                      item.days_until_expiry <= 2
                        ? 'bg-red-100 text-red-800'
                        : item.days_until_expiry <= 5
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                    )}>
                      {item.days_until_expiry}d
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {nearExpiry.length > 6 && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => navigate('/reports')}
                title="Open Near-Expiry Report"
              >
                View All {nearExpiry.length} Items
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Quick Actions */}
      <Card
        title="Quick Actions"
        subtitle="Common tasks"
        className="stagger-item"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-20 flex-col space-y-2"
            icon={Package}
            onClick={() => navigate('/stock')}
            title="Go to Stock Management"
          >
            <span className="font-medium">Add Stock</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col space-y-2"
            icon={ShoppingCart}
            onClick={() => navigate('/sales')}
            title="Go to Sales Management"
          >
            <span className="font-medium">Create Sale</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col space-y-2"
            icon={BarChart3}
            onClick={() => navigate('/reports')}
            title="Open Reports"
          >
            <span className="font-medium">View Reports</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col space-y-2"
            icon={Users}
            onClick={() => navigate('/customers')}
            title="Manage Customers"
          >
            <span className="font-medium">Customers</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;