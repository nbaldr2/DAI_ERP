import { useState, useEffect } from 'react';
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
import api from '../services/api';

const StockManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stockItems, setStockItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Ledger listing state
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerRecords, setLedgerRecords] = useState([]);
  const [filteredLedgerRecords, setFilteredLedgerRecords] = useState([]);
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  const [ledgerDateRange, setLedgerDateRange] = useState('all');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');

  // Mock data for development
  const mockStockData = [
    {
      id: 1,
      name: 'Premium Dates - Medjool',
      sku: 'DT-MDJ-001',
      category: 'Dates',
      quantity: 150,
      unit: 'kg',
      minStock: 50,
      maxStock: 500,
      costPrice: 25.50,
      sellingPrice: 45.00,
      supplier: 'Al Khaleej Dates Co.',
      warehouse: 'Main Warehouse',
      lastUpdated: '2024-01-15T10:30:00Z',
      status: 'in_stock'
    },
    {
      id: 2,
      name: 'Organic Almonds',
      sku: 'NT-ALM-002',
      category: 'Nuts',
      quantity: 25,
      unit: 'kg',
      minStock: 30,
      maxStock: 200,
      costPrice: 35.00,
      sellingPrice: 55.00,
      supplier: 'Organic Farms Ltd.',
      warehouse: 'Main Warehouse',
      lastUpdated: '2024-01-14T15:45:00Z',
      status: 'low_stock'
    },
    {
      id: 3,
      name: 'Basmati Rice - Premium',
      sku: 'RC-BSM-003',
      category: 'Grains',
      quantity: 0,
      unit: 'kg',
      minStock: 100,
      maxStock: 1000,
      costPrice: 12.50,
      sellingPrice: 18.00,
      supplier: 'Indian Grains Export',
      warehouse: 'Secondary Warehouse',
      lastUpdated: '2024-01-12T09:15:00Z',
      status: 'out_of_stock'
    }
  ];

  useEffect(() => {
    fetchStockData();
  }, []);

  useEffect(() => {
    fetchLedgerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterAndSortItems();
  }, [stockItems, searchTerm, filterStatus, sortField, sortDirection]);

  useEffect(() => {
    filterLedgerRecords();
  }, [ledgerRecords, ledgerSearchTerm, ledgerDateRange, ledgerStartDate, ledgerEndDate]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const response = await api.stock.list();
      setStockItems(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast.error('Failed to fetch stock data');
      // Fallback to mock data if API fails
      setStockItems(mockStockData);
      setLoading(false);
    }
  };

  const filterAndSortItems = () => {
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
  };

  const fetchLedgerData = async () => {
    try {
      setLedgerLoading(true);
      const params = {};
      if (ledgerDateRange && ledgerDateRange !== 'all') params.date_range = ledgerDateRange;
      if (ledgerStartDate) params.start_date = ledgerStartDate;
      if (ledgerEndDate) params.end_date = ledgerEndDate;
      if (ledgerSearchTerm) params.search = ledgerSearchTerm;

      const response = await api.stock.ledgerList(params);
      const data = response.data?.data || [];
      setLedgerRecords(data);
    } catch (error) {
      console.error('Error fetching ledger data:', error);
      toast.error('Failed to fetch inventory ledger');
      setLedgerRecords([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  const filterLedgerRecords = () => {
    let filtered = [...ledgerRecords];

    // Local search on note and product
    if (ledgerSearchTerm) {
      const term = ledgerSearchTerm.toLowerCase();
      filtered = filtered.filter((entry) => {
        const productName = entry.stock_entry?.product?.name_en || entry.stock_entry?.product?.name_ar || '';
        const note = entry.note || '';
        const batch = entry.stock_entry?.batch_number || '';
        return (
          productName.toLowerCase().includes(term) ||
          note.toLowerCase().includes(term) ||
          batch.toLowerCase().includes(term)
        );
      });
    }

    // Local date range filter if custom range is set
    const parseDate = (d) => (d ? new Date(d) : null);
    const start = ledgerStartDate ? parseDate(ledgerStartDate) : null;
    const end = ledgerEndDate ? parseDate(ledgerEndDate) : null;
    if (start || end) {
      filtered = filtered.filter((entry) => {
        const performed = new Date(entry.performed_at);
        if (start && performed < start) return false;
        if (end) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          if (performed > endOfDay) return false;
        }
        return true;
      });
    }

    setFilteredLedgerRecords(filtered);
  };

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
        return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading stock data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-gray-600 mt-1">Manage your inventory and stock levels</p>
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
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stockItems.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {stockItems.filter(item => item.status === 'in_stock').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {stockItems.filter(item => item.status === 'low_stock').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {stockItems.filter(item => item.status === 'out_of_stock').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Product
                    <ArrowUpDown className="w-4 h-4 ml-1" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center">
                    Quantity
                    <ArrowUpDown className="w-4 h-4 ml-1" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                      <div className="text-xs text-gray-400">{item.category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.quantity} {item.unit}
                    </div>
                    <div className="text-xs text-gray-500">
                      Min: {item.minStock} | Max: {item.maxStock}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>Cost: ${item.costPrice}</div>
                    <div className="text-green-600">Sale: ${item.sellingPrice}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.supplier?.name || '—'}</div>
                    <div className="text-xs text-gray-500">{item.warehouse?.name || '—'}</div>
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
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this item?')) {
                              try {
                                await api.stock.delete(item.id);
                                toast.success('Item deleted successfully');
                                fetchStockData(); // Refresh the list
                              } catch (error) {
                                toast.error('Failed to delete item');
                                console.error('Delete error:', error);
                              }
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
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stock items found</h3>
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first stock item.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Inventory Ledger */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Inventory Ledger</h2>
            <p className="text-sm text-gray-600">View stock movements with date filters</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchLedgerData}
              className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Filter className="w-4 h-4 mr-2" /> Apply Filters
            </button>
          </div>
        </div>

        {/* Ledger Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {ledgerLoading ? (
            <LoadingSpinner message="Loading ledger..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Movement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance After</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLedgerRecords.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.performed_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.stock_entry?.product?.name_en || entry.stock_entry?.product?.name_ar || '—'}
                        <div className="text-xs text-gray-500">
                          Supplier: {entry.stock_entry?.supplier?.name || '—'}
                          <br />
                          Warehouse: {entry.stock_entry?.warehouse?.name || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {entry.movement_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.qty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.balance_after}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.performer?.name || entry.performer?.username || 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!ledgerLoading && filteredLedgerRecords.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No ledger entries match the current filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockManagement;
