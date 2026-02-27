import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign,
  Trash2,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Clock,
  Database,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { format, isValid } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const { t } = useTranslation();

  // Helper function to safely format dates
  const safeFormatDate = (dateString, formatStr = 'MMM dd, yyyy') => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isValid(date) ? format(date, formatStr) : 'Invalid Date';
  };
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('month');
  
  // Build backend-friendly date range params
  const buildDateParams = (range) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let start;
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // today

    switch (range) {
      case 'week': {
        const day = end.getDay();
        // Assume week starts on Sunday (0). To start on Monday, use ((day + 6) % 7)
        const diff = day; // Sunday start
        start = new Date(end);
        start.setDate(end.getDate() - diff);
        break;
      }
      case 'month': {
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      }
      case 'quarter': {
        const quarterStartMonth = Math.floor(end.getMonth() / 3) * 3; // 0,3,6,9
        start = new Date(end.getFullYear(), quarterStartMonth, 1);
        break;
      }
      case 'year': {
        start = new Date(end.getFullYear(), 0, 1);
        break;
      }
      default: {
        // No filter
        return {};
      }
    }

    return { date_from: fmt(start), date_to: fmt(end) };
  };

  // Report data states
  const [stockSummary, setStockSummary] = useState(null);
  const [salesRevenue, setSalesRevenue] = useState(null);
  const [invoiceRevenue, setInvoiceRevenue] = useState(null);
  const [wasteAnalysis, setWasteAnalysis] = useState(null);
  const [nearExpiry, setNearExpiry] = useState([]);
  const [inventoryValuation, setInventoryValuation] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const dateParams = buildDateParams(dateRange);
      const [stockResp, salesResp, invoiceResp, wasteResp, expiryResp, valuationResp] = await Promise.all([
        apiService.reports.stockSummary(),
        apiService.reports.salesRevenue(dateParams),
        apiService.reports.invoiceRevenue(dateParams),
        apiService.reports.wasteAnalysis(dateParams),
        apiService.reports.nearExpiry(),
        apiService.reports.inventoryValuation()
      ]);

      setStockSummary(stockResp.data.data);
      setSalesRevenue(salesResp.data.data);
      setInvoiceRevenue(invoiceResp.data.data);
      setWasteAnalysis(wasteResp.data.data);
      setNearExpiry(expiryResp.data.data || []);
      setInventoryValuation(valuationResp.data.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = (reportType) => {
    toast(`Export ${reportType} feature coming soon`);
  };

  const handleExportTable = async (tableName) => {
    try {
      setExportingTable(tableName);
      const response = await apiService.export.table(tableName, { responseType: 'blob' });

      // Try to extract filename from Content-Disposition header
      const disposition = response.headers?.['content-disposition'];
      let filename = `${tableName}.csv`;
      if (disposition) {
        const match = /filename="?([^";]+)"?/i.exec(disposition);
        if (match && match[1]) filename = match[1];
      }

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${tableName} to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.response?.data?.message || 'Failed to export table');
    } finally {
      setExportingTable(null);
    }
  };

  const [exportTables, setExportTables] = useState([
    { id: 'invoices', name: 'Invoices', icon: FileText },
    { id: 'invoice_items', name: 'Invoice Items', icon: FileText },
    { id: 'purchases', name: 'Purchases', icon: FileText },
    { id: 'purchase_items', name: 'Purchase Items', icon: FileText },
    { id: 'products', name: 'Products', icon: FileText },
    { id: 'customers', name: 'Customers', icon: FileText },
    { id: 'suppliers', name: 'Suppliers', icon: FileText },
    { id: 'stock_entries', name: 'Stock Entries', icon: FileText },
    { id: 'warehouses', name: 'Warehouses', icon: FileText },
    { id: 'waste_damages', name: 'Waste Damages', icon: FileText },
    { id: 'users', name: 'Users', icon: FileText },
    { id: 'audit_logs', name: 'Audit Logs', icon: FileText },
    { id: 'inventory_ledgers', name: 'Inventory Ledgers', icon: FileText },
    { id: 'attachments', name: 'Attachments', icon: FileText },
    { id: 'sales', name: 'Sales', icon: FileText }
  ]);

  const [exportingTable, setExportingTable] = useState(null);

  // Chart configurations
  const salesChartData = (() => {
    const byProduct = salesRevenue?.by_product?.length
      ? salesRevenue.by_product
      : invoiceRevenue?.by_product?.length
        ? invoiceRevenue.by_product
        : null;
    if (!byProduct) return null;
    return {
      labels: byProduct.map(p => p.product_name_en || p.product_name_ar || 'Unknown'),
      datasets: [
        {
          label: 'Revenue (QAR)',
          data: byProduct.map(p => parseFloat(p.total_revenue || p.total_amount || 0)),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
        },
      ],
    };
  })();

  const wasteChartData = wasteAnalysis ? {
    labels: wasteAnalysis.by_product?.map(p => p.product_name_en) || [],
    datasets: [
      {
        label: 'Waste (kg)',
        data: wasteAnalysis.by_product?.map(p => p.total_waste_weight) || [],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      },
    ],
  } : null;

  const stockStatusData = stockSummary ? {
    labels: ['Available', 'Sold', 'Waste'],
    datasets: [
      {
        data: [
          parseFloat(stockSummary.total_available_kg || 0),
          parseFloat(stockSummary.total_sold_kg || 0),
          parseFloat(stockSummary.total_waste_kg || 0),
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const tabs = [
    { id: 'overview', label: t('reports.tabs.overview', 'Overview'), icon: BarChart3 },
    { id: 'sales', label: t('reports.tabs.sales', 'Sales'), icon: TrendingUp },
    { id: 'inventory', label: t('reports.tabs.inventory', 'Inventory'), icon: Package },
    { id: 'waste', label: t('reports.tabs.waste', 'Waste'), icon: Trash2 },
    { id: 'alerts', label: t('reports.tabs.alerts', 'Alerts'), icon: AlertTriangle },
    { id: 'export', label: t('reports.tabs.export', 'Export Data'), icon: Database },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t('reports.title', 'Reports & Analytics')}
          </h1>
          <p className="text-text-secondary mt-1">
            {t('reports.subtitle', 'Business intelligence and performance metrics')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="week">{t('common.this_week', 'This Week')}</option>
            <option value="month">{t('common.this_month', 'This Month')}</option>
            <option value="quarter">{t('common.this_quarter', 'This Quarter')}</option>
            <option value="year">{t('common.this_year', 'This Year')}</option>
          </select>
          <Button
            onClick={fetchReports}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-theme-border">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-text-secondary hover:text-text-secondary hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Total Stock</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {stockSummary ? parseFloat(stockSummary.total_stock_kg).toLocaleString() : '0'} kg
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Total Revenue</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {(() => {
                      const val = invoiceRevenue?.total_net ?? invoiceRevenue?.total_revenue ?? salesRevenue?.total_revenue ?? 0;
                      return `QAR ${parseFloat(val || 0).toLocaleString()}`;
                    })()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Total Waste</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {stockSummary ? parseFloat(stockSummary.total_waste_kg).toLocaleString() : '0'} kg
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Near Expiry</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">
                    {nearExpiry.length}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Stock Distribution</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportReport('stock-distribution')}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
              {stockStatusData && (
                <div className="h-64">
                  <Doughnut data={stockStatusData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Sales by Product</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportReport('sales-by-product')}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
              {salesChartData && (
                <div className="h-64">
                  <Bar data={salesChartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Sales Tab */}
      {activeTab === 'sales' && (salesRevenue || invoiceRevenue) && (
        <div className="space-y-6">
          {/* Sales Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-text-secondary">Total Sales</p>
                <p className="text-3xl font-bold text-text-primary mt-2">
                  {salesRevenue?.total_sales ?? invoiceRevenue?.total_invoices ?? 0}
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-text-secondary">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {(() => {
                    const val = salesRevenue?.total_revenue ?? invoiceRevenue?.total_net ?? invoiceRevenue?.total_revenue ?? 0;
                    return `QAR ${parseFloat(val || 0).toLocaleString()}`;
                  })()}
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-text-secondary">Weight Sold</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {salesRevenue ? `${parseFloat(salesRevenue.total_weight_sold || 0).toLocaleString()} kg` : '-'}
                </p>
              </div>
            </Card>
          </div>

          {/* Top Customers */}
          <Card>
            <div className="p-6 border-b border-theme-border">
              <h3 className="text-lg font-semibold text-text-primary">Top Customers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Sales Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Total Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme-border">
                  {(salesRevenue?.by_customer || []).map((customer, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                        {customer.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {customer.sales_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {parseFloat(customer.total_weight).toLocaleString()} kg
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        QAR {parseFloat(customer.total_revenue).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6 border-b border-theme-border">
              <h3 className="text-lg font-semibold text-text-primary">Current Stock Levels</h3>
            </div>
            <div className="p-6">
              {inventoryValuation && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-text-secondary">Total Items</p>
                      <p className="text-2xl font-bold text-text-primary">{inventoryValuation.total_items}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-secondary">Total Value</p>
                      <p className="text-2xl font-bold text-green-600">
                        QAR {parseFloat(inventoryValuation.total_value).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Waste Tab */}
      {activeTab === 'waste' && wasteAnalysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-text-secondary">Total Waste Records</p>
                <p className="text-3xl font-bold text-text-primary mt-2">
                  {wasteAnalysis.total_waste_records}
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-text-secondary">Total Waste Weight</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {parseFloat(wasteAnalysis.total_waste_weight).toLocaleString()} kg
                </p>
              </div>
            </Card>
          </div>

          {wasteChartData && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Waste by Product</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportReport('waste-analysis')}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-64">
                <Bar data={wasteChartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6 border-b border-theme-border">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Near Expiry Items
              </h3>
            </div>
            {nearExpiry.length === 0 ? (
              <div className="p-12 text-center">
                <AlertTriangle className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">No alerts</h3>
                <p className="text-text-secondary">All items are within safe expiry periods.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Warehouse</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Available Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Expiry Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Days Left</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-theme-border">
                    {nearExpiry.map((item) => (
                      <tr key={item.id} className="hover:bg-card-hover">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                          {item.product?.name_en} / {item.product?.name_ar}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {item.warehouse?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {item.available_qty} kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {safeFormatDate(item.expiry_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.days_until_expiry <= 1 ? 'bg-red-100 text-red-800' :
                            item.days_until_expiry <= 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {item.days_until_expiry} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6 border-b border-theme-border">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                {t('reports.export.title', 'Database Export')}
              </h3>
              <p className="text-text-secondary mt-1">
                {t('reports.export.subtitle', 'Export database tables to CSV format')}
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exportTables.map((table) => {
                  const Icon = table.icon;
                  return (
                    <Card key={table.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-text-primary">{table.name}</h4>
                            <p className="text-sm text-text-secondary">{table.id}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportTable(table.id)}
                          disabled={exportingTable === table.id}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          {exportingTable === table.id ? 'Exporting…' : t('common.export', 'Export')}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};

export default Reports;
