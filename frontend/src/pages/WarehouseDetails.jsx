import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building, Package, ArrowLeft, Calendar, AlertTriangle, CheckCircle, FileText, Search, Filter } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import { toast } from 'react-hot-toast';

const WarehouseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [warehouse, setWarehouse] = useState(null);
  const [stockEntries, setStockEntries] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState({}); // Track which entries are being updated
  
  // Filter states
  const [filters, setFilters] = useState({
    searchTerm: '',
    category: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchWarehouseDetails();
  }, [id]);

  const fetchWarehouseDetails = async () => {
    try {
      setLoading(true);
      const [warehouseResponse, stockEntriesResponse] = await Promise.all([
        apiService.warehouses.get(id),
        apiService.warehouses.getProducts(id)
      ]);
      setWarehouse(warehouseResponse.data);
      setStockEntries(stockEntriesResponse.data.data || []);
    } catch (error) {
      console.error('Error fetching warehouse details:', error);
      toast.error('Failed to fetch warehouse details');
      setWarehouse(null);
      setStockEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'quarantine':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'received':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inspected':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isNearExpiry = (expiryDate, days = 7) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days && diffDays >= 0;
  };

  const isExpired = (expiryDate) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const handleStatusChange = async (entryId, newStatus) => {
    try {
      // Set loading state for this entry
      setUpdatingStatus(prev => ({ ...prev, [entryId]: true }));
      
      // Get the current entry to get its version
      const entry = stockEntries.find(e => e.id === entryId);
      
      // Update the stock entry status
      const response = await apiService.stock.update(entryId, {
        status: newStatus,
        version: entry.version // Include version for optimistic locking
      });
      
      // Update the local state with the new data
      setStockEntries(prevEntries => 
        prevEntries.map(entry => 
          entry.id === entryId 
            ? { ...entry, status: newStatus, version: response.data.data.version } 
            : entry
        )
      );
      
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      // Remove loading state for this entry
      setUpdatingStatus(prev => ({ ...prev, [entryId]: false }));
    }
  };

  // Filter the stock entries based on filter criteria
  const filteredStockEntries = useMemo(() => {
    return stockEntries.filter(entry => {
      // Search term filter (purchase order number)
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        const productName = entry.product?.name_en || entry.product?.name_ar || '';
        const productCategory = entry.product?.category || '';
        const purchaseOrder = entry.purchase?.po_number || '';
        if (!productName.toLowerCase().includes(searchTerm) && 
            !productCategory.toLowerCase().includes(searchTerm) &&
            !purchaseOrder.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }
      
      // Category filter
      if (filters.category && entry.product?.category !== filters.category) {
        return false;
      }
      
      // Status filter
      if (filters.status && entry.status !== filters.status) {
        return false;
      }
      
      // Date range filter
      if (filters.dateFrom) {
        const entryDate = new Date(entry.date_in);
        const fromDate = new Date(filters.dateFrom);
        if (entryDate < fromDate) {
          return false;
        }
      }
      
      if (filters.dateTo) {
        const entryDate = new Date(entry.date_in);
        const toDate = new Date(filters.dateTo);
        if (entryDate > toDate) {
          return false;
        }
      }
      
      return true;
    });
  }, [stockEntries, filters]);

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(stockEntries.map(entry => entry.product?.category).filter(Boolean))];
    return uniqueCategories;
  }, [stockEntries]);

  // Get unique statuses for filter dropdown
  const statuses = useMemo(() => {
    const uniqueStatuses = [...new Set(stockEntries.map(entry => entry.status))];
    return uniqueStatuses;
  }, [stockEntries]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      category: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading warehouse details..." />;
  }

  if (!warehouse) {
    return (
      <div className="text-center py-12">
        <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Warehouse not found</h3>
        <p className="text-gray-500">
          The warehouse you are looking for does not exist.
        </p>
        <button 
          onClick={() => navigate('/warehouses')}
          className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Warehouses
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/warehouses')}
          className="text-primary-600 hover:text-primary-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{warehouse.name}</h1>
          <p className="text-gray-600 mt-1">{warehouse.location || 'No location specified'}</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stockEntries.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {stockEntries.filter(entry => entry.status === 'COMPLETED').length}
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
              <p className="text-sm font-medium text-gray-600">Near Expiry</p>
              <p className="text-2xl font-bold text-gray-900">
                {stockEntries.filter(entry => isNearExpiry(entry.expiry_date)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900"></h2>
         </div>
        
 
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Product name..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            {/* Date From Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            {/* Date To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        
        
        {/* Active Filters Display */}
        {(filters.searchTerm || filters.category || filters.status || filters.dateFrom || filters.dateTo) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {filters.searchTerm && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: {filters.searchTerm}
              </span>
            )}
            {filters.category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Category: {filters.category}
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Status: {filters.status}
              </span>
            )}
            {filters.dateFrom && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                From: {filters.dateFrom}
              </span>
            )}
            {filters.dateTo && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                To: {filters.dateTo}
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Products in Warehouse</h2>
          <div className="text-sm text-gray-500">
            Showing {filteredStockEntries.length} of {stockEntries.length} products
          </div>
        </div>
        {filteredStockEntries.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">
              {stockEntries.length === 0 
                ? 'This warehouse does not have any products yet.' 
                : 'No products match the current filters.'}
            </p>
            {(filters.searchTerm || filters.category || filters.status || filters.dateFrom || filters.dateTo) && (
              <button onClick={clearFilters} className="text-sm text-red-600 hover:text-red-800">
                Clear all
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pallets / <br />Weight (kg)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStockEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.product?.name_en && entry.product?.name_ar
                          ? `${entry.product.name_en} - ${entry.product.name_ar}`
                          : entry.product?.name_en || entry.product?.name_ar || 'Unknown Product'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {entry.product?.origin ? `${entry.product.origin}` : ''}
                        {entry.product?.category ? ` - ${entry.product.category}` : ''}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.product?.category || 'N/A'}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.purchase ? (
                        <Link to={`/purchases/${entry.purchase.id}`} className="inline-flex items-center text-primary-600 hover:underline">
                          <FileText className="w-4 h-4 mr-1" />
                          {entry.purchase.po_number}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                        {formatDate(entry.date_in)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isExpired(entry.expiry_date) 
                          ? 'bg-red-100 text-red-800' 
                          : isNearExpiry(entry.expiry_date) 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                      }`}>
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(entry.expiry_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={entry.status}
                        onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                        disabled={updatingStatus[entry.id]}
                        className={`px-2 py-1 rounded text-xs font-medium border ${
                          updatingStatus[entry.id] 
                            ? 'bg-gray-100 cursor-not-allowed' 
                            : 'bg-white cursor-pointer'
                        } ${getStatusColor(entry.status)}`}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="RECEIVED">RECEIVED</option>
                        <option value="INSPECTED">INSPECTED</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {entry.pallets} / {parseFloat(entry.total_weight || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseDetails;