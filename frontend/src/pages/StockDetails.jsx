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
  CheckCircle,
  XCircle,
  ShieldAlert,
  Calendar,
  DollarSign,
  Building,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import apiService from '../services/api';

const StockDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stockItem, setStockItem] = useState(null);
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    fetchStockDetails();
  }, [id]);

  const fetchStockDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.stock.get(id);
      const data = response.data?.data || response.data;
      setStockItem(data);
      setMovements(data.ledger_entries || []);
    } catch (error) {
      console.error('Error fetching stock details:', error);
      toast.error('Failed to fetch stock details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'DEPLETED':
        return 'bg-card-hover text-text-primary';
      case 'QUARANTINE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-card-hover text-text-primary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4" />;
      case 'EXPIRED':
        return <XCircle className="w-4 h-4" />;
      case 'DEPLETED':
        return <Package className="w-4 h-4" />;
      case 'QUARANTINE':
        return <ShieldAlert className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', {
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
        <Package className="w-12 h-12 text-text-secondary mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">Stock batch not found</h3>
        <p className="text-text-secondary mb-4">The requested stock batch could not be found.</p>
        <button
          onClick={() => navigate('/stock/inventory')}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inventory
        </button>
      </div>
    );
  }

  const currentQty = parseFloat(stockItem.current_quantity) || parseFloat(stockItem.available_qty) || 0;
  const initialQty = parseFloat(stockItem.initial_quantity) || parseFloat(stockItem.total_weight) || 0;
  const unitCost = parseFloat(stockItem.unit_cost) || 0;
  const totalValue = currentQty * unitCost;
  const productName = stockItem.product?.name_en || stockItem.product?.name_ar || 'Unknown Product';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/stock/inventory')}
            className="p-2 text-text-secondary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{productName}</h1>
            <p className="text-text-secondary">
              Batch: {stockItem.batch_number || `#${stockItem.id}`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
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
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Current Qty</p>
              <p className="text-2xl font-bold text-text-primary">{currentQty.toLocaleString()} kg</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Total Value</p>
              <p className="text-2xl font-bold text-text-primary">QAR {totalValue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Unit Cost</p>
              <p className="text-2xl font-bold text-text-primary">QAR {unitCost.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Initial Qty</p>
              <p className="text-2xl font-bold text-text-primary">{initialQty.toLocaleString()} kg</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batch Information */}
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Batch Information</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-text-secondary">Status:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(stockItem.status)}`}>
                {getStatusIcon(stockItem.status)}
                <span className="ml-1 capitalize">{(stockItem.status || '').toLowerCase()}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Batch Number:</span>
              <span className="text-text-primary font-medium font-mono">{stockItem.batch_number || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Date Received:</span>
              <span className="text-text-primary font-medium">{formatDate(stockItem.date_received)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Expiry Date:</span>
              <span className={`font-medium ${stockItem.expiry_date && new Date(stockItem.expiry_date) < new Date()
                  ? 'text-red-600'
                  : stockItem.expiry_date && new Date(stockItem.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    ? 'text-yellow-600'
                    : 'text-text-primary'
                }`}>
                {formatDate(stockItem.expiry_date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Usage:</span>
              <span className="text-text-primary font-medium">
                {initialQty > 0 ? ((1 - currentQty / initialQty) * 100).toFixed(1) : 0}% consumed
              </span>
            </div>
          </div>
        </div>

        {/* Supplier & Warehouse */}
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Supplier & Warehouse</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-text-secondary">Supplier:</span>
              <span className="text-text-primary font-medium">{stockItem.supplier?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Warehouse:</span>
              <span className="text-text-primary font-medium">{stockItem.warehouse?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Unit Cost:</span>
              <span className="text-text-primary font-medium">QAR {unitCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Created:</span>
              <span className="text-text-primary font-medium">{formatDateTime(stockItem.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Last Updated:</span>
              <span className="text-text-primary font-medium">{formatDateTime(stockItem.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Movements */}
      <div className="bg-card rounded-lg shadow-sm border">
        <div className="p-6 border-b border-theme-border">
          <h2 className="text-lg font-semibold text-text-primary">Recent Stock Movements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-theme-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-theme-border">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {formatDateTime(movement.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${movement.type === 'IN' ? 'bg-green-100 text-green-800'
                        : movement.type === 'OUT' ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                      {movement.type === 'IN' ? <Plus className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                      {movement.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={parseFloat(movement.quantity) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {parseFloat(movement.quantity) >= 0 ? '+' : ''}{parseFloat(movement.quantity).toLocaleString()} kg
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {movement.reference_type ? `${movement.reference_type} #${movement.reference_id}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">
                    {movement.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {movements.length === 0 && (
          <div className="text-center py-8">
            <p className="text-text-secondary">No movements recorded for this batch.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockDetails;
