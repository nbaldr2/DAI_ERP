import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    Truck,
    Search,
    Filter,
    Calendar,
    Eye,
    Trash2,
    Download,
    FileText,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import pdfService from '../services/pdfService';
import Swal from 'sweetalert2';
import { useSettings } from '../contexts/SettingsContext';

const DeliveryNotes = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { settings } = useSettings();
    const [deliveryNotes, setDeliveryNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);
    const [selectedDn, setSelectedDn] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    useEffect(() => {
        fetchDeliveryNotes();
    }, []);

    const fetchDeliveryNotes = async () => {
        try {
            setLoading(true);
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            const response = await apiService.deliveryNotes.list(params);
            setDeliveryNotes(response.data.data || []);
        } catch (error) {
            console.error('Error fetching delivery notes:', error);
            toast.error('Failed to fetch delivery notes');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchDeliveryNotes();
    };

    const handleStatusChange = async (dnId, newStatus) => {
        try {
            await apiService.deliveryNotes.updateStatus(dnId, newStatus);
            setDeliveryNotes(prev =>
                prev.map(dn =>
                    dn.id === dnId ? { ...dn, status: newStatus.toUpperCase() } : dn
                )
            );
            setStatusDropdownOpen(null);
            Swal.fire({
                title: 'Success!',
                text: 'Delivery note status updated!',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        } catch (error) {
            console.error('Error updating status:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to update delivery note status',
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
                    await apiService.deliveryNotes.delete(id);
                    Swal.fire('Deleted!', 'The delivery note has been deleted.', 'success');
                    fetchDeliveryNotes();
                } catch (error) {
                    console.error('Error deleting delivery note:', error);
                    Swal.fire('Error!', 'Failed to delete delivery note', 'error');
                }
            }
        });
    };

    const handleDownloadPdf = async (dn) => {
        try {
            // Fetch the original invoice to generate the PDF
            const response = await apiService.invoices.get(dn.invoice_id);
            const invoice = response.data?.data || response.data;

            if (!invoice) {
                toast.error('Original invoice not found');
                return;
            }

            const items = (invoice.items || invoice.InvoiceItem || []).map((item) => ({
                ...item,
                product_name:
                    item.product?.name_en ||
                    item.product?.name ||
                    item.product_name ||
                    item.name ||
                    `Product #${item.product_id}`,
                quantity: parseFloat(item.quantity || 0),
                unit: item.product?.unit || item.unit || 'pcs',
            }));

            const invoiceForPdf = {
                ...invoice,
                items,
                invoice_date: invoice.invoice_date || invoice.issue_date || new Date().toISOString().slice(0, 10),
            };

            const pdfBlob = pdfService.generateDeliveryNotePDF(
                invoiceForPdf,
                invoice.customer,
                settings
            );
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${dn.dn_number}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('PDF downloaded!');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download PDF');
        }
    };

    const handleViewDetail = (dn) => {
        setSelectedDn(dn);
        setDetailModalOpen(true);
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'DELIVERED':
                return 'bg-green-100 text-green-800';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-card-hover text-text-primary';
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toUpperCase()) {
            case 'DELIVERED':
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'PENDING':
                return <Clock className="w-4 h-4 text-yellow-600" />;
            case 'CANCELLED':
                return <XCircle className="w-4 h-4 text-red-600" />;
            default:
                return <Clock className="w-4 h-4 text-text-secondary" />;
        }
    };

    const getStatusOptions = (currentStatus) => {
        const allStatuses = [
            { value: 'PENDING', label: 'Pending' },
            { value: 'DELIVERED', label: 'Delivered' },
            { value: 'CANCELLED', label: 'Cancelled' }
        ];
        return allStatuses.filter(s => s.value !== currentStatus?.toUpperCase());
    };

    const filteredNotes = deliveryNotes.filter(dn => {
        const matchesSearch = !searchTerm ||
            dn.dn_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            dn.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            dn.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || dn.status?.toUpperCase() === statusFilter.toUpperCase();
        return matchesSearch && matchesStatus;
    });

    // Stats
    const totalNotes = deliveryNotes.length;
    const pendingCount = deliveryNotes.filter(dn => dn.status?.toUpperCase() === 'PENDING').length;
    const deliveredCount = deliveryNotes.filter(dn => dn.status?.toUpperCase() === 'DELIVERED').length;
    const cancelledCount = deliveryNotes.filter(dn => dn.status?.toUpperCase() === 'CANCELLED').length;

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">
                        {t('deliveryNotes.title', 'Delivery Notes')}
                    </h1>
                    <p className="text-text-secondary mt-1">
                        {t('deliveryNotes.subtitle', 'View and manage all delivery notes generated from invoices')}
                    </p>
                </div>
                <Button
                    onClick={fetchDeliveryNotes}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    {t('common.refresh', 'Refresh')}
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                        <input
                            type="text"
                            placeholder={t('deliveryNotes.search', 'Search by DN#, Invoice#, Customer...')}
                            className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                        <select
                            className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                        <input
                            type="date"
                            className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            placeholder="From"
                        />
                    </div>

                    <Button
                        onClick={handleSearch}
                        className="flex items-center justify-center gap-2"
                    >
                        <Search className="w-4 h-4" />
                        {t('common.search', 'Search')}
                    </Button>
                </div>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-text-secondary">
                                Total D/N
                            </p>
                            <p className="text-2xl font-bold text-text-primary mt-1">
                                {totalNotes}
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
                                Pending
                            </p>
                            <p className="text-2xl font-bold text-yellow-600 mt-1">
                                {pendingCount}
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
                                Delivered
                            </p>
                            <p className="text-2xl font-bold text-green-600 mt-1">
                                {deliveredCount}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-text-secondary">
                                Cancelled
                            </p>
                            <p className="text-2xl font-bold text-red-600 mt-1">
                                {cancelledCount}
                            </p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-full">
                            <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Delivery Notes List */}
            <Card>
                <div className="p-6 border-b border-theme-border">
                    <h2 className="text-lg font-semibold text-text-primary">
                        {t('deliveryNotes.list.title', 'Delivery Notes History')}
                    </h2>
                </div>

                {filteredNotes.length === 0 ? (
                    <div className="p-12 text-center">
                        <Truck className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-text-primary mb-2">
                            No delivery notes found
                        </h3>
                        <p className="text-text-secondary">
                            Delivery notes will appear here when you generate them from invoices.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-background">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        D/N Number
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Invoice #
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Delivery Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Items
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-theme-border">
                                {filteredNotes.map((dn) => (
                                    <tr key={dn.id} className="hover:bg-card-hover transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Truck className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-medium text-text-primary">
                                                    {dn.dn_number}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div
                                                className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                                                onClick={() => navigate(`/invoices/edit/${dn.invoice_id}`)}
                                            >
                                                {dn.invoice_number || `INV-${dn.invoice_id}`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-text-primary">
                                                {dn.customer_name || dn.customer?.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-text-secondary">
                                                {dn.delivery_date
                                                    ? format(new Date(dn.delivery_date), 'MMM dd, yyyy')
                                                    : dn.created_at
                                                        ? format(new Date(dn.created_at), 'MMM dd, yyyy')
                                                        : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <Package className="w-4 h-4 text-text-secondary" />
                                                <span className="text-sm text-text-primary">
                                                    {dn.total_items || (dn.items ? dn.items.length : 0)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(dn.status)}`}>
                                                    {getStatusIcon(dn.status)}
                                                    {dn.status?.toUpperCase() || 'PENDING'}
                                                </span>
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setStatusDropdownOpen(statusDropdownOpen === dn.id ? null : dn.id)}
                                                        className="text-text-secondary hover:text-text-secondary focus:outline-none"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    {statusDropdownOpen === dn.id && (
                                                        <div className="absolute right-0 mt-1 w-40 bg-card rounded-md shadow-lg py-1 z-10 border border-theme-border">
                                                            {getStatusOptions(dn.status).map(option => (
                                                                <button
                                                                    key={option.value}
                                                                    onClick={() => handleStatusChange(dn.id, option.value)}
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
                                                    onClick={() => handleViewDetail(dn)}
                                                    className="flex items-center gap-1"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDownloadPdf(dn)}
                                                    className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                    title="Download PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDelete(dn.id)}
                                                    className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Detail Modal */}
            {detailModalOpen && selectedDn && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-theme-border bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-lg">
                                        <Truck className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-text-primary">{selectedDn.dn_number}</h2>
                                        <p className="text-sm text-text-secondary">Delivery Note Details</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDetailModalOpen(false)}
                                    className="p-2 text-text-secondary hover:text-text-secondary hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-background rounded-lg p-4">
                                    <p className="text-xs font-medium text-text-secondary uppercase mb-1">Invoice</p>
                                    <p className="text-sm font-semibold text-text-primary">{selectedDn.invoice_number || 'N/A'}</p>
                                </div>
                                <div className="bg-background rounded-lg p-4">
                                    <p className="text-xs font-medium text-text-secondary uppercase mb-1">Customer</p>
                                    <p className="text-sm font-semibold text-text-primary">{selectedDn.customer_name || selectedDn.customer?.name || 'N/A'}</p>
                                </div>
                                <div className="bg-background rounded-lg p-4">
                                    <p className="text-xs font-medium text-text-secondary uppercase mb-1">Delivery Date</p>
                                    <p className="text-sm font-semibold text-text-primary">
                                        {selectedDn.delivery_date
                                            ? format(new Date(selectedDn.delivery_date), 'MMM dd, yyyy')
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-background rounded-lg p-4">
                                    <p className="text-xs font-medium text-text-secondary uppercase mb-1">Status</p>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedDn.status)}`}>
                                        {getStatusIcon(selectedDn.status)}
                                        {selectedDn.status?.toUpperCase() || 'PENDING'}
                                    </span>
                                </div>
                            </div>

                            {/* Items */}
                            {selectedDn.items && selectedDn.items.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-text-primary mb-3">Items ({selectedDn.items.length})</h3>
                                    <div className="border border-theme-border rounded-lg overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-background">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">#</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Product</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary uppercase">Qty</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Unit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-theme-border">
                                                {selectedDn.items.map((item, index) => (
                                                    <tr key={index} className="hover:bg-card-hover">
                                                        <td className="px-4 py-2 text-sm text-text-secondary">{index + 1}</td>
                                                        <td className="px-4 py-2 text-sm font-medium text-text-primary">{item.product_name || `Product #${item.product_id}`}</td>
                                                        <td className="px-4 py-2 text-sm text-text-primary text-right">{item.quantity}</td>
                                                        <td className="px-4 py-2 text-sm text-text-secondary">{item.unit || 'pcs'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {selectedDn.notes && (
                                <div className="bg-background rounded-lg p-4">
                                    <p className="text-xs font-medium text-text-secondary uppercase mb-1">Notes</p>
                                    <p className="text-sm text-text-secondary">{selectedDn.notes}</p>
                                </div>
                            )}

                            {/* Created Info */}
                            <div className="text-xs text-text-secondary">
                                Created {selectedDn.created_at ? format(new Date(selectedDn.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                                {selectedDn.creator && ` by ${selectedDn.creator.name}`}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-theme-border flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setDetailModalOpen(false)}
                            >
                                Close
                            </Button>
                            <Button
                                onClick={() => {
                                    handleDownloadPdf(selectedDn);
                                    setDetailModalOpen(false);
                                }}
                                className="flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Download PDF
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryNotes;
