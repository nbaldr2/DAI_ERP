import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Download,
  Eye,
  Search,
  Filter,
  Calendar,
  DollarSign,
  User,
  Building,
  ChevronRight,
  AlertCircle,
  Clock,
  Edit,
  Truck,
  ChevronDown,
  FileText,
  X,
  PackageCheck
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import pdfService from '../services/pdfService';
import { useSettings } from '../contexts/SettingsContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const Purchases = () => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);

  // Receive Goods modal state
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(null);
  const [purchaseDetail, setPurchaseDetail] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [dateIn, setDateIn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [defaultExpiryDate, setDefaultExpiryDate] = useState('');
  const [receipts, setReceipts] = useState([]);
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/purchases', {
        params: {
          search: searchTerm,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          date_range: dateRange !== 'all' ? dateRange : undefined
        }
      });
      setPurchases(response.data.data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error(t('purchases.errors.fetch_failed', 'Failed to fetch purchases'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditPurchase = (purchaseId) => {
    navigate(`/purchases/edit/${purchaseId}`);
  };

  const handleViewPurchase = (purchaseId) => {
    navigate(`/purchases/${purchaseId}`);
  };

  const handlePrintPurchase = async (purchaseId) => {
    try {
      // Fetch the full purchase details
      const response = await apiService.get(`/purchases/${purchaseId}`);
      const purchase = response.data.data;
      
      // Generate and preview the PDF
      pdfService.previewPurchaseOrderPDF(purchase, purchase.supplier, settings);
    } catch (error) {
      console.error('Error generating purchase order PDF:', error);
      toast.error(t('purchases.errors.pdf_failed', 'Failed to generate PDF'));
    }
  };

  const exportToCSV = () => {
    try {
      // Create CSV content
      const headers = [
        'PO Number',
        'Supplier',
        'Order Date',
        'Expected Date',
        'Amount',
        'Status'
      ];
      
      const csvContent = [
        headers.join(','),
        ...filteredPurchases.map(purchase => [
          `"${purchase.po_number || `PO-${purchase.id}`}"`,
          `"${purchase.supplier?.name || 'N/A'}"`,
          purchase.order_date ? format(new Date(purchase.order_date), 'yyyy-MM-dd') : 'N/A',
          purchase.expected_date ? format(new Date(purchase.expected_date), 'yyyy-MM-dd') : 'N/A',
          `"${parseFloat(purchase.total || 0).toFixed(2)}"`,
          `"${purchase.status || 'DRAFT'}"`
        ].join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `purchases-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(t('common.export_success', 'Data exported successfully'));
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error(t('common.export_failed', 'Failed to export data'));
    }
  };

  const handleStatusChange = async (purchaseId, newStatus) => {
    try {
      await apiService.patch(`/purchases/${purchaseId}/status`, {
        status: newStatus
      });
      
      // Update the local state
      setPurchases(prevPurchases => 
        prevPurchases.map(purchase => 
          purchase.id === purchaseId 
            ? { ...purchase, status: newStatus }
            : purchase
        )
      );
      
      // Close the dropdown
      setStatusDropdownOpen(null);
      
      toast.success(t('purchases.success.status_updated', 'Purchase order status updated successfully'));
    } catch (error) {
      console.error('Error updating purchase status:', error);
      toast.error(t('purchases.errors.update_failed', 'Failed to update purchase order status'));
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'bg-card-hover text-text-primary border-theme-border';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ordered':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'received':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-card-hover text-text-primary border-theme-border';
    }
  };

  const getStatusOptions = (currentStatus) => {
    const allStatuses = [
      { value: 'DRAFT', label: t('purchases.status_draft', 'Draft') },
       { value: 'CONFIRMED', label: t('purchases.status_confirmed', 'Confirmed') },
      { value: 'RECEIVED', label: t('purchases.status_received', 'Received') },
       { value: 'CANCELLED', label: t('purchases.status_cancelled', 'Cancelled') }
    ];
    
    // Filter out the current status to avoid showing it in the dropdown
    return allStatuses.filter(status => status.value !== currentStatus?.toUpperCase());
  };

  const toggleStatusDropdown = (purchaseId) => {
    setStatusDropdownOpen(statusDropdownOpen === purchaseId ? null : purchaseId);
  };

  const handleSearchTermChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleDateRangeChange = (e) => {
    setDateRange(e.target.value);
  };

  const openReceiveModal = async (purchaseId) => {
    try {
      setSelectedPurchaseId(purchaseId);
      setReceiveModalOpen(true);
      // Load purchase details
      const [purchaseRes, warehousesRes] = await Promise.all([
        apiService.get(`/purchases/${purchaseId}`),
        apiService.get('/warehouses')
      ]);
      const detail = purchaseRes.data?.data;
      setPurchaseDetail(detail);
      setWarehouses(warehousesRes.data?.data || warehousesRes.data || []);

      // Initialize receipts form from purchase items
      const initialReceipts = (detail?.items || []).map((item) => ({
        purchase_item_id: item.id,
        product_id: item.product_id,
        warehouse_id: item.warehouse_id || (warehousesRes.data?.data?.[0]?.id ?? null),
        received_weight: parseFloat(item.quantity || 0),
        damaged_weight: 0,
        accepted_weight: parseFloat(item.quantity || 0),
        expiry_date: defaultExpiryDate || '',
        pallets: 1,
        pallet_weight: parseFloat(item.quantity || 0)
      }));
      setReceipts(initialReceipts);
    } catch (error) {
      console.error('Error opening receive modal:', error);
      toast.error(t('purchases.errors.fetch_failed', 'Failed to fetch purchase details'));
      setReceiveModalOpen(false);
    }
  };

  const closeReceiveModal = () => {
    setReceiveModalOpen(false);
    setSelectedPurchaseId(null);
    setPurchaseDetail(null);
    setReceipts([]);
    setDefaultExpiryDate('');
    setDateIn(format(new Date(), 'yyyy-MM-dd'));
  };

  const updateReceiptField = (index, field, value) => {
    setReceipts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Recompute accepted_weight and pallet_weight when received/damaged changes
      const received = parseFloat(next[index].received_weight || 0) || 0;
      const damaged = parseFloat(next[index].damaged_weight || 0) || 0;
      const accepted = Math.max(received - damaged, 0);
      next[index].accepted_weight = accepted;
      if (field === 'received_weight' || field === 'damaged_weight') {
        next[index].pallet_weight = accepted;
      }
      return next;
    });
  };

  const handleConfirmReceive = async () => {
    if (!selectedPurchaseId) return;
    try {
      setReceiving(true);
      // Build payload for receive endpoint
      const payload = {
        date_in: dateIn,
        default_expiry_date: defaultExpiryDate || undefined,
        receipts: receipts.map((r) => ({
          purchase_item_id: r.purchase_item_id,
          accepted_weight: parseFloat(r.accepted_weight || 0),
          warehouse_id: r.warehouse_id,
          expiry_date: r.expiry_date || defaultExpiryDate || undefined,
          pallets: r.pallets || 1,
          pallet_weight: parseFloat(r.pallet_weight || r.accepted_weight || 0)
        }))
      };

      const res = await apiService.post(`/purchases/${selectedPurchaseId}/receive`, payload);
      const createdEntries = res.data?.data?.stock_entries || [];

      // Create waste entries for damaged quantities
      for (let i = 0; i < receipts.length; i++) {
        const r = receipts[i];
        const damaged = parseFloat(r.damaged_weight || 0);
        if (damaged > 0) {
          // Try to find matching stock entry by product and warehouse
          const match = createdEntries.find((se) => se.product_id === r.product_id && se.warehouse_id === r.warehouse_id);
          if (match) {
            try {
              await apiService.post(`/stock/${match.id}/waste`, {
                waste_weight: damaged,
                notes: `Damage recorded for PO-${selectedPurchaseId}`
              });
            } catch (wErr) {
              console.error('Error creating waste entry:', wErr);
              toast.error(t('stock.errors.waste_failed', 'Failed to create waste entry for a line'));
            }
          }
        }
      }

      toast.success(t('purchases.success.received', 'Purchase received and stock updated'));
      closeReceiveModal();
      await fetchPurchases();
    } catch (error) {
      console.error('Error receiving purchase:', error);
      const msg = error?.response?.data?.message || t('purchases.errors.receive_failed', 'Failed to receive purchase');
      toast.error(msg);
    } finally {
      setReceiving(false);
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    // Search filter
    const matchesSearch = !searchTerm ||
      purchase.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' || purchase.status?.toLowerCase() === statusFilter;

    // Date range filter
    let matchesDate = true;
    if (dateRange !== 'all' && purchase.order_date) {
      const now = new Date();
      const purchaseDate = new Date(purchase.order_date);
      const startOfDay = new Date(purchaseDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      switch (dateRange) {
        case 'today':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          matchesDate = purchaseDate >= today && purchaseDate < tomorrow;
          break;
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          matchesDate = purchaseDate >= weekAgo && purchaseDate <= now;
          break;
        case 'month':
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          monthAgo.setHours(0, 0, 0, 0);
          matchesDate = purchaseDate >= monthAgo && purchaseDate <= now;
          break;
        case 'quarter':
          const quarterAgo = new Date(now);
          quarterAgo.setMonth(quarterAgo.getMonth() - 3);
          quarterAgo.setHours(0, 0, 0, 0);
          matchesDate = purchaseDate >= quarterAgo && purchaseDate <= now;
          break;
        default:
          matchesDate = true;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Update the filter section with correct status options
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t('purchases.title', 'Purchases')}
          </h1>
          <p className="text-text-secondary mt-1">
            {t('purchases.subtitle', 'Manage purchase orders and suppliers')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {t('common.export', 'Export')}
          </Button>
          <Button
            onClick={() => navigate('/purchases/create')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('purchases.create', 'Create Purchase Order')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
            <input
              type="text"
              placeholder={t('purchases.search', 'Search purchase orders...')}
              className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={searchTerm}
              onChange={handleSearchTermChange}
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              value={statusFilter}
              onChange={handleStatusFilterChange}
            >
              <option value="all">{t('common.all_status', 'All Status')}</option>
              <option value="draft">{t('purchases.status_draft', 'Draft')}</option>
               <option value="confirmed">{t('purchases.status_confirmed', 'Confirmed')}</option>
              <option value="received">{t('purchases.status_received', 'Received')}</option>
               <option value="cancelled">{t('purchases.status_cancelled', 'Cancelled')}</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              value={dateRange}
              onChange={handleDateRangeChange}
            >
              <option value="all">{t('common.all_dates', 'All Dates')}</option>
              <option value="today">{t('common.today', 'Today')}</option>
              <option value="week">{t('common.this_week', 'This Week')}</option>
              <option value="month">{t('common.this_month', 'This Month')}</option>
              <option value="quarter">{t('common.this_quarter', 'This Quarter')}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                {t('purchases.stats.total', 'Total Purchase Orders')}
              </p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {purchases.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                {t('purchases.stats.pending', 'Pending')}
              </p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {purchases.filter(po => po.status?.toLowerCase() === 'sent').length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                {t('purchases.stats.ordered', 'Ordered')}
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {purchases.filter(po => po.status?.toLowerCase() === 'confirmed').length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                {t('purchases.stats.completed', 'Completed')}
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {purchases.filter(po => po.status?.toLowerCase() === 'received').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Purchases List */}
      <Card>
        <div className="p-6 border-b border-theme-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {t('purchases.list.title', 'Recent Purchase Orders')}
          </h2>
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {t('purchases.empty.title', 'No purchase orders found')}
            </h3>
            <p className="text-text-secondary">
              {t('purchases.empty.description', 'No purchase orders match your current filters.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t('purchases.table.po_number', 'PO #')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t('purchases.table.supplier', 'Supplier')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t('purchases.table.order_date', 'Order Date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t('purchases.table.expected_date', 'Expected Date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t('purchases.table.amount', 'Amount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t('purchases.table.status', 'Status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t('common.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-theme-border">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-card-hover">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="text-sm font-medium text-text-primary hover:text-green-600 cursor-pointer"
                        onClick={() =>  handleViewPurchase(purchase.id)}
                      >
                        {purchase.po_number || `PO-${purchase.id}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="w-4 h-4 text-text-secondary mr-2" />
                        <div className="text-sm text-text-primary">
                          {purchase.supplier?.name || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-secondary">
                        {purchase.order_date ? format(new Date(purchase.order_date), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-secondary">
                        {purchase.expected_date ? format(new Date(purchase.expected_date), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-primary">
                        QAR {parseFloat(purchase.total || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(purchase.status)}`}>
                          {t(`purchases.status.${purchase.status?.toLowerCase()}`, purchase.status?.toUpperCase() || 'DRAFT')}
                        </span>
                        <div className="relative">
                          <button 
                            onClick={() => toggleStatusDropdown(purchase.id)}
                            className="text-text-secondary hover:text-text-secondary focus:outline-none"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          {statusDropdownOpen === purchase.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-card rounded-md shadow-lg py-1 z-10 border border-theme-border">
                              {getStatusOptions(purchase.status).map(option => (
                                <button
                                  key={option.value}
                                  onClick={() => handleStatusChange(purchase.id, option.value)}
                                  className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-card-hover"
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditPurchase(purchase.id)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewPurchase(purchase.id)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintPurchase(purchase.id)}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          
                        </Button>
                        {purchase.status?.toLowerCase() !== 'received' && (
                          <Button
                            size="sm"
                            onClick={() => openReceiveModal(purchase.id)}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <PackageCheck className="w-3 h-3" />
                            {t('purchases.receive_goods', 'Receive Goods')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {/* Receive Goods Modal */}
      {receiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={closeReceiveModal} />
          <div className="relative bg-card rounded-lg shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {t('purchases.receive_modal.title', 'Receive Goods')}
                {selectedPurchaseId ? ` • PO-${selectedPurchaseId}` : ''}
              </h3>
              <button onClick={closeReceiveModal} className="text-text-secondary hover:text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">{t('stock.date_in', 'Date In')}</label>
                  <input type="date" value={dateIn} onChange={(e) => setDateIn(e.target.value)} className="w-full border border-theme-border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">{t('stock.default_expiry_date', 'Default Expiry Date')}</label>
                  <input type="date" value={defaultExpiryDate} onChange={(e) => setDefaultExpiryDate(e.target.value)} className="w-full border border-theme-border rounded-lg px-3 py-2" />
                </div>
                <div className="flex items-end">
                  <span className="text-sm text-text-secondary">{t('purchases.receive_modal.hint', 'Set defaults and adjust per line')}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-background">
                      <th className="px-3 py-2 text-left">{t('common.product', 'Product')}</th>
                      <th className="px-3 py-2 text-left">{t('common.warehouse', 'Warehouse')}</th>
                      <th className="px-3 py-2 text-right">{t('stock.received_weight', 'Received')}</th>
                      <th className="px-3 py-2 text-right">{t('stock.damaged_weight', 'Damaged')}</th>
                      <th className="px-3 py-2 text-right">{t('stock.accepted_weight', 'Accepted')}</th>
                      <th className="px-3 py-2 text-left">{t('stock.expiry_date', 'Expiry')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((r, idx) => {
                      const item = purchaseDetail?.items?.find((it) => it.id === r.purchase_item_id);
                      const productName = item?.product?.name || `#${r.product_id}`;
                      return (
                        <tr key={r.purchase_item_id} className="border-t">
                          <td className="px-3 py-2">{productName}</td>
                          <td className="px-3 py-2">
                            <select
                              className="border border-theme-border rounded px-2 py-1"
                              value={r.warehouse_id || ''}
                              onChange={(e) => updateReceiptField(idx, 'warehouse_id', parseInt(e.target.value))}
                            >
                              <option value="">{t('common.select', 'Select')}</option>
                              {warehouses.map((w) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              className="w-28 text-right border border-theme-border rounded px-2 py-1"
                              value={r.received_weight}
                              onChange={(e) => updateReceiptField(idx, 'received_weight', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              className="w-28 text-right border border-theme-border rounded px-2 py-1"
                              value={r.damaged_weight}
                              onChange={(e) => updateReceiptField(idx, 'damaged_weight', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-block w-28 text-right">{parseFloat(r.accepted_weight || 0).toFixed(2)}</span>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              className="border border-theme-border rounded px-2 py-1"
                              value={r.expiry_date || ''}
                              onChange={(e) => updateReceiptField(idx, 'expiry_date', e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={closeReceiveModal} className="">{t('common.cancel', 'Cancel')}</Button>
              <Button onClick={handleConfirmReceive} disabled={receiving} className="bg-green-600 hover:bg-green-700 text-white">
                {receiving ? t('common.processing', 'Processing...') : t('purchases.receive_goods', 'Receive Goods')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;