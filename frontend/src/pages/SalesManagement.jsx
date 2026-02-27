import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  Plus,
  Filter,
  TrendingUp,
  DollarSign,
  Users,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import toast from 'react-hot-toast';

import SalesCreateModal from './SalesCreateModal';

const SalesManagement = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [stats, setStats] = useState({
    total_sales: 0,
    total_weight_sold: 0,
    total_revenue: 0,
    avg_unit_price: 0,
  });
  const [counts, setCounts] = useState({
    products: 0,
    customers: 0,
    warehouses: 0,
    suppliers: 0,
  });
  const [salesRevenueSummary, setSalesRevenueSummary] = useState({
    by_customer: {},
    by_product: {},
    total_revenue: 0,
    total_weight_sold: 0,
    total_sales: 0,
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? 'Invalid Date'
      : date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
  };

  const fetchSales = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(selectedProductId && { product_id: selectedProductId }),
        ...(selectedCustomerId && { customer_id: selectedCustomerId }),
      };
      const response = await apiService.sales.list(params);
      setSales(response.data?.data || []);
      setPagination(response.data?.pagination || pagination);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Failed to load sales');
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(selectedProductId && { product_id: selectedProductId }),
        ...(selectedCustomerId && { customer_id: selectedCustomerId }),
      };
      const response = await apiService.sales.stats(params);
      setStats(response.data?.data || stats);
    } catch (error) {
      console.error('Error fetching sales stats:', error);
      // no toast needed; keep UI graceful
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [prodRes, custRes] = await Promise.all([
        apiService.products.list({ page: 1, limit: 200 }),
        apiService.customers.list({ page: 1, limit: 200 }),
      ]);
      setProducts(prodRes.data?.data || []);
      setCustomers(custRes.data?.data || []);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const fetchCounts = async () => {
    try {
      const [prodRes, custRes, whRes, supRes] = await Promise.all([
        apiService.products.list({ page: 1, limit: 1 }),
        apiService.customers.list({ page: 1, limit: 1 }),
        apiService.warehouses.list({ page: 1, limit: 1 }),
        apiService.suppliers.list({ page: 1, limit: 1 }),
      ]);
      setCounts({
        products: prodRes.data?.pagination?.total || 0,
        customers: custRes.data?.pagination?.total || 0,
        warehouses: whRes.data?.pagination?.total || 0,
        suppliers: supRes.data?.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const fetchSalesRevenueSummary = async () => {
    try {
      const params = {
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(selectedProductId && { product_id: selectedProductId }),
        ...(selectedCustomerId && { customer_id: selectedCustomerId }),
      };
      const res = await apiService.reports.salesRevenue(params);
      setSalesRevenueSummary(res.data?.data || {
        by_customer: {},
        by_product: {},
        total_revenue: 0,
        total_weight_sold: 0,
        total_sales: 0,
      });
    } catch (error) {
      console.error('Error fetching sales revenue summary:', error);
    }
  };

  useEffect(() => {
    fetchSales(1);
    fetchStats();
    fetchFilterOptions();
    fetchCounts();
    fetchSalesRevenueSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading sales data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sales Management</h1>
          <p className="text-text-secondary mt-1">Manage sales orders and transactions</p>
        </div>
        {hasPermission('sales:create') && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Sale
          </button>
        )}
      </div>

      <SalesCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchSales(1);
          fetchStats();
          fetchCounts();
          fetchSalesRevenueSummary();
        }}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Total Sales</p>
              <p className="text-2xl font-bold text-text-primary">{Number(stats.total_sales || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Revenue</p>
              <p className="text-2xl font-bold text-text-primary">QAR {(parseFloat(stats.total_revenue) || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Total Weight Sold</p>
              <p className="text-2xl font-bold text-text-primary">{(parseFloat(stats.total_weight_sold) || 0).toFixed(2)} kg</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Avg Unit Price</p>
              <p className="text-2xl font-bold text-text-primary">QAR {(parseFloat(stats.avg_unit_price) || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">From Date</label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">To Date</label>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_en || p.name_ar || `#${p.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || `Customer #${c.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={() => {
                fetchSales(1);
                fetchStats();
                fetchCounts();
                fetchSalesRevenueSummary();
              }}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Filter className="w-5 h-5 mr-2" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Reference Counts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Products</p>
              <p className="text-2xl font-bold text-text-primary">{counts.products}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Users className="w-6 h-6 text-pink-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Customers</p>
              <p className="text-2xl font-bold text-text-primary">{counts.customers}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-teal-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-teal-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Warehouses</p>
              <p className="text-2xl font-bold text-text-primary">{counts.warehouses}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Suppliers</p>
              <p className="text-2xl font-bold text-text-primary">{counts.suppliers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-text-primary">Top Products by Revenue</h3>
          </div>
          <div className="p-6">
            {Object.keys(salesRevenueSummary.by_product || {}).length === 0 ? (
              <p className="text-sm text-text-secondary">No product revenue data for selected filters.</p>
            ) : (
              <ul className="space-y-3">
                {Object.values(salesRevenueSummary.by_product)
                  .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
                  .slice(0, 5)
                  .map((p) => (
                    <li key={p.product_id} className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">{p.product_name_en || p.product_name_ar || `Product #${p.product_id}`}</span>
                      <span className="text-sm font-medium text-text-primary">QAR {(parseFloat(p.total_revenue) || 0).toFixed(2)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-text-primary">Top Customers by Revenue</h3>
          </div>
          <div className="p-6">
            {Object.keys(salesRevenueSummary.by_customer || {}).length === 0 ? (
              <p className="text-sm text-text-secondary">No customer revenue data for selected filters.</p>
            ) : (
              <ul className="space-y-3">
                {Object.values(salesRevenueSummary.by_customer)
                  .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
                  .slice(0, 5)
                  .map((c) => (
                    <li key={c.customer_id} className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">{c.customer_name || `Customer #${c.customer_id}`}</span>
                      <span className="text-sm font-medium text-text-primary">QAR {(parseFloat(c.total_revenue) || 0).toFixed(2)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
        {sales.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No sales found</h3>
            <p className="text-text-secondary">Try adjusting filters or add a new sale.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Warehouse</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme-border">
                  {sales.map((sale) => {
                    const product = sale?.stock_entry?.product;
                    const warehouse = sale?.stock_entry?.warehouse;
                    const productName = product?.name_en || product?.name_ar || 'Unknown';
                    const unit = product?.unit || 'kg';
                    return (
                      <tr key={sale.id} className="hover:bg-card-hover">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{sale.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{productName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{sale?.customer?.name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{(parseFloat(sale.sold_weight) || 0).toFixed(2)} {unit}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">QAR {(parseFloat(sale.unit_price) || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">QAR {(parseFloat(sale.total_amount) || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{formatDate(sale.sale_date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{warehouse?.name || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-background flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Page {pagination.page} of {pagination.totalPages} — Total {pagination.total}
              </p>
              <div className="space-x-2">
                <button
                  onClick={() => fetchSales(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchSales(Math.min(pagination.totalPages, pagination.page + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SalesManagement;
