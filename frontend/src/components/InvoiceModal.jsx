import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Printer, 
  Download, 
  Calendar,
  User,
  Hash,
  DollarSign
} from 'lucide-react';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import pdfService from '../services/pdfService';
import { useSettings } from '../contexts/SettingsContext';

const InvoiceModal = ({ isOpen, onClose, invoiceId }) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoice();
    }
  }, [isOpen, invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await apiService.invoices.get(invoiceId);
      // Handle both possible response structures
      const invoiceData = response.data.data || response.data;
      setInvoice(invoiceData);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to fetch invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      if (!invoice) {
        toast.error('Invoice not loaded');
        return;
      }

      // Prepare data for PDF generation
      const items = (invoice.items || invoice.InvoiceItem || []).map((item) => ({
        ...item,
        // Provide a readable product name if not available
        product_name: item.product?.name || item.product_name || item.description || `Product #${item.product_id}`,
        // Normalize numeric fields
        quantity: parseFloat(item.quantity || 0),
        rate: parseFloat(item.rate || item.unit_price || 0),
        discount: parseFloat(item.discount || 0),
        amount: parseFloat(item.amount || item.total_price || (parseFloat(item.quantity || 0) * parseFloat(item.rate || item.unit_price || 0)))
      }));

      const invoiceForPdf = {
        ...invoice,
        items,
        currency: invoice.currency || 'QAR',
        status: (invoice.status || 'DRAFT').toLowerCase(),
        subtotal: parseFloat(invoice.subtotal || invoice.total_net || 0),
        total_discount: parseFloat(invoice.total_discount || invoice.discount || 0),
        total: parseFloat(invoice.total || invoice.total_gross || invoice.total_amount || 0),
        invoice_date: invoice.invoice_date || invoice.issue_date || new Date().toISOString().slice(0, 10),
        due_date: invoice.due_date || null
      };

      const pdfBlob = pdfService.generateInvoicePDF(invoiceForPdf, invoice.customer, settings);
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

  const handlePrintInvoice = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          aria-hidden="true"
          onClick={onClose}
        />

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {t('invoices.details.title', 'Invoice Details')}
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={onClose}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : !invoice ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">{t('invoices.details.not_found', 'Invoice not found')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invoice Info */}
                <div className="lg:col-span-2">
                  <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {invoice.invoice_number || `INV-${invoice.id}`}
                      </h2>
                      <div className="flex items-center gap-2 mt-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {invoice.issue_date 
                            ? format(new Date(invoice.issue_date), 'MMM dd, yyyy') 
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {t('invoices.details.due_date', 'Due Date')}: 
                          {invoice.due_date 
                            ? format(new Date(invoice.due_date), 'MMM dd, yyyy') 
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        (invoice.status || '').toUpperCase() === 'PAID' 
                          ? 'bg-green-100 text-green-800' 
                          : (invoice.status || '').toUpperCase() === 'OVERDUE' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {t(`invoices.status.${(invoice.status || '').toLowerCase()}`, invoice.status || 'N/A')}
                      </span>
                      <div className="mt-2 text-2xl font-bold text-gray-900">
                        QAR {parseFloat(invoice.total || invoice.total_gross || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                        {t('invoices.details.bill_to', 'Bill To')}
                      </h3>
                      {invoice.customer ? (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {invoice.customer.name}
                          </div>
                          {invoice.customer.contact && (
                            <div className="text-gray-600">{invoice.customer.contact}</div>
                          )}
                          {invoice.customer.address && (
                            <div className="text-gray-600 whitespace-pre-line">
                              {invoice.customer.address}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500">N/A</div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                        {t('invoices.details.from', 'From')}
                      </h3>
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">Dai Trading</div>
                        <div className="text-gray-600">Doha, Qatar</div>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {t('invoices.details.items', 'Items')}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('invoices.details.item', 'Item')}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('invoices.details.quantity', 'Quantity')}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('invoices.details.rate', 'Rate')}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('invoices.details.amount', 'Amount')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(invoice.items || invoice.InvoiceItem || []).map((item, index) => {
                            const productName = item.product?.name_en || item.product?.name_ar || item.product_name || item.description || (item.product_id ? `Product #${item.product_id}` : 'Unnamed Product');
                            return (
                              <tr key={index}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  <div className="font-medium">{productName}</div>
                                  {item.description && (
                                    <div className="text-xs text-gray-500">{item.description}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                                  {parseFloat(item.quantity || 0)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                                  QAR {parseFloat(item.rate || item.unit_price || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                                  QAR {parseFloat(item.amount || item.total_price || (parseFloat(item.quantity || 0) * parseFloat(item.rate || item.unit_price || 0))).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="max-w-xs ml-auto">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('invoices.details.subtotal', 'Subtotal')}</span>
                        <span className="font-medium">
                          QAR {parseFloat(invoice.subtotal || invoice.total_net || 0).toFixed(2)}
                        </span>
                      </div>
                      {(invoice.total_discount || invoice.discount || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('invoices.details.discount', 'Discount')}</span>
                          <span className="font-medium text-red-600">
                            - QAR {parseFloat(invoice.total_discount || invoice.discount || 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="text-gray-900 font-medium">{t('invoices.details.total', 'Total')}</span>
                        <span className="text-gray-900 font-bold">
                          QAR {parseFloat(invoice.total || invoice.total_gross || invoice.total_amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Additional Info */}
                <div>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                        {t('invoices.details.payment_info', 'Payment Information')}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">{t('invoices.details.payment_mode', 'Payment Mode')}</p>
                            <p className="text-sm font-medium text-gray-900">
                              {invoice.payment_mode || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">{t('invoices.details.reference', 'Reference')}</p>
                            <p className="text-sm font-medium text-gray-900">
                              {invoice.reference || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {invoice.notes && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                          {t('invoices.details.notes', 'Notes')}
                        </h3>
                        <p className="text-sm text-gray-600 whitespace-pre-line">
                          {invoice.notes}
                        </p>
                      </div>
                    )}

                    {invoice.terms && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                          {t('invoices.details.terms', 'Terms')}
                        </h3>
                        <p className="text-sm text-gray-600 whitespace-pre-line">
                          {invoice.terms}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse">
            <div className="flex justify-end space-x-2">
              <Button
                onClick={handlePrintInvoice}
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {t('common.print', 'Print')}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadInvoice}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('common.download', 'Download')}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
              >
                {t('common.close', 'Close')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;