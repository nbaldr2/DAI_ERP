import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Package,
  Edit,
  Trash2,
  Plus,
  Minus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Building,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import api from '../services/api';

const StockDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stockItem, setStockItem] = useState(null);
  const [stockMovements, setStockMovements] = useState([]);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    type: 'increase',
    quantity: '',
    reason: '',
    notes: ''
  });

  // Mock data for development
  const mockStockData = {
    id: 1,
    name: 'Premium Dates - Medjool',
    sku: 'DT-MDJ-001',
    category: 'Dates',
    description: 'Premium quality Medjool dates sourced from Jordan. Rich in fiber, potassium, and antioxidants.',
    quantity: 150,
    unit: 'kg',
    minStock: 50,
    maxStock: 500,
    costPrice: 25.50,
    sellingPrice: 45.00,
    supplier: 'Al Khaleej Dates Co.',
    warehouse: 'Main Warehouse',
    location: 'A-12-03',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    status: 'in_stock',
    image: null,
    barcode: '1234567890123'
  };

  const mockMovements = [
    {
      id: 1,
      type: 'in',
      quantity: 200,
      previousQuantity: 0,
      newQuantity: 200,
      reason: 'Initial Stock',
      user: 'John Doe',
      date: '2024-01-01T00:00:00Z',
      reference: 'PO-001'
    },
    {
      id: 2,
      type: 'out',
      quantity: 50,
      previousQuantity: 200,
      newQuantity: 150,
      reason: 'Sale',
      user: 'Jane Smith',
      date: '2024-01-15T10:30:00Z',
      reference: 'SO-045'
    }
  ];

  useEffect(() => {
    fetchStockDetails();
    fetchStockMovements();
  }, [id]);

  const fetchStockDetails = async () => {
    try {
      setLoading(true);
      // In a real app, this would be an API call
      // const response = await api.get(`/stock/${id}`);
      // setStockItem(response.data.data);

      // Using mock data for now
      setTimeout(() => {
        setStockItem(mockStockData);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching stock details:', error);
      toast.error('Failed to fetch stock details');
      setLoading(false);
    }
  };

  const fetchStockMovements = async () => {
    try {
      // const response = await api.get(`/stock/${id}/movements`);
      // setStockMovements(response.data.data);

      // Using mock data for now
      setTimeout(() => {
        setStockMovements(mockMovements);
      }, 600);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      setStockMovements(mockMovements);
    }
  };

  const handleStockAdjustment = async (e) => {
    e.preventDefault();
    try {
      const adjustment = {
        ...adjustmentData,
        quantity: parseFloat(adjustmentData.quantity)
      };

      // In a real app, this would be an API call
      // await api.post(`/stock/${id}/adjust`, adjustment);

      toast.success('Stock adjusted successfully');
      setShowAdjustmentModal(false);
      setAdjustmentData({
        type: 'increase',
        quantity: '',
        reason: '',
        notes: ''
      });

      // Refresh data
      fetchStockDetails();
      fetchStockMovements();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading stock details..." />;
  }

  if (!stockItem) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Stock item not found</h3>
        <p className="text-gray-500 mb-4">The requested stock item could not be found.</p>
        <button
          onClick={() => navigate('/stock')}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Stock
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/stock')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{stockItem.name}</h1>
            <p className="text-gray-600">SKU: {stockItem.sku}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {hasPermission('stock:update') && (
            <button
              onClick={() => setShowAdjustmentModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adjust Stock
            </button>
          )}
          {hasPermission('stock:update') && (
            <button
              onClick={() => navigate(`/stock/${id}/edit`)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Stock Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Current Stock</p>
              <p className="text-2xl font-bold text-gray-900">{stockItem.quantity} {stockItem.unit}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Value</p>
              <p className="text-2xl font-bold text-gray-900">${(stockItem.quantity * stockItem.costPrice).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Min Stock</p>
              <p className="text-2xl font-bold text-gray-900">{stockItem.minStock} {stockItem.unit}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Max Stock</p>
              <p className="text-2xl font-bold text-gray-900">{stockItem.maxStock} {stockItem.unit}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Information */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(stockItem.status)}`}>
                {getStatusIcon(stockItem.status)}
                <span className="ml-1 capitalize">{stockItem.status.replace('_', ' ')}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Category:</span>
              <span className="text-gray-900 font-medium">{stockItem.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unit:</span>
              <span className="text-gray-900 font-medium">{stockItem.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Barcode:</span>
              <span className="text-gray-900 font-medium font-mono">{stockItem.barcode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className="text-gray-900 font-medium">{stockItem.location}</span>
            </div>
            {stockItem.description && (
              <div>
                <span className="text-gray-600 block mb-2">Description:</span>
                <p className="text-gray-900 text-sm leading-relaxed">{stockItem.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Pricing & Supplier */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Supplier</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Cost Price:</span>
              <span className="text-gray-900 font-medium">${stockItem.costPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Selling Price:</span>
              <span className="text-green-600 font-medium">${stockItem.sellingPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Profit Margin:</span>
              <span className="text-green-600 font-medium">
                {(((stockItem.sellingPrice - stockItem.costPrice) / stockItem.costPrice) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Supplier:</span>
              <span className="text-gray-900 font-medium">{stockItem.supplier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Warehouse:</span>
              <span className="text-gray-900 font-medium">{stockItem.warehouse}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Updated:</span>
              <span className="text-gray-900 font-medium">{formatDate(stockItem.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Movements */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Stock Movements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockMovements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(movement.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      movement.type === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {movement.type === 'in' ? <Plus className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                      {movement.type === 'in' ? 'Stock In' : 'Stock Out'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <span className={movement.type === 'in' ? 'text-green-600' : 'text-red-600'}>
                        {movement.type === 'in' ? '+' : '-'}{movement.quantity} {stockItem.unit}
                      </span>
                      <div className="text-xs text-gray-500">
                        {movement.previousQuantity} → {movement.newQuantity}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.reference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adjust Stock</h3>
            <form onSubmit={handleStockAdjustment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adjustment Type
                  </label>
                  <select
                    value={adjustmentData.type}
                    onChange={(e) => setAdjustmentData({...adjustmentData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="increase">Increase Stock</option>
                    <option value="decrease">Decrease Stock</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity ({stockItem.unit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adjustmentData.quantity}
                    onChange={(e) => setAdjustmentData({...adjustmentData, quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason
                  </label>
                  <select
                    required
                    value={adjustmentData.reason}
                    onChange={(e) => setAdjustmentData({...adjustmentData, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select reason</option>
                    <option value="damaged">Damaged Items</option>
                    <option value="expired">Expired Items</option>
                    <option value="lost">Lost/Missing Items</option>
                    <option value="recount">Physical Recount</option>
                    <option value="return">Customer Return</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={adjustmentData.notes}
                    onChange={(e) => setAdjustmentData({...adjustmentData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Adjust Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDetails;
