import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    CheckCircle,
    Download
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import pdfService from '../services/pdfService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Swal from 'sweetalert2';

const Quotations = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);

    useEffect(() => {
        fetchQuotations();
    }, []);

    const fetchQuotations = async () => {
        try {
            setLoading(true);
            const response = await apiService.quotations.list({
                search: searchTerm,
                status: statusFilter !== 'all' ? statusFilter : undefined
            });
            setQuotations(response.data.data || []);
        } catch (error) {
            console.error('Error fetching quotations:', error);
            toast.error('Failed to fetch quotations');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (quotationId, newStatus) => {
        try {
            if (!quotationId || !newStatus) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Invalid quotation status update request',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
                return;
            }

            await apiService.quotations.updateStatus(quotationId, newStatus);

            setQuotations(prevQuotations =>
                prevQuotations.map(quotation =>
                    quotation.id === quotationId
                        ? { ...quotation, status: newStatus.toUpperCase() }
                        : quotation
                )
            );

            setStatusDropdownOpen(null);

            Swal.fire({
                title: 'Success!',
                text: 'Quotation status updated successfully!',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        } catch (error) {
            console.error('Error updating quotation status:', {
                quotationId,
                newStatus,
                response: error.response?.data,
                message: error.message
            });
            Swal.fire({
                title: 'Error!',
                text: error.response?.data?.message || error.response?.data?.error || 'Failed to update quotation status',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    };

    const getStatusOptions = (currentStatus) => {
        const allStatuses = [
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'converted', label: 'Converted' },
            { value: 'cancelled', label: 'Cancelled' }
        ];
        
        return allStatuses.filter(status => status.value !== currentStatus?.toLowerCase());
    };

    const toggleStatusDropdown = (quotationId) => {
        setStatusDropdownOpen(statusDropdownOpen === quotationId ? null : quotationId);
    };

    const handleDeleteQuotation = async (id) => {
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
                    await apiService.quotations.delete(id);
                    Swal.fire(
                        'Deleted!',
                        'The quotation has been deleted.',
                        'success'
                    );
                    fetchQuotations();
                } catch (error) {
                    console.error('Error deleting quotation:', error);
                    Swal.fire(
                        'Error!',
                        'Failed to delete quotation',
                        'error'
                    );
                }
            }
        });
    };

    const handleConvertToInvoice = async (id) => {
        Swal.fire({
            title: 'Convert to Invoice?',
            text: 'Do you want to convert this quotation to an invoice?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, convert it!',
            cancelButtonText: 'Cancel'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await apiService.quotations.convert(id);
                    Swal.fire(
                        'Converted!',
                        'The quotation has been converted to an invoice.',
                        'success'
                    );
                    navigate(`/invoices/edit/${response.data.invoiceId}`);
                } catch (error) {
                    console.error('Error converting quotation:', error);
                    Swal.fire(
                        'Error!',
                        error.response?.data?.message || 'Failed to convert quotation',
                        'error'
                    );
                }
            }
        });
    };

    const handleDownloadQuotationPDF = async (quotationId) => {
        try {
            // Fetch full quotation details for PDF generation
            const response = await apiService.quotations.get(quotationId);
            const quotation = response.data?.data || response.data;
            
            if (!quotation) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Quotation not found',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
                return;
            }

            // Normalize quotation items for PDF generation
            const items = (quotation.items || []).map((item, index) => ({
                ...item,
                id: item.id || index + 1,
                product_name: item.product_name || item.name || item.description || 'Item',
                description: item.description || item.product?.name_en || item.product?.name_ar || '',
                quantity: parseFloat(item.quantity || 0),
                unit_price: parseFloat(item.unit_price || item.rate || 0),
                total_price: parseFloat(item.total_price || item.amount || (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || item.rate || 0)))
            }));

            // Compose quotation data for PDF service
            const quotationForPdf = {
                ...quotation,
                items,
                currency: quotation.currency || 'QAR',
                status: (quotation.status || 'DRAFT').toLowerCase(),
                subtotal: parseFloat(quotation.subtotal || quotation.total_net || 0),
                total_discount: parseFloat(quotation.total_discount || quotation.discount || 0),
                total: parseFloat(quotation.total || quotation.total_gross || 0),
                quotation_date: quotation.quotation_date || new Date().toISOString().slice(0, 10),
                expiry_date: quotation.expiry_date || null,
                quotation_number: quotation.quotation_number || `QT-${quotation.id}`
            };

            // Generate PDF using frontend service
            const pdfBlob = pdfService.generateQuotationPDF(
                quotationForPdf,
                quotation.customer,
                null // settings can be passed here if needed
            );
            
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `quotation-${quotation.quotation_number || quotationId}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            Swal.fire({
                title: 'Success!',
                text: 'Quotation downloaded successfully!',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        } catch (error) {
            console.error('Error generating quotation PDF:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to generate quotation PDF',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'ACCEPTED':
            case 'CONVERTED':
                return 'bg-green-100 text-green-800';
            case 'SENT':
                return 'bg-blue-100 text-blue-800';
            case 'REJECTED':
            case 'EXPIRED':
                return 'bg-red-100 text-red-800';
            case 'DRAFT':
            default:
                return 'bg-card-hover text-text-primary';
        }
    };

    const filteredQuotations = quotations.filter(quotation => {
        const matchesSearch = !searchTerm ||
            quotation.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            quotation.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter.toUpperCase();

        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">
                        Quotations
                    </h1>
                    <p className="text-text-secondary mt-1">
                        Manage customer quotations
                    </p>
                </div>
                <Button
                    onClick={() => navigate('/quotations/create')}
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Quotation
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search quotations..."
                            className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                        <select
                            className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                            <option value="converted">Converted</option>
                        </select>
                    </div>

                    <Button
                        onClick={fetchQuotations}
                        variant="outline"
                        className="flex items-center justify-center gap-2"
                    >
                        <Search className="w-4 h-4" />
                        Search
                    </Button>
                </div>
            </Card>

            {/* Quotations List */}
            <Card>
                <div className="p-6 border-b border-theme-border">
                    <h2 className="text-lg font-semibold text-text-primary">
                        Recent Quotations
                    </h2>
                </div>

                {filteredQuotations.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-text-primary mb-2">
                            No quotations found
                        </h3>
                        <p className="text-text-secondary">
                            No quotations match your current filters.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-background">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Number
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                        Amount
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
                                {filteredQuotations.map((quotation) => (
                                    <tr key={quotation.id} className="hover:bg-card-hover">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div
                                                className="text-sm font-medium text-text-primary hover:text-green-600 cursor-pointer"
                                                onClick={() => navigate(`/quotations/edit/${quotation.id}`)}
                                            >
                                                {quotation.quotation_number}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-text-primary">
                                                {quotation.customer?.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-text-secondary">
                                                {quotation.quotation_date ? format(new Date(quotation.quotation_date), 'MMM dd, yyyy') : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-text-primary">
                                                {quotation.currency} {parseFloat(quotation.total_gross || 0).toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quotation.status)}`}>
                                                    {quotation.status}
                                                </span>
                                                <div className="relative">
                                                    <button 
                                                        onClick={() => toggleStatusDropdown(quotation.id)}
                                                        className="text-text-secondary hover:text-text-secondary focus:outline-none"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    {statusDropdownOpen === quotation.id && (
                                                        <div className="absolute right-0 mt-1 w-48 bg-card rounded-md shadow-lg py-1 z-10 border border-theme-border">
                                                            {getStatusOptions(quotation.status).map(option => (
                                                                <button
                                                                    key={option.value}
                                                                    onClick={() => {
                                                                        handleStatusChange(quotation.id, option.value);
                                                                    }}
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
                                                {quotation.status !== 'CONVERTED' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleConvertToInvoice(quotation.id)}
                                                        className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                        title="Convert to Invoice"
                                                    >
                                                        <CheckCircle className="w-3 h-3" />
                                                        Convert
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDownloadQuotationPDF(quotation.id)}
                                                    className="flex items-center gap-1 text-green-600 border-green-200 hover:bg-green-50"
                                                    title="Download PDF"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    PDF
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => navigate(`/quotations/edit/${quotation.id}`)}
                                                    className="flex items-center gap-1"
                                                >
                                                    <Edit className="w-3 h-3" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDeleteQuotation(quotation.id)}
                                                    className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    Delete
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
        </div>
    );
};

export default Quotations;
