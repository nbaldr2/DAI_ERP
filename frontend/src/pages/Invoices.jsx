import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
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
  Edit
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import InvoiceModal from '../components/InvoiceModal';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import pdfService from '../services/pdfService';
import { useSettings } from '../contexts/SettingsContext';

const Invoices = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await apiService.invoices.list({
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date_range: dateRange !== 'all' ? dateRange : undefined
      });
      setInvoices(response.data.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleEditInvoice = (invoiceId) => {
    navigate(`/invoices/edit/${invoiceId}`);
  };

  const handleViewInvoice = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setIsModalOpen(true);
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      // Fetch full invoice details for PDF generation
      const response = await apiService.invoices.get(invoiceId);
      const invoice = response.data?.data || response.data;

      if (!invoice) {
        toast.error('Invoice not found');
        return;
      }

      // Normalize items for PDF
      const items = (invoice.items || invoice.InvoiceItem || []).map((item) => ({
        ...item,
        product_name:
          item.product?.name ||
          item.product_name ||
          item.description ||
          `Product #${item.product_id}`,
        quantity: parseFloat(item.quantity || 0),
        rate: parseFloat(item.rate || item.unit_price || 0),
        discount: parseFloat(item.discount || 0),
        amount: parseFloat(
          item.amount ||
            item.total_price ||
            (parseFloat(item.quantity || 0) * parseFloat(item.rate || item.unit_price || 0))
        ),
      }));

      // Compose invoice data for PDF service
      const invoiceForPdf = {
        ...invoice,
        items,
        currency: invoice.currency || 'QAR',
        status: (invoice.status || 'DRAFT').toLowerCase(),
        subtotal: parseFloat(invoice.subtotal || invoice.total_net || 0),
        total_discount: parseFloat(invoice.total_discount || invoice.discount || 0),
        total: parseFloat(
          invoice.total || invoice.total_gross || invoice.total_amount || 0
        ),
        invoice_date:
          invoice.invoice_date || invoice.issue_date || new Date().toISOString().slice(0, 10),
        due_date: invoice.due_date || null,
      };

      // Generate PDF using frontend service (keeps styling consistent)
      const pdfBlob = pdfService.generateInvoicePDF(
        invoiceForPdf,
        invoice.customer,
        settings
      );
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoice_number || invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      toast.error('Failed to generate invoice PDF');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchTerm ||
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

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
          <h1 className="text-2xl font-bold text-gray-900">
            {t('invoices.title', 'Invoices')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('invoices.subtitle', 'Manage invoices and billing')}
          </p>
        </div>
        <Button
          onClick={() => navigate('/invoices/create')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('invoices.create', 'Create Invoice')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('invoices.search', 'Search invoices...')}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t('common.all_status', 'All Status')}</option>
              <option value="draft">{t('invoices.status.draft', 'Draft')}</option>
              <option value="pending">{t('invoices.status.pending', 'Pending')}</option>
              <option value="paid">{t('invoices.status.paid', 'Paid')}</option>
              <option value="overdue">{t('invoices.status.overdue', 'Overdue')}</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">{t('common.all_dates', 'All Dates')}</option>
              <option value="today">{t('common.today', 'Today')}</option>
              <option value="week">{t('common.this_week', 'This Week')}</option>
              <option value="month">{t('common.this_month', 'This Month')}</option>
              <option value="quarter">{t('common.this_quarter', 'This Quarter')}</option>
            </select>
          </div>

          <Button
            onClick={fetchInvoices}
            variant="outline"
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
              <p className="text-sm font-medium text-gray-600">
                {t('invoices.stats.total', 'Total Invoices')}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {invoices.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t('invoices.stats.pending', 'Pending')}
              </p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {invoices.filter(inv => inv.status === 'pending').length}
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
              <p className="text-sm font-medium text-gray-600">
                {t('invoices.stats.paid', 'Paid')}
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {invoices.filter(inv => inv.status === 'paid').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t('invoices.stats.overdue', 'Overdue')}
              </p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {invoices.filter(inv => inv.status === 'overdue').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('invoices.list.title', 'Recent Invoices')}
          </h2>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('invoices.empty.title', 'No invoices found')}
            </h3>
            <p className="text-gray-600">
              {t('invoices.empty.description', 'No invoices match your current filters.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('invoices.table.invoice_number', 'Invoice #')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('invoices.table.customer', 'Customer')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('invoices.table.date', 'Date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('invoices.table.amount', 'Amount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('invoices.table.status', 'Status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="text-sm font-medium text-gray-900 hover:text-green-600 cursor-pointer"
                        onClick={() => handleEditInvoice(invoice.id)}
                      >
                        {invoice.invoice_number || `INV-${invoice.id}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          {invoice.customer?.name || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {invoice.created_at ? format(new Date(invoice.created_at), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                      QAR   <b>{parseFloat(invoice.total || invoice.total_gross || 0).toFixed(2)}</b>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {t(`invoices.status.${invoice.status}`, invoice.status?.toUpperCase() || 'DRAFT')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditInvoice(invoice.id)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          {t('common.edit', 'Edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          {t('common.view', 'View')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          {t('common.download', 'Download')}
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

      {/* Invoice Modal */}
      <InvoiceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        invoiceId={selectedInvoiceId} 
      />
    </div>
  );
};

export default Invoices;