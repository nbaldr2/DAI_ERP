import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2 } from 'lucide-react';
import Button from './Button';
import Card from './Card';
import apiService from '../services/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const InvoiceForm = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_number: `INV-${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`,
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(new Date().setDate(new Date().getDate() + 30)), 'yyyy-MM-dd'),
    prevent_reminders: false,
    payment_modes: ['bank', 'cash', 'check'],
    currency: 'QAR',
    sale_agent: '',
    discount_type: 'none',
    discount_value: 0,
    admin_note: '',
    client_note: '',
    terms: '',
    items: [{
      product_id: '',
      description: '',
      quantity: 1,
      rate: 0,
      tax: 0,
      amount: 0
    }]
  });

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await apiService.customers.list({ limit: 100 });
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await apiService.products.list({ limit: 100 });
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCustomerChange = async (customerId) => {
    setFormData({
      ...formData,
      customer_id: customerId
    });

    if (customerId) {
      try {
        const response = await apiService.customers.get(customerId);
        setSelectedCustomer(response.data);
      } catch (error) {
        console.error('Error fetching customer details:', error);
        toast.error('Failed to load customer details');
      }
    } else {
      setSelectedCustomer(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;

    // Calculate amount
    if (field === 'quantity' || field === 'rate') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(updatedItems[index].quantity) || 0;
      const rate = field === 'rate' ? parseFloat(value) || 0 : parseFloat(updatedItems[index].rate) || 0;
      updatedItems[index].amount = quantity * rate;
    }

    // If product_id changed, fetch product details
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id.toString() === value.toString());
      if (product) {
        updatedItems[index].description = product.description || product.name;
        updatedItems[index].rate = product.selling_price || 0;
        updatedItems[index].quantity = 1;
        updatedItems[index].amount = product.selling_price || 0;
      }
    }

    setFormData({
      ...formData,
      items: updatedItems
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_id: '',
          description: '',
          quantity: 1,
          rate: 0,
          tax: 0,
          amount: 0
        }
      ]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) {
      toast.error('Invoice must have at least one item');
      return;
    }

    const updatedItems = [...formData.items];
    updatedItems.splice(index, 1);
    setFormData({
      ...formData,
      items: updatedItems
    });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (formData.discount_type === 'none' || !formData.discount_value) return 0;
    
    if (formData.discount_type === 'percentage') {
      return subtotal * (parseFloat(formData.discount_value) / 100);
    } else {
      return parseFloat(formData.discount_value) || 0;
    }
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    return subtotal - discount;
  };

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }

    if (formData.items.some(item => !item.product_id)) {
      toast.error('All items must have a product selected');
      return;
    }

    try {
      setLoading(true);
      
      const invoiceData = {
        ...formData,
        status: isDraft ? 'draft' : 'pending',
        total_amount: calculateTotal()
      };
      
      const response = await apiService.invoices.create(invoiceData);
      toast.success(isDraft ? 'Invoice saved as draft' : 'Invoice created successfully');
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('invoices.create_title', 'Create New Invoice')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-8">
          {/* 1. Customer Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('invoices.customer_info', 'Customer Information')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.customer', 'Customer')}
                </label>
                <select
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  disabled={loadingCustomers}
                  required
                >
                  <option value="">{t('common.select', 'Select...')}</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedCustomer && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {t('invoices.bill_to', 'Bill To')}
                  </h4>
                  <p className="text-sm text-gray-600">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer.address}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer.contact}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {t('invoices.ship_to', 'Ship To')}
                  </h4>
                  <p className="text-sm text-gray-600">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer.address}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer.contact}</p>
                </div>
              </div>
            )}
          </Card>

          {/* 2. Invoice Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('invoices.details', 'Invoice Details')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.invoice_number', 'Invoice Number')}
                </label>
                <input
                  type="text"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.invoice_date', 'Invoice Date')}
                </label>
                <input
                  type="date"
                  name="invoice_date"
                  value={formData.invoice_date}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.due_date', 'Due Date')}
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="prevent_reminders"
                  checked={formData.prevent_reminders}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {t('invoices.prevent_reminders', 'Prevent sending overdue reminders')}
                </span>
              </label>
            </div>
          </Card>

          {/* 3. Payment and Currency Settings */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('invoices.payment_settings', 'Payment and Currency Settings')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.payment_modes', 'Allowed Payment Modes')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.payment_modes.includes('bank')}
                      onChange={(e) => {
                        const updatedModes = e.target.checked
                          ? [...formData.payment_modes, 'bank']
                          : formData.payment_modes.filter(mode => mode !== 'bank');
                        setFormData({ ...formData, payment_modes: updatedModes });
                      }}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{t('payment_modes.bank', 'Bank')}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.payment_modes.includes('cash')}
                      onChange={(e) => {
                        const updatedModes = e.target.checked
                          ? [...formData.payment_modes, 'cash']
                          : formData.payment_modes.filter(mode => mode !== 'cash');
                        setFormData({ ...formData, payment_modes: updatedModes });
                      }}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{t('payment_modes.cash', 'Cash')}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.payment_modes.includes('check')}
                      onChange={(e) => {
                        const updatedModes = e.target.checked
                          ? [...formData.payment_modes, 'check']
                          : formData.payment_modes.filter(mode => mode !== 'check');
                        setFormData({ ...formData, payment_modes: updatedModes });
                      }}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{t('payment_modes.check', 'Check')}</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.currency', 'Currency')}
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  disabled
                >
                  <option value="QAR">QAR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{t('invoices.currency_note', 'Automatically set to QAR')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.sale_agent', 'Sale Agent')}
                </label>
                <input
                  type="text"
                  name="sale_agent"
                  value={formData.sale_agent}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.discount_type', 'Discount Type')}
                </label>
                <div className="flex items-center space-x-4">
                  <select
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="none">{t('discount_types.none', 'No Discount')}</option>
                    <option value="percentage">{t('discount_types.percentage', 'Percentage (%)')}</option>
                    <option value="fixed">{t('discount_types.fixed', 'Fixed Amount')}</option>
                  </select>
                  {formData.discount_type !== 'none' && (
                    <input
                      type="number"
                      name="discount_value"
                      value={formData.discount_value}
                      onChange={handleInputChange}
                      className="w-1/3 p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      min="0"
                      step={formData.discount_type === 'percentage' ? '0.01' : '1'}
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.admin_note', 'Admin Note')}
                </label>
                <textarea
                  name="admin_note"
                  value={formData.admin_note}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  rows="2"
                  placeholder={t('invoices.admin_note_placeholder', 'Internal note (not visible to client)')}
                ></textarea>
              </div>
            </div>
          </Card>

          {/* 4. Itemized Billing Section */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('invoices.items', 'Itemized Billing')}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('invoices.item', 'Item')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('invoices.description', 'Description')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('invoices.quantity', 'Quantity')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('invoices.rate', 'Rate')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('invoices.tax', 'Tax')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('invoices.amount', 'Amount')}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="px-4 py-2">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          disabled={loadingProducts}
                          required
                        >
                          <option value="">{t('common.select', 'Select...')}</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          placeholder={t('invoices.description_placeholder', 'Description')}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          min="1"
                          step="1"
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          min="0"
                          step="0.01"
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.tax}
                          onChange={(e) => handleItemChange(index, 'tax', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.amount}
                          className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md"
                          readOnly
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 focus:outline-none"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('invoices.add_item', 'Add Item')}
              </Button>
            </div>
          </Card>

          {/* 5. Calculations Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('invoices.summary', 'Calculations Summary')}
            </h3>
            <div className="flex flex-col items-end">
              <div className="w-full md:w-1/3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('invoices.subtotal', 'Subtotal')}:</span>
                  <span className="text-sm font-medium">{formData.currency} {calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('invoices.discount', 'Discount')}:</span>
                  <span className="text-sm font-medium">{formData.currency} {calculateDiscount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-base font-medium">{t('invoices.total', 'Total')}:</span>
                  <span className="text-base font-bold">{formData.currency} {calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* 6. Notes */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('invoices.notes', 'Notes')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.client_note', 'Client Note')}
                </label>
                <textarea
                  name="client_note"
                  value={formData.client_note}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  rows="3"
                  placeholder={t('invoices.client_note_placeholder', 'Note visible to the client')}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.terms', 'Terms & Conditions')}
                </label>
                <textarea
                  name="terms"
                  value={formData.terms}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  rows="3"
                  placeholder={t('invoices.terms_placeholder', 'Standard terms and conditions')}
                ></textarea>
              </div>
            </div>
          </Card>

          {/* 7. Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading}
            >
              {t('invoices.save_draft', 'Save as Draft')}
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {t('invoices.save', 'Save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceForm;