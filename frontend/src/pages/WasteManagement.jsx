import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Trash2,
  Plus,
  Search,
  Filter,
  TrendingDown,
  Package,
  DollarSign,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import Swal from 'sweetalert2';

const WasteManagement = () => {
  const { t } = useTranslation();
  const { hasPermission, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wasteRecords, setWasteRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWasteRecord, setNewWasteRecord] = useState({
    stock_entry_id: '',
    waste_weight: '',
    reason: 'WASTE',
    notes: ''
  });
  const [stockEntries, setStockEntries] = useState([]);

  useEffect(() => {
    fetchWasteData();
    fetchStockEntries();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [wasteRecords, searchTerm, filterType, dateRange, startDate, endDate]);

  const fetchWasteData = async () => {
    try {
      setLoading(true);
      
      // Prepare query parameters
      const params = {};
      
      // Add date filters
      if (dateRange !== 'all') {
        params.date_range = dateRange;
      }
      
      if (startDate) {
        params.start_date = startDate;
      }
      
      if (endDate) {
        params.end_date = endDate;
      }
      
      // Add search term
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await apiService.waste.list(params);
      setWasteRecords(response.data.data || []);
    } catch (error) {
      console.error('Error fetching waste data:', error);
      toast.error('Failed to fetch waste data');
      setWasteRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockEntries = async () => {
    try {
      // Load received POs
      const poResp = await apiService.purchases.list({ status: 'RECEIVED', limit: 200 });
      const receivedPOs = (poResp?.data?.data) || [];
      const receivedPOIds = new Set(receivedPOs.map(p => p.id));

      // Load stock entries that can still be adjusted (received/inspected)
      const stockResp = await apiService.stock.list({ status: ['RECEIVED','INSPECTED'], limit: 500 });
      const allStocks = (stockResp?.data?.data) || [];

      // Keep only stock entries tied to received POs and with positive available qty
      const filtered = allStocks.filter(se => se.purchase_id && receivedPOIds.has(se.purchase_id) && parseFloat(se.available_qty || 0) > 0);
      setStockEntries(filtered);
    } catch (error) {
      console.error('Error fetching stock entries:', error);
      toast.error('Failed to fetch received PO items');
      setStockEntries([]);
    }
  };

  const filterRecords = () => {
    let filtered = [...wasteRecords];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        (record.stock_entry?.product?.name_en || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.stock_entry?.product?.name_ar || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(record => (record.reason || '').toLowerCase() === filterType);
    }

    // Apply date range filter in frontend if needed
    if (dateRange !== 'all' && dateRange !== 'custom') {
      const now = new Date();
      let dateThreshold;
      
      switch (dateRange) {
        case 'today':
          dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case 'month':
          dateThreshold = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case 'quarter':
          dateThreshold = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        default:
          dateThreshold = null;
      }
      
      if (dateThreshold) {
        filtered = filtered.filter(record => new Date(record.created_at) >= dateThreshold);
      }
    }
    
    // Apply custom date range filter
    if (dateRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end day
      
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.created_at);
        return recordDate >= start && recordDate <= end;
      });
    }

    setFilteredRecords(filtered);
  };

  const handleExportWaste = async () => {
    try {
      const response = await apiService.export.table('waste_damages', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `waste_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('common.export_success', 'Data exported successfully'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('common.export_failed', 'Failed to export data'));
    }
  };

  const handleAddWaste = async (e) => {
    e.preventDefault();
    try {
      // Validate form
      if (!newWasteRecord.stock_entry_id || !newWasteRecord.waste_weight) {
        Swal.fire({
          title: 'Error!',
          text: 'Please fill in all required fields',
          icon: 'error',
          confirmButtonText: 'OK'
        });
        return;
      }

      // Create waste record
      const wasteData = {
        stock_entry_id: parseInt(newWasteRecord.stock_entry_id),
        waste_weight: parseFloat(newWasteRecord.waste_weight),
        reason: newWasteRecord.reason,
        notes: newWasteRecord.notes || ''
      };

      await apiService.waste.create(wasteData);
      
      Swal.fire({
        title: 'Success!',
        text: 'Waste record added successfully!',
        icon: 'success',
        confirmButtonText: 'OK'
      });
      setShowAddModal(false);
      
      // Reset form
      setNewWasteRecord({
        stock_entry_id: '',
        waste_weight: '',
        reason: 'WASTE',
        notes: ''
      });
      
      // Refresh data
      fetchWasteData();
    } catch (error) {
      console.error('Error adding waste record:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to add waste record',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };

  const handleDelete = async (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiService.waste.delete(id);
          Swal.fire(
            'Deleted!',
            'The waste record has been deleted.',
            'success'
          );
          fetchWasteData();
        } catch (error) {
          Swal.fire(
            'Error!',
            'Failed to delete waste record',
            'error'
          );
        }
      }
    });
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

  const getTotalWasteCost = () => {
    return filteredRecords.reduce((total, record) => {
      const unit = record?.stock_entry?.product?.price_per_unit;
      const qty = parseFloat(record.waste_weight || record.quantity || 0);
      const cost = unit != null ? unit * qty : 0;
      return total + (isNaN(cost) ? 0 : cost);
    }, 0);
  };

  const getTotalWasteQuantity = () => {
    return filteredRecords.reduce((total, record) => {
      const quantity = parseFloat(record.waste_weight || record.quantity || 0);
      return total + (isNaN(quantity) ? 0 : quantity);
    }, 0);
  };

  const getStockEntryDisplayText = (entry) => {
    if (!entry) return 'Select PO item (received)';

    const product = entry.product;
    const productName = product?.name_en && product?.name_ar
      ? `${product.name_en} - ${product.name_ar}`
      : product?.name_en || product?.name_ar || 'Unknown Product';

    const warehouseName = entry?.warehouse?.name || 'Unknown Warehouse';
    const available = parseFloat(entry.available_qty || 0).toFixed(2);
    const poRef = entry.purchase_id ? `PO #${entry.purchase_id}` : 'PO N/A';
    const unitPrice = entry?.product?.price_per_unit != null ? ` • Unit: Qr ${entry.product.price_per_unit}` : '';
    return `${poRef} • ${productName} • ${warehouseName} • Available: ${available} ${entry?.product?.unit || 'kg'}${unitPrice}`;
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading waste data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Waste Management</h1>
          <p className="text-text-secondary mt-1">Track and manage inventory waste and losses</p>
        </div>
        <div className="flex items-center gap-2">
          {hasRole('ADMIN') && (
            <button
              onClick={handleExportWaste}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-text-secondary rounded-lg hover:bg-card-hover transition-colors"
            >
              <Download className="w-5 h-5 mr-2" />
              {t('common.export', 'Export')}
            </button>
          )}
          {hasPermission('waste:create') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Record Waste
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Total Records</p>
              <p className="text-2xl font-bold text-text-primary">{filteredRecords.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Total Quantity</p>
              <p className="text-2xl font-bold text-text-primary">{getTotalWasteQuantity().toFixed(1)} kg</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Total Cost</p>
              <p className="text-2xl font-bold text-text-primary">Qr {getTotalWasteCost().toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-text-secondary">Avg per Record</p>
              <p className="text-2xl font-bold text-text-primary">
                Qr {filteredRecords.length > 0 ? (getTotalWasteCost() / filteredRecords.length).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-card rounded-lg p-6 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search by product or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="waste">Waste</option>
            <option value="damage">Damages</option>
            <option value="health_test">Health Test</option>
            <option value="spoiled">Spoiled</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </>
          )}

          <button
            onClick={fetchWasteData}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>
      </div>

      {/* Waste Records Table */}
      <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-theme-border">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Purchase Order
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-theme-border">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-card-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {record.stock_entry?.product?.name_en && record.stock_entry?.product?.name_ar
                          ? `${record.stock_entry.product.name_en} - ${record.stock_entry.product.name_ar}`
                          : record.stock_entry?.product?.name_en || record.stock_entry?.product?.name_ar || 'Unknown Product'}
                      </div>
                      <div className="text-sm text-text-secondary">
                        Batch: {record.stock_entry?.batch_number || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {parseFloat(record.waste_weight || record.quantity || 0).toFixed(2)} {record.stock_entry?.product?.unit || 'kg'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (record.reason || '').toLowerCase() === 'waste' ? 'bg-card-hover text-text-primary' :
                      (record.reason || '').toLowerCase() === 'damage' ? 'bg-orange-100 text-orange-800' :
                      (record.reason || '').toLowerCase() === 'health_test' ? 'bg-blue-100 text-blue-800' :
                      (record.reason || '').toLowerCase() === 'spoiled' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-card-hover text-text-primary'
                    }`}>
                      {record.reason || 'Other'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                    {(() => {
                      const unit = record?.stock_entry?.product?.price_per_unit;
                      const qty = parseFloat(record.waste_weight || record.quantity || 0);
                      const cost = unit != null ? unit * qty : 0;
                      return <b>Qr {parseFloat(cost || 0).toFixed(2)}</b>;
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {formatDate(record.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {record.stock_entry?.purchase_id ? (
                      <Link
                        to={`/purchases/${record.stock_entry.purchase_id}`}
                        className="text-primary-600 hover:underline"
                      >
                        {`PO #${record.stock_entry.purchase_id}`}
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {hasPermission('waste:delete') && (
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <Trash2 className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No waste records found</h3>
            <p className="text-text-secondary">
              {searchTerm || filterType !== 'all' || dateRange !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No waste has been recorded yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Add Waste Modal */}
            {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Record Waste / Damage</h3>
            <form onSubmit={handleAddWaste}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Select PO Item (status: RECEIVED) *
                  </label>
                  <select
                    required
                    value={newWasteRecord.stock_entry_id}
                    onChange={(e) => setNewWasteRecord({...newWasteRecord, stock_entry_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select received PO item</option>
                    {stockEntries.map(entry => (
                      <option key={entry.id} value={entry.id}>
                        {getStockEntryDisplayText(entry)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-secondary mt-1">Only items received into stock are shown. Waste reduces available quantity and updates the ledger.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Type
                  </label>
                  <select
                    required
                    value={newWasteRecord.reason}
                    onChange={(e) => setNewWasteRecord({...newWasteRecord, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="WASTE">Waste</option>
                    <option value="DAMAGE">Damages</option>
                    <option value="HEALTH_TEST">Health Test</option>
                    <option value="SPOILED">Spoiled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Waste Weight ({(() => {
                      const entry = stockEntries.find(se => String(se.id) === String(newWasteRecord.stock_entry_id));
                      return entry?.product?.unit || 'kg';
                    })()}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newWasteRecord.waste_weight}
                    onChange={(e) => setNewWasteRecord({...newWasteRecord, waste_weight: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Estimated Cost
                  </label>
                  <div className="text-sm text-text-primary">
                    {(() => {
                      const entry = stockEntries.find(se => String(se.id) === String(newWasteRecord.stock_entry_id));
                      const unit = entry?.product?.price_per_unit;
                      const qty = parseFloat(newWasteRecord.waste_weight || '0');
                      const cost = unit != null ? unit * qty : null;
                      return cost != null && qty > 0 ? `Qr ${cost.toFixed(2)}` : '-';
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={newWasteRecord.notes}
                    onChange={(e) => setNewWasteRecord({...newWasteRecord, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Additional details..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-text-secondary border border-gray-300 rounded-lg hover:bg-card-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Record Waste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WasteManagement;
