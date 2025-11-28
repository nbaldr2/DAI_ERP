import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ShoppingCart,
  Edit,
  ArrowLeft,
  Building,
  Calendar,
  FileText,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import pdfService from '../services/pdfService';
import { useSettings } from '../contexts/SettingsContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PurchaseDetail = () => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [purchase, setPurchase] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [wasteLoading, setWasteLoading] = useState(false);
  const [wasteTotals, setWasteTotals] = useState({
    totalWasteKg: 0,
    totalDamageKg: 0,
    wasteCount: 0,
    damageCount: 0
  });

  useEffect(() => {
    fetchPurchaseDetails();
  }, [id]);

  const fetchPurchaseDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/purchases/${id}`);
      setPurchase(response.data.data);
      setItems(response.data.data.items || []);
    } catch (error) {
      console.error('Error fetching purchase details:', error);
      toast.error(t('purchases.errors.fetch_failed', 'Failed to fetch purchase details'));
      navigate('/purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchWasteTotals();
    }
  }, [id]);

  const fetchWasteTotals = async () => {
    try {
      setWasteLoading(true);
      const { data } = await apiService.waste.list({ purchase_id: id, limit: 1000 });
      const records = data?.data || [];

      let totalWasteKg = 0;
      let totalDamageKg = 0;
      let wasteCount = 0;
      let damageCount = 0;

      const wasteReasons = ['WASTE', 'SPOILED', 'HEALTH_TEST', 'OTHER'];
      const damageReasons = ['DAMAGE'];

      for (const r of records) {
        const weight = parseFloat(r.waste_weight || 0);
        const reason = String(r.reason || '').toUpperCase();
        if (wasteReasons.includes(reason)) {
          totalWasteKg += weight;
          wasteCount += 1;
        } else if (damageReasons.includes(reason)) {
          totalDamageKg += weight;
          damageCount += 1;
        }
      }

      setWasteTotals({ totalWasteKg, totalDamageKg, wasteCount, damageCount });
    } catch (error) {
      console.error('Error fetching waste totals:', error);
      toast.error(t('purchases.errors.waste_totals_failed', 'Failed to load waste and damage totals'));
    } finally {
      setWasteLoading(false);
    }
  };

  const handlePrintPurchase = () => {
    try {
      // Generate and preview the PDF
      pdfService.previewPurchaseOrderPDF(purchase, purchase.supplier, settings);
    } catch (error) {
      console.error('Error generating purchase order PDF:', error);
      toast.error(t('purchases.errors.pdf_failed', 'Failed to generate PDF'));
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setUpdating(true);
      await apiService.patch(`/purchases/${id}/status`, { status: newStatus });
      toast.success(t('purchases.success.status_updated', 'Purchase order status updated successfully'));
      fetchPurchaseDetails();
    } catch (error) {
      console.error('Error updating purchase status:', error);
      toast.error(t('purchases.errors.update_failed', 'Failed to update purchase status'));
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'ordered':
        return 'bg-blue-100 text-blue-800';
      case 'received':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'draft':
        return <FileText className="w-5 h-5 text-gray-600" />;
      case 'ordered':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'received':
        return <Package className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!purchase) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('purchases.not_found.title', 'Purchase Order Not Found')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('purchases.not_found.description', 'The purchase order you are looking for does not exist or has been removed.')}
        </p>
        <Button onClick={() => navigate('/purchases')}>
          {t('purchases.back_to_list', 'Back to Purchase Orders')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/purchases')}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back', 'Back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {purchase.po_number || `PO-${purchase.id}`}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('purchases.created_at', 'Created')}: {format(new Date(purchase.created_at), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrintPurchase}
            className="flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            {t('common.print', 'Print')}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/purchases/edit/${purchase.id}`)}
            className="flex items-center gap-1"
          >
            <Edit className="w-4 h-4" />
            {t('common.edit', 'Edit')}
          </Button>
        </div>
      </div>

      {/* Status and Actions */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gray-100">
              {getStatusIcon(purchase.status)}
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {t('purchases.current_status', 'Current Status')}:
              </p>
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getStatusColor(purchase.status)}`}>
                  {t(`purchases.status.${purchase.status}`, purchase.status?.toUpperCase() || 'DRAFT')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {purchase.status === 'draft' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('pending')}
                  disabled={updating}
                  className="flex items-center gap-1"
                >
                  {updating ? <LoadingSpinner size="sm" /> : <AlertTriangle className="w-3 h-3" />}
                  {t('purchases.actions.mark_pending', 'Mark as Pending')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={updating}
                  className="flex items-center gap-1 text-red-600 hover:bg-red-50"
                >
                  {updating ? <LoadingSpinner size="sm" /> : <XCircle className="w-3 h-3" />}
                  {t('purchases.actions.cancel', 'Cancel Order')}
                </Button>
              </>
            )}
            
            {purchase.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('ordered')}
                  disabled={updating}
                  className="flex items-center gap-1"
                >
                  {updating ? <LoadingSpinner size="sm" /> : <Truck className="w-3 h-3" />}
                  {t('purchases.actions.mark_ordered', 'Mark as Ordered')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={updating}
                  className="flex items-center gap-1 text-red-600 hover:bg-red-50"
                >
                  {updating ? <LoadingSpinner size="sm" /> : <XCircle className="w-3 h-3" />}
                  {t('purchases.actions.cancel', 'Cancel Order')}
                </Button>
              </>
            )}
            
            {purchase.status === 'ordered' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('received')}
                  disabled={updating}
                  className="flex items-center gap-1"
                >
                  {updating ? <LoadingSpinner size="sm" /> : <Package className="w-3 h-3" />}
                  {t('purchases.actions.mark_received', 'Mark as Received')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={updating}
                  className="flex items-center gap-1 text-red-600 hover:bg-red-50"
                >
                  {updating ? <LoadingSpinner size="sm" /> : <XCircle className="w-3 h-3" />}
                  {t('purchases.actions.cancel', 'Cancel Order')}
                </Button>
              </>
            )}
            
            {purchase.status === 'received' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate('completed')}
                disabled={updating}
                className="flex items-center gap-1"
              >
                {updating ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-3 h-3" />}
                {t('purchases.actions.mark_completed', 'Mark as Completed')}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Order Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('purchases.details', 'Purchase Order Details')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {t('purchases.supplier_info', 'Supplier Information')}
                </h3>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">
                      {purchase.supplier?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {purchase.supplier?.email || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {purchase.supplier?.phone || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {t('purchases.order_info', 'Order Information')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {t('purchases.order_date', 'Order Date')}:
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {purchase.order_date ? format(new Date(purchase.order_date), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {t('purchases.expected_date', 'Expected Delivery')}:
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {purchase.expected_date ? format(new Date(purchase.expected_date), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {t('purchases.po_number', 'PO Number')}:
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {purchase.po_number || `PO-${purchase.id}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {purchase.notes && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {t('purchases.notes', 'Notes')}
                </h3>
                <p className="text-sm text-gray-600">
                  {purchase.notes}
                </p>
              </div>
            )}
          </Card>
          
          {/* Items List */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('purchases.items', 'Items')}
              </h2>
              <div className="text-sm text-gray-600">
                {t('purchases.total_items', 'Total Items')}: {items.length}
              </div>
            </div>
            
            {items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">
                  {t('purchases.no_items', 'No items in this purchase order')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('purchases.table.product', 'Product')}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('purchases.table.quantity', 'Quantity')}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('purchases.table.unit_price', 'Unit Price')}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('purchases.table.total', 'Total')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.product?.name_en && item.product?.name_ar 
                              ? `${item.product.name_en} - ${item.product.name_ar}`
                              : item.product?.name || item.product?.name_en || item.product?.name_ar || 'Unknown Product'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="text-sm text-gray-900">
                            {item.quantity || item.qty || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="text-sm text-gray-900">
                            QAR {parseFloat(item.unit_price || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            QAR {parseFloat(item.total_price || 0).toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td colSpan="3" className="px-4 py-3 text-right font-medium">
                        {t('purchases.table.grand_total', 'Grand Total')}:
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-lg font-bold text-gray-900">
                          QAR {calculateTotal().toFixed(2)}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        
        {/* Summary Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('purchases.summary.title', 'Order Summary')}
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">
                  {t('purchases.summary.subtotal', 'Subtotal')}:
                </span>
                <span className="text-sm font-medium text-gray-900">
                  QAR {calculateTotal().toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">
                  {t('purchases.summary.items_count', 'Items Count')}:
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {items.length}
                </span>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">
                  {t('purchases.summary.total_quantity', 'Total Quantity')}:
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {items.reduce((sum, item) => sum + parseFloat(item.quantity || item.qty || 0), 0)}
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-medium text-gray-800">
                  {t('purchases.summary.grand_total', 'Grand Total')}:
                </span>
                <span className="text-lg font-bold text-gray-900">
                  QAR {calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
          
          {/* Waste & Damage Totals */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('purchases.summary.waste_damage_title', 'Wastes & Damages')}
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">
                  {t('purchases.summary.total_waste', 'Total Waste')}:
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {wasteLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    `${wasteTotals.totalWasteKg.toFixed(2)} kg (${wasteTotals.wasteCount})`
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">
                  {t('purchases.summary.total_damage', 'Total Damage')}:
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {wasteLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    `${wasteTotals.totalDamageKg.toFixed(2)} kg (${wasteTotals.damageCount})`
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-medium text-gray-800">
                  {t('purchases.summary.total_waste_damage', 'Total Waste + Damage')}:
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {wasteLoading
                    ? '—'
                    : `${(wasteTotals.totalWasteKg + wasteTotals.totalDamageKg).toFixed(2)} kg`}
                </span>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('purchases.activity', 'Activity')}
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {t('purchases.activity.created', 'Purchase Order Created')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(purchase.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              
              {purchase.updated_at && purchase.updated_at !== purchase.created_at && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Edit className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {t('purchases.activity.updated', 'Purchase Order Updated')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(purchase.updated_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetail;