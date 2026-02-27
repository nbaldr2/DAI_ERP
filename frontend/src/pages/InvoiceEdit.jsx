import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, FileText, ArrowLeft, Save } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import apiService from "../services/api";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { format } from "date-fns";
import pdfService from "../services/pdfService";

const InvoiceEdit = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(true);

  const [formData, setFormData] = useState({
    customer_id: "",
    invoice_number: "",
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(
      new Date(new Date().setDate(new Date().getDate() + 30)),
      "yyyy-MM-dd",
    ),
    prevent_reminders: false,
    payment_mode: "",
    currency: "QAR",
    sale_agent: user?.username || "",
    discount_type: "none",
    discount_value: 0,
    admin_note: "",
    client_note: "",
    terms: "",
    items: [
      {
        product_id: "",
        description: "",
        quantity: 1,
        rate: 0,
        discount: 0,
        amount: 0,
      },
    ],
  });

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    if (id) {
      fetchInvoice(id);
    }
  }, [id]);


  // Debounced product search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (productSearch) {
        fetchProducts(productSearch);
      } else {
        fetchProducts();
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [productSearch]);

  const fetchInvoice = async (invoiceId) => {
    try {
      setInvoiceLoading(true);
      const response = await apiService.invoices.get(invoiceId);
      const invoice = response.data?.data;

      // Map invoice data to form data
      const itemsSource = Array.isArray(invoice.items)
        ? invoice.items
        : (invoice.InvoiceItem || []);

      const mappedData = {
        customer_id: invoice.customer_id || "",
        invoice_number: invoice.invoice_number || "",
        invoice_date: invoice.invoice_date ? format(new Date(invoice.invoice_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        due_date: invoice.due_date ? format(new Date(invoice.due_date), "yyyy-MM-dd") : format(new Date(new Date().setDate(new Date().getDate() + 30)), "yyyy-MM-dd"),
        prevent_reminders: false,
        payment_mode: invoice.payment_mode || "",
        currency: invoice.currency || "QAR",
        sale_agent: invoice.sale_agent || user?.username || "",
        discount_type: invoice.discount_type || "none",
        discount_value: invoice.discount_value || 0,
        admin_note: invoice.admin_note || "",
        client_note: invoice.client_note || "",
        terms: invoice.terms || "",
        items: itemsSource.length > 0
          ? itemsSource.map(item => {
            const product = item.product || {};
            const bilingualName = product.name_ar
              ? `${product.name_en || ''} - ${product.name_ar}`.trim()
              : (product.name_en || product.name_ar || '');
            const description = item.description || bilingualName || '';
            const quantity = parseFloat(item.quantity) || 1;
            const rate = parseFloat(item.rate ?? item.unit_price ?? 0) || 0;
            const discount = parseFloat(item.discount) || 0;
            const amount = parseFloat(
              item.amount ?? item.total_price ?? (quantity * rate)
            ) || 0;
            return {
              product_id: item.product_id ?? product.id ?? "",
              description,
              quantity,
              rate,
              discount,
              amount,
            };
          })
          : [
            {
              product_id: "",
              description: "",
              quantity: 1,
              rate: 0,
              discount: 0,
              amount: 0,
            },
          ],
      };

      setFormData(mappedData);

      // Fetch customer details if customer_id exists
      if (invoice.customer_id) {
        try {
          const customerResponse = await apiService.customers.get(invoice.customer_id);
          setSelectedCustomer(customerResponse.data);
        } catch (error) {
          console.error("Error fetching customer details:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast.error("Failed to load invoice");
      navigate("/invoices");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await apiService.customers.list({ limit: 100 });
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchProducts = async (searchTerm = '') => {
    try {
      setLoadingProducts(true);
      const params = { limit: 100 };
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await apiService.products.list(params);
      setProducts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCustomerChange = async (customerId) => {
    setFormData({
      ...formData,
      customer_id: customerId,
    });

    if (customerId) {
      try {
        const response = await apiService.customers.get(customerId);
        setSelectedCustomer(response.data);
      } catch (error) {
        console.error("Error fetching customer details:", error);
        toast.error("Failed to load customer details");
      }
    } else {
      setSelectedCustomer(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleItemChange = async (index, field, value) => {
    const updatedItems = [...formData.items];

    // Ensure value is never undefined
    const safeValue = value === undefined ? '' : value;
    updatedItems[index][field] = safeValue;

    // Calculate amount with discount applied
    if (field === "quantity" || field === "rate" || field === "discount") {
      const quantity =
        field === "quantity"
          ? parseFloat(safeValue) || 0
          : parseFloat(updatedItems[index].quantity) || 0;
      const rate =
        field === "rate"
          ? parseFloat(safeValue) || 0
          : parseFloat(updatedItems[index].rate) || 0;
      const discount =
        field === "discount"
          ? parseFloat(safeValue) || 0
          : parseFloat(updatedItems[index].discount) || 0;
      const baseAmount = quantity * rate;
      const discountAmount = baseAmount * (discount / 100);
      updatedItems[index].amount = baseAmount - discountAmount;
    }

    // If product_id changed, fetch product details
    if (field === "product_id" && safeValue) {
      try {
        // Fetch the specific product to get the latest price
        const response = await apiService.products.get(safeValue);
        const product = response.data?.data || response.data;

        if (product) {
          // Use product description if available
          const description = product.description || '';
          updatedItems[index].description = description;
          updatedItems[index].rate = product.price_per_unit || 0;

          // Recalculate amount with the new rate
          const quantity = parseFloat(updatedItems[index].quantity) || 0;
          const rate = parseFloat(product.price_per_unit) || 0;
          const discount = parseFloat(updatedItems[index].discount) || 0;
          const baseAmount = quantity * rate;
          const discountAmount = baseAmount * (discount / 100);
          updatedItems[index].amount = baseAmount - discountAmount;
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
        toast.error("Failed to fetch product details");

        // Fallback to cached product data
        const product = products.find(
          (p) => p.id.toString() === safeValue.toString(),
        );
        if (product) {
          // Use product description if available, otherwise fallback to bilingual name
          const description = product.description || (product.name_ar
            ? `${product.name_en} - ${product.name_ar}`
            : product.name_en || '');
          updatedItems[index].description = description;
          updatedItems[index].rate = product.price_per_unit || 0;

          // Recalculate amount with the new rate
          const quantity = parseFloat(updatedItems[index].quantity) || 0;
          const rate = parseFloat(product.price_per_unit) || 0;
          const discount = parseFloat(updatedItems[index].discount) || 0;
          const baseAmount = quantity * rate;
          const discountAmount = baseAmount * (discount / 100);
          updatedItems[index].amount = baseAmount - discountAmount;
        }
      }
    }

    setFormData(prevFormData => ({
      ...prevFormData,
      items: updatedItems,
    }));
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_id: "",
          description: "",
          quantity: 1,
          rate: 0,
          discount: 0,
          amount: 0,
        },
      ],
    });
  };

  const removeItem = (index) => {
    if (formData.items.length <= 1) {
      toast.error(t('invoices.items.min_required', 'At least one item is required'));
      return;
    }

    const updatedItems = [...formData.items];
    updatedItems.splice(index, 1);
    setFormData({
      ...formData,
      items: updatedItems,
    });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const calculateTotalDiscount = () => {
    if (formData.discount_type === 'percentage') {
      return (calculateSubtotal() * (parseFloat(formData.discount_value) || 0)) / 100;
    } else if (formData.discount_type === 'fixed') {
      return parseFloat(formData.discount_value) || 0;
    }
    return 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateTotalDiscount();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.customer_id) {
      toast.error(t('invoices.validation.customer_required', 'Please select a customer'));
      return;
    }

    if (formData.items.some(item => !item.description || parseFloat(item.quantity) <= 0 || parseFloat(item.rate) <= 0)) {
      toast.error(t('invoices.validation.items_required', 'Please fill in all item details'));
      return;
    }

    try {
      setLoading(true);

      // Prepare data for submission
      const submitData = {
        customer_id: formData.customer_id,
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        payment_mode: formData.payment_mode,
        currency: formData.currency,
        sale_agent: formData.sale_agent,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value) || 0,
        subtotal: calculateSubtotal(),
        total_discount: calculateTotalDiscount(),
        total: calculateTotal(),
        admin_note: formData.admin_note,
        client_note: formData.client_note,
        terms: formData.terms,
        items: formData.items.map(item => ({
          product_id: item.product_id || null,
          description: item.description,
          quantity: parseFloat(item.quantity) || 0,
          rate: parseFloat(item.rate) || 0,
          discount: parseFloat(item.discount) || 0,
          amount: parseFloat(item.amount) || 0,
        })),
      };

      const response = await apiService.invoices.update(id, submitData);
      toast.success(t('invoices.edit.success', 'Invoice updated successfully'));
      navigate("/invoices");
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error(t('invoices.edit.error', 'Failed to update invoice'));
    } finally {
      setLoading(false);
    }
  };

  if (invoiceLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate("/invoices")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back', 'Back')}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t('invoices.edit.title', 'Edit Invoice')}
          </h1>
          <p className="text-text-secondary mt-1">
            {t('invoices.edit.subtitle', 'Modify invoice details')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Customer and Invoice Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('invoices.fields.customer', 'Customer')} *
                </label>
                {loadingCustomers ? (
                  <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
                ) : (
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">{t('common.select', 'Select')}...</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Customer Details */}
              {selectedCustomer && (
                <Card className="p-4">
                  <h3 className="font-medium text-text-primary mb-2">
                    {t('invoices.customer_details', 'Customer Details')}
                  </h3>
                  <div className="text-sm text-text-secondary space-y-1">
                    <p>{selectedCustomer.name}</p>
                    {selectedCustomer.contact && <p>{selectedCustomer.contact}</p>}
                    {selectedCustomer.address && (
                      <p className="whitespace-pre-line">{selectedCustomer.address}</p>
                    )}
                  </div>
                </Card>
              )}

              {/* Invoice Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('invoices.fields.invoice_date', 'Invoice Date')} *
                  </label>
                  <input
                    type="date"
                    name="invoice_date"
                    value={formData.invoice_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('invoices.fields.due_date', 'Due Date')} *
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Payment Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('invoices.fields.payment_mode', 'Payment Mode')}
                  </label>
                  <select
                    name="payment_mode"
                    value={formData.payment_mode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">{t('common.select', 'Select')}...</option>
                    <option value="cash">{t('invoices.payment_modes.cash', 'Cash')}</option>
                    <option value="bank_transfer">{t('invoices.payment_modes.bank_transfer', 'Bank Transfer')}</option>
                    <option value="credit_card">{t('invoices.payment_modes.credit_card', 'Credit Card')}</option>
                    <option value="cheque">{t('invoices.payment_modes.cheque', 'Cheque')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('invoices.fields.sale_agent', 'Sale Agent')}
                  </label>
                  <input
                    type="text"
                    name="sale_agent"
                    value={formData.sale_agent}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-text-primary">
                    {t('invoices.items.title', 'Items')}
                  </h3>
                  <Button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('invoices.items.add', 'Add Item')}
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5">
                          <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('invoices.items.description', 'Description')} *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              placeholder="Search products..."
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent mb-2"
                            />
                            <select
                              value={item.product_id}
                              onChange={async (e) => {
                                await handleItemChange(index, 'product_id', e.target.value);
                                setProductSearch(''); // Clear search after selection
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                              <option value="">{t('common.select', 'Select product')}...</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name_en} {product.name_ar ? ` - ${product.name_ar}` : ''} (QAR {product.price_per_unit})
                                </option>
                              ))}
                            </select>
                            {loadingProducts && (
                              <div className="absolute inset-0 bg-card bg-opacity-70 flex items-center justify-center rounded">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                              </div>
                            )}



                          </div>
                          <textarea
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder={t('invoices.items.description_placeholder', 'Item description')}
                            className="w-full mt-2 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            rows="2"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('invoices.items.quantity', 'Qty')} *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('invoices.items.rate', 'Rate')} (QAR) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('invoices.items.discount', 'Discount')} (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="w-full"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 text-right text-sm font-medium text-text-primary">
                        {t('invoices.items.amount', 'Amount')}: QAR {parseFloat(item.amount || 0).toFixed(2)}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Summary and Notes */}
            <div className="space-y-6">
              {/* Invoice Summary */}
              <Card className="p-4">
                <h3 className="font-medium text-text-primary mb-4">
                  {t('invoices.summary.title', 'Invoice Summary')}
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">{t('invoices.summary.subtotal', 'Subtotal')}</span>
                    <span>QAR {calculateSubtotal().toFixed(2)}</span>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-text-secondary">{t('invoices.summary.discount', 'Discount')}</span>
                      <span>
                        <select
                          name="discount_type"
                          value={formData.discount_type}
                          onChange={handleInputChange}
                          className="text-sm border-none bg-transparent focus:ring-0 p-0"
                        >
                          <option value="none">{t('invoices.discount_types.none', 'None')}</option>
                          <option value="percentage">{t('invoices.discount_types.percentage', 'Percentage')}</option>
                          <option value="fixed">{t('invoices.discount_types.fixed', 'Fixed Amount')}</option>
                        </select>
                      </span>
                    </div>
                    {formData.discount_type !== 'none' && (
                      <div className="flex gap-2">
                        {formData.discount_type === 'percentage' && (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            name="discount_value"
                            value={formData.discount_value}
                            onChange={handleInputChange}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        )}
                        {formData.discount_type === 'fixed' && (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="discount_value"
                            value={formData.discount_value}
                            onChange={handleInputChange}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        )}
                        <span className="flex items-center">
                          {formData.discount_type === 'percentage' ? '%' : 'QAR'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-2 border-t border-theme-border">
                    <span className="font-medium">{t('invoices.summary.total', 'Total')}</span>
                    <span className="font-bold">QAR {calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </Card>

              {/* Notes */}
              <Card className="p-4">
                <h3 className="font-medium text-text-primary mb-3">
                  {t('invoices.notes.title', 'Notes')}
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      {t('invoices.notes.admin', 'Admin Notes')}
                    </label>
                    <textarea
                      name="admin_note"
                      value={formData.admin_note}
                      onChange={handleInputChange}
                      placeholder={t('invoices.notes.admin_placeholder', 'Notes for internal use')}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      {t('invoices.notes.client', 'Client Notes')}
                    </label>
                    <textarea
                      name="client_note"
                      value={formData.client_note}
                      onChange={handleInputChange}
                      placeholder={t('invoices.notes.client_placeholder', 'Notes visible to client')}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      {t('invoices.notes.terms', 'Terms & Conditions')}
                    </label>
                    <textarea
                      name="terms"
                      value={formData.terms}
                      onChange={handleInputChange}
                      placeholder={t('invoices.notes.terms_placeholder', 'Terms and conditions')}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows="3"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  {t('common.saving', 'Saving...')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('common.save', 'Save')}
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div >
  );
};

export default InvoiceEdit;