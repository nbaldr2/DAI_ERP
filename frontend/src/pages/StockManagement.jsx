import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useStock, useStockLedger, useStockMutation } from '../hooks/queries/useStock';
import debounce from 'lodash.debounce';

const StockManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Ledger state for params
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  // Debounced ledger search handler
  const debouncedLedgerSearch = useMemo(
    () => debounce((value) => {
      setLedgerSearchTerm(value);
    }, 500),
    []
  );

  const handleLedgerSearchChange = (e) => {
    debouncedLedgerSearch(e.target.value);
  };
  const [ledgerDateRange, setLedgerDateRange] = useState('all');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');

  // Stock Query
  const { data: stockResponse, isLoading: stockLoading } = useStock();
  const stockItems = stockResponse?.data || [];

  // Stock Mutations
  const { deleteStock } = useStockMutation();

  // Ledger QueryParams
  const ledgerParams = useMemo(() => {
    const params = {};
    if (ledgerDateRange && ledgerDateRange !== 'all') params.date_range = ledgerDateRange;
    if (ledgerStartDate) params.start_date = ledgerStartDate;
    if (ledgerEndDate) params.end_date = ledgerEndDate;
    if (ledgerSearchTerm) params.search = ledgerSearchTerm;
    return params;
  }, [ledgerDateRange, ledgerStartDate, ledgerEndDate, ledgerSearchTerm]);

  const { data: ledgerResponse, isLoading: ledgerLoading } = useStockLedger(ledgerParams);
  const ledgerRecords = ledgerResponse?.data || [];

  // Local state for stock filtering/sorting
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Filter and Sort Stock Items
  useEffect(() => {
    if (!stockItems) return;

    let filtered = [...stockItems];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredItems(filtered);
  }, [stockItems, searchTerm, filterStatus, sortField, sortDirection]);




  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-card-hover text-text-primary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'in_stock':
        return <TrendingUp className="w-4 h-4" />;
      case 'low_stock':
        return <AlertTriangle className="w-4 h-4" />;
      case 'out_of_stock':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  if (stockLoading) {
    return <LoadingSpinner fullScreen message="Loading stock data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Stock Management</h1>
          <p className="text-text-secondary mt-1">Manage your inventory and stock levels</p>
        </div>
        {hasPermission('stock:create') && (
          <button
            onClick={() => navigate('/stock/new')}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Item
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Total Items</p>
              <p className="text-2xl font-bold text-text-primary">{stockItems.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">In Stock</p>
              <p className="text-2xl font-bold text-text-primary">
                {stockItems.filter(item => item.status === 'in_stock').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Low Stock</p>
              <p className="text-2xl font-bold text-text-primary">
                {stockItems.filter(item => item.status === 'low_stock').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Out of Stock</p>
              <p className="text-2xl font-bold text-text-primary">
                {stockItems.filter(item => item.status === 'out_of_stock').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-card rounded-lg p-6 shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-theme-border">
            <thead className="bg-background">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-card-hover"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Product
                    <ArrowUpDown className="w-4 h-4 ml-1" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-card-hover"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center">
                    Quantity
                    <ArrowUpDown className="w-4 h-4 ml-1" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-theme-border">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-card-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-text-primary">{item.name}</div>
                      <div className="text-sm text-text-secondary">SKU: {item.sku}</div>
                      <div className="text-xs text-text-secondary">{item.category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-text-primary">
                      {item.quantity} {item.unit}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Min: {item.minStock} | Max: {item.maxStock}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    <div>Cost: ${item.costPrice}</div>
                    <div className="text-green-600">Sale: ${item.sellingPrice}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-text-primary">{item.supplier?.name || '—'}</div>
                    <div className="text-xs text-text-secondary">{item.warehouse?.name || '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => navigate(`/stock/${item.id}`)}
                        className="text-primary-600 hover:text-primary-700 p-1 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {hasPermission('stock:update') && (
                        <button
                          onClick={() => navigate(`/stock/${item.id}/edit`)}
                          className="text-blue-600 hover:text-blue-700 p-1 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('stock:delete') && (
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this item?')) {
                              deleteStock(item.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 p-1 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No stock items found</h3>
            <p className="text-text-secondary">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first stock item.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Inventory Ledger */}
      <div className="bg-card rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Inventory Ledger</h2>
            <p className="text-sm text-text-secondary">View stock movements with date filters</p>
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Filter className="w-4 h-4 mr-2" /> Apply Filters
            </button>
          </div>
        </div>

        {/* Ledger Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search product, note, batch..."
              value={ledgerSearchTerm}
              onChange={(e) => setLedgerSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <select
              value={ledgerDateRange}
              onChange={(e) => setLedgerDateRange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">This month</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={ledgerStartDate}
              onChange={(e) => setLedgerStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <input
              type="date"
              value={ledgerEndDate}
              onChange={(e) => setLedgerEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
          {ledgerLoading ? (
            <LoadingSpinner message="Loading ledger..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-theme-border">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Movement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Balance After</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Performed By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Note</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme-border">
                  {ledgerRecords.map((entry) => (
                    <tr key={entry.id} className="hover:bg-card-hover">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {new Date(entry.performed_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {entry.stock_entry?.product?.name_en || entry.stock_entry?.product?.name_ar || '—'}
                        <div className="text-xs text-text-secondary">
                          Supplier: {entry.stock_entry?.supplier?.name || '—'}
                          <br />
                          Warehouse: {entry.stock_entry?.warehouse?.name || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-card-hover text-text-primary">
                          {entry.movement_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {entry.qty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {entry.balance_after}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {entry.performer?.name || entry.performer?.username || 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {entry.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!ledgerLoading && ledgerRecords.length === 0 && (
            <div className="text-center py-8">
              <p className="text-text-secondary">No ledger entries match the current filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockManagement;
