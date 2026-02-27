import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, FileText, ArrowLeft } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import apiService from "../services/api";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { format } from "date-fns";
import pdfService from "../services/pdfService";
import { useSettings } from "../contexts/SettingsContext";

const InvoiceCreate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: "",
    invoice_number: "INV-250001",
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(
      new Date(new Date().setDate(new Date().getDate() + 30)),
      "yyyy-MM-dd",
    ),
    prevent_reminders: false,
    payment_mode: "customer_balance", // Set customer_balance as default payment mode
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
    fetchNextInvoiceNumber();
  }, []);


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

  const fetchNextInvoiceNumber = async () => {
    try {
      const response = await apiService.invoices.getNextNumber();
      console.log("Next invoice number response:", response);
      if (response.data.success) {
        setFormData(prev => ({
          ...prev,
          invoice_number: response.data.data.next_invoice_number
        }));
      } else if (response.data.next_number) {
        // Fallback for old API structure
        setFormData(prev => ({
          ...prev,
          invoice_number: `INV-${response.data.next_number.toString().padStart(6, '0')}`
        }));
      }
    } catch (error) {
      console.error("Error fetching next invoice number:", error);
      // Keep the default number if fetch fails
    }
  };

  const handleCustomerChange = async (customerId) => {
    console.log("Selected customer ID:", customerId);

    setFormData({
      ...formData,
      customer_id: customerId,
    });

    if (customerId) {
      try {
        const response = await apiService.customers.get(customerId);
        console.log("Raw customer response:", response);

        // Check if response.data exists and has the expected structure
        if (response && response.data && response.data.data) {
          const customer = response.data.data;
          console.log("Customer data:", customer);

          // Ensure all customer fields are properly set with default values if missing
          const customerData = {
            id: customer.id || null,
            name: customer.name || '',
            contact: customer.contact || '',
            address: customer.address || '',
            type: customer.type || '',
            balance: customer.balance !== undefined ? parseFloat(customer.balance) || 0 : 0,
            credit_limit: customer.credit_limit !== undefined ? parseFloat(customer.credit_limit) || 0 : 0
          };

          console.log("Processed customer data:", customerData);
          setSelectedCustomer(customerData);
        } else if (response && response.data) {
          // Handle case where data is directly in response.data
          const customer = response.data;
          console.log("Customer data (direct):", customer);

          // Ensure all customer fields are properly set with default values if missing
          const customerData = {
            id: customer.id || null,
            name: customer.name || '',
            contact: customer.contact || '',
            address: customer.address || '',
            type: customer.type || '',
            balance: customer.balance !== undefined ? parseFloat(customer.balance) || 0 : 0,
            credit_limit: customer.credit_limit !== undefined ? parseFloat(customer.credit_limit) || 0 : 0
          };

          console.log("Processed customer data:", customerData);
          setSelectedCustomer(customerData);
        } else {
          console.error("Invalid customer response structure:", response);
          toast.error("Invalid customer data received");
          setSelectedCustomer(null);
        }
      } catch (error) {
        console.error("Error fetching customer details:", error);
        toast.error("Failed to load customer details");
        setSelectedCustomer(null);
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
    console.log('handleItemChange called:', { index, field, value });

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
      const discountAmount = discount;
      updatedItems[index].amount = parseFloat((baseAmount - discountAmount).toFixed(2));
    }

    // If product_id changed, fetch product details
    if (field === "product_id" && safeValue) {
      console.log('Fetching product details for ID:', safeValue);
      try {
        // Fetch the specific product to get the latest price
        const response = await apiService.products.get(safeValue);
        const product = response.data?.data || response.data;

        if (product) {
          console.log('Product found:', product);
          // Use product description if available
          const description = product.description || '';
          updatedItems[index].description = description;
          updatedItems[index].rate = product.price_per_unit || 0;
          updatedItems[index].quantity = 1;
          updatedItems[index].discount = 0;

          // Recalculate amount with the new rate
          const quantity = parseFloat(updatedItems[index].quantity) || 0;
          const rate = parseFloat(product.price_per_unit) || 0;
          const discount = parseFloat(updatedItems[index].discount) || 0;
          const baseAmount = quantity * rate;
          const discountAmount = discount;
          updatedItems[index].amount = parseFloat((baseAmount - discountAmount).toFixed(2));

          console.log('Updated item:', updatedItems[index]);
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
        toast.error("Failed to fetch product details");

        // Fallback to cached product data
        const product = products.find(
          (p) => p.id.toString() === safeValue.toString(),
        );
        if (product) {
          console.log('Using cached product:', product);
          // Combine both English and Arabic names for the description
          const description = product.description || (product.name_ar
            ? `${product.name_en} - ${product.name_ar}`
            : product.name_en || '');
          updatedItems[index].description = description;
          updatedItems[index].rate = product.price_per_unit || 0;
          updatedItems[index].quantity = 1;
          updatedItems[index].discount = 0;

          // Recalculate amount with the new rate
          const quantity = parseFloat(updatedItems[index].quantity) || 0;
          const rate = parseFloat(product.price_per_unit) || 0;
          const discount = parseFloat(updatedItems[index].discount) || 0;
          const baseAmount = quantity * rate;
          const discountAmount = discount;
          updatedItems[index].amount = parseFloat((baseAmount - discountAmount).toFixed(2));

          console.log('Updated item with cached data:', updatedItems[index]);
        }
      }
    }

    console.log('Setting form data with updated items:', updatedItems);
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
    if (formData.items.length === 1) {
      toast.error("Invoice must have at least one item");
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
    // Calculate the sum of all item amounts (which already include per-item discounts)
    return formData.items.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0),
      0,
    );
  };

  const calculateItemDiscounts = () => {
    return formData.items.reduce((sum, item) => {
      const discountValue = parseFloat(item.discount) || 0;
      return sum + discountValue;
    }, 0);
  };

  const calculateInvoiceDiscount = () => {
    const subtotal = calculateSubtotal() + calculateItemDiscounts(); // Add back item discounts to get pre-discount subtotal
    if (formData.discount_type === "none" || !formData.discount_value) return 0;

    if (formData.discount_type === "percentage") {
      return subtotal * (parseFloat(formData.discount_value) / 100);
    } else {
      return parseFloat(formData.discount_value) || 0;
    }
  };

  const calculateTotalDiscount = () => {
    // Total discount is sum of item discounts and invoice-level discount
    return calculateItemDiscounts() + calculateInvoiceDiscount();
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal() + calculateItemDiscounts(); // Pre-discount subtotal
    const totalDiscount = calculateTotalDiscount();
    return subtotal - totalDiscount;
  };

  const handlePreviewPDF = async () => {
    if (!formData.customer_id) {
      toast.error("Please select a customer before previewing");
      return;
    }

    if (formData.items.some((item) => !item.product_id)) {
      toast.error("All items must have a product selected");
      return;
    }

    try {
      setLoading(true);
      // Prepare invoice data for PDF generation
      const invoiceData = {
        ...formData,
        invoice_number: formData.invoice_number || "DRAFT",
        status: "draft",
        subtotal: calculateSubtotal(),
        total_discount: calculateTotalDiscount(),
        total: calculateTotal(),
        customer: selectedCustomer,
        items: formData.items
          .map(item => ({
            ...item,
            product_id: parseInt(item.product_id),
            product_name: products.find(p => p.id.toString() === item.product_id?.toString())?.name_en || '',
            name: products.find(p => p.id.toString() === item.product_id?.toString())?.name_en || '',
            quantity: parseFloat(item.quantity) || 0,
            rate: parseFloat(item.rate) || 0,
            discount: parseFloat(item.discount) || 0,
            amount: parseFloat(item.amount) || 0
          }))
      };

      // Ensure customer data is available
      if (!selectedCustomer) {
        toast.error("Customer data not loaded");
        return;
      }

      // Use the PDF service to preview the invoice
      const pdfBlob = await pdfService.generateInvoicePDF(
        invoiceData,
        selectedCustomer,
        settings,
      );
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
      toast.success("PDF preview opened in a new tab");
    } catch (error) {
      console.error("Error generating PDF preview:", error);
      toast.error("Failed to generate PDF preview: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();

    if (!formData.customer_id) {
      toast.error("Please select a customer");
      return;
    }

    if (formData.items.some((item) => !item.product_id)) {
      toast.error("All items must have a product selected");
      return;
    }

    try {
      setLoading(true);

      // Convert string values to appropriate types and ensure all required fields are present
      const invoiceData = {
        invoice_number: formData.invoice_number,
        reference: formData.reference || '',
        customer_id: parseInt(formData.customer_id, 10),
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        payment_mode: formData.payment_mode || 'Cash',
        currency: formData.currency || 'QAR',
        sale_agent: formData.sale_agent || '',
        discount_type: formData.discount_type || 'none',
        discount_value: parseFloat(formData.discount_value) || 0,
        subtotal: calculateSubtotal(),
        total_discount: calculateTotalDiscount(),
        total: calculateTotal(),
        invoice_type: "SALE", // Required by backend model
        total_net: calculateSubtotal(), // Required by backend model
        total_gross: calculateTotal(), // Required by backend model
        total_tax: 0, // Required by backend model
        discount: calculateTotalDiscount(), // Required by backend model
        status: isDraft ? "DRAFT" : "SENT",
        admin_note: formData.admin_note || '',
        client_note: formData.client_note || '',
        terms: formData.terms || '',
        items: formData.items.map(item => ({
          product_id: parseInt(item.product_id, 10),
          description: item.description || '',
          quantity: parseFloat(item.quantity) || 0,
          rate: parseFloat(item.rate) || 0,
          discount: parseFloat(item.discount) || 0,
          amount: parseFloat(item.amount) || 0
        })).filter(item => item.product_id && !isNaN(item.product_id))
      };

      console.log('Submitting invoice data:', invoiceData);
      const response = await apiService.invoices.create(invoiceData);
      toast.success(
        isDraft ? "Invoice saved as draft" : "Invoice created successfully",
      );
      navigate("/invoices");
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t("invoices.createTitle", "Create New Invoice")}
          </h1>
          <p className="text-text-secondary mt-1">
            {t(
              "invoices.createSubtitle",
              "Create a new invoice for a customer",
            )}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/invoices")}
          className="flex items-center gap-2 hover:bg-card-hover transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("common.back", "Back to Invoices")}
        </Button>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
        {/* 1. Customer Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t("invoices.customerInfo", "Customer Information")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t("invoices.customer", "Customer")}
              </label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                disabled={loadingCustomers}
                required
              >
                <option value="">{t("common.select", "Select...")}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedCustomer && Object.keys(selectedCustomer).length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-background p-4 rounded-md shadow-md hover:shadow-lg transition-shadow">
                <h4 className="text-sm font-medium text-text-secondary mb-2">
                  {t("invoices.billTo", "Bill To")}
                </h4>
                <p className="text-sm text-text-secondary font-medium">{selectedCustomer.name || 'N/A'}</p>
                {selectedCustomer.address && (
                  <p className="text-sm text-text-secondary">{selectedCustomer.address}</p>
                )}
                {selectedCustomer.contact && (
                  <p className="text-sm text-text-secondary">{selectedCustomer.contact}</p>
                )}
                {selectedCustomer.type && (
                  <p className="text-sm text-text-secondary">Type: {selectedCustomer.type}</p>
                )}
              </div>
              <div className="bg-background p-4 rounded-md shadow-md hover:shadow-lg transition-shadow">
                <h4 className="text-sm font-medium text-text-secondary mb-2">
                  {t("invoices.shipTo", "Ship To")}
                </h4>
                <p className="text-sm text-text-secondary font-medium">{selectedCustomer.name || 'N/A'}</p>
                {selectedCustomer.address && (
                  <p className="text-sm text-text-secondary">{selectedCustomer.address}</p>
                )}
                {selectedCustomer.contact && (
                  <p className="text-sm text-text-secondary">{selectedCustomer.contact}</p>
                )}
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-md shadow-md hover:shadow-lg transition-shadow border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-text-primary">
                    {t("invoices.customerBalance", "Customer Balance")}
                  </h4>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {t("invoices.accountInfo", "Account Info")}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">{t("invoices.creditLimit", "Credit Limit")}:</span>
                    <span className="text-sm font-medium text-blue-600">
                      {(selectedCustomer.credit_limit !== undefined ? parseFloat(selectedCustomer.credit_limit) : 0).toFixed(2)} QAR
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">{t("invoices.currentBalance", "Current Balance")}:</span>
                    <span className={`text-sm font-medium ${selectedCustomer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {(selectedCustomer.balance !== undefined ? parseFloat(selectedCustomer.balance) : 0).toFixed(2)} QAR
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-theme-border pt-1 mt-1">
                    <span className="text-sm font-medium text-text-secondary">{t("invoices.availableBalance", "Available Balance")}:</span>
                    <span className="text-sm font-bold text-green-600">
                      {((selectedCustomer.credit_limit !== undefined ? parseFloat(selectedCustomer.credit_limit) : 0) -
                        (selectedCustomer.balance !== undefined ? parseFloat(selectedCustomer.balance) : 0)).toFixed(2)} QAR
                    </span>
                  </div>
                </div>
                {(selectedCustomer.credit_limit > 0 && selectedCustomer.balance > selectedCustomer.credit_limit) && (
                  <div className="mt-2 p-2 bg-red-50 rounded-md">
                    <p className="text-xs text-red-700 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {t("invoices.overLimitWarning", "Customer has exceeded credit limit")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* 2. Invoice Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t("invoices.invoiceDetails", "Invoice Details")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t("invoices.invoiceNumber", "Invoice Number")}
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
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t("invoices.invoiceDate", "Invoice Date")}
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
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t("invoices.dueDate", "Due Date")}
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
              <span className="ml-2 text-sm text-text-secondary">
                {t(
                  "invoices.preventReminders",
                  "Prevent sending overdue reminders",
                )}
              </span>
            </label>
          </div>
        </Card>

        {/* 3. Payment and Currency Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t("invoices.paymentSettings", "Payment and Currency Settings")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t("invoices.allowedPaymentModes", "Allowed Payment Modes")}
              </label>
              <select
                name="payment_mode"
                value={formData.payment_mode || ""}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    payment_mode: e.target.value,
                  }));
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="">{t("common.select", "Select...")}</option>
                <option value="cash">{t("payment_modes.cash", "Cash")}</option>
                <option value="bank_transfer">
                  {t("paymentModes.bankTransfer", "Bank Transfer")}
                </option>
                <option value="credit_card">
                  {t("paymentModes.creditCard", "Credit Card")}
                </option>
                <option value="check">
                  {t("payment_modes.check", "Check")}
                </option>
                <option value="customer_balance">
                  {t("payment_modes.customerBalance", "Customer Balance")}
                </option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t("invoices.currency", "Currency")}
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
              <p className="text-xs text-text-secondary mt-1">
                {t("invoices.currencyNote", "Automatically set to QAR")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t("invoices.saleAgent", "Sale Agent")}
              </label>
              <select
                name="sale_agent"
                value={formData.sale_agent}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="">{t("common.select", "Select...")}</option>
                <option value="admin">System Administrator</option>
                <option value="warehouse_manager">Warehouse Manager</option>
                <option value="sales_manager">Sales Manager</option>
                <option value="accountant">Accountant</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t("invoices.discountType", "Discount Type")}
              </label>
              <div className="flex items-center space-x-4">
                <select
                  name="discount_type"
                  value={formData.discount_type}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                >
                  <option value="none">
                    {t("discountTypes.none", "No Discount")}
                  </option>
                  <option value="percentage">
                    {t("discountTypes.percentage", "Percentage (%)")}
                  </option>
                  <option value="fixed">
                    {t("discountTypes.fixed", "Fixed Amount")}
                  </option>
                </select>
                {formData.discount_type !== "none" && (
                  <input
                    type="number"
                    name="discount_value"
                    value={formData.discount_value}
                    onChange={handleInputChange}
                    className="w-1/3 p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    min="0"
                    step={
                      formData.discount_type === "percentage" ? "0.01" : "1"
                    }
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t("invoices.adminNote", "Admin Note")}
              </label>
              <textarea
                name="admin_note"
                value={formData.admin_note}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                rows="2"
                placeholder={t(
                  "invoices.adminNotePlaceholder",
                  "Internal note (not visible to client)",
                )}
              ></textarea>
            </div>
          </div>
        </Card>

        {/* 4. Itemized Billing Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {t("invoices.items", "Itemized Billing")}
          </h3>
          <div className="overflow-x-auto bg-card rounded-lg shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-background">
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t("invoices.item", "Item")}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t("invoices.description", "Description")}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t("invoices.quantity", "Quantity")}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t("invoices.rate", "Rate")}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t("invoices.discount", "Discount")}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t("invoices.amount", "Amount")}
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {t("common.actions", "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={index} className="border-t border-theme-border">
                    <td className="px-4 py-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search products..."
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 mb-2"
                        />
                        <select
                          value={item.product_id}
                          onChange={async (e) => {
                            await handleItemChange(index, "product_id", e.target.value);
                            setProductSearch(''); // Clear search after selection
                          }}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          disabled={loadingProducts}
                          required
                        >
                          <option value="">
                            {t("common.select", "Select...")}
                          </option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name_en} - {product.name_ar || product.name_en} (QAR {product.price_per_unit})
                            </option>
                          ))}
                        </select>
                        {loadingProducts && (
                          <div className="absolute inset-0 bg-card bg-opacity-70 flex items-center justify-center rounded-md">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                          </div>
                        )}

                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        placeholder={t(
                          "invoices.descriptionPlaceholder",
                          "Description",
                        )}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        min="1"
                        step="1"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.rate}
                        onChange={(e) =>
                          handleItemChange(index, "rate", e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"

                        step="1"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.discount || 0}
                        onChange={(e) =>
                          handleItemChange(index, "discount", e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        placeholder={t("invoices.discountPlaceholder", "Fixed discount amount")}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.amount}
                        className="w-full p-2 bg-background border border-gray-300 rounded-md"
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
              variant="default"
              onClick={addItem}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" />
              {t("invoices.addItem", "Add Item")}
            </Button>
          </div>
        </Card>

        {/* 5. Calculations Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t("invoices.summary", "Calculations Summary")}
          </h3>
          <div className="flex flex-col items-end">
            <div className="w-full md:w-1/3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">
                  {t("invoices.subtotal", "Subtotal")}:
                </span>
                <span className="text-sm font-medium">
                  {formData.currency} {calculateSubtotal().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">
                  {t("invoices.itemDiscounts", "Item Discounts")}:
                </span>
                <span className="text-sm font-medium">
                  {formData.currency} {calculateItemDiscounts().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">
                  {t("invoices.invoiceDiscount", "Invoice Discount")}:
                </span>
                <span className="text-sm font-medium">
                  {formData.currency} {calculateInvoiceDiscount().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-theme-border">
                <span className="text-base font-medium">
                  {t("invoices.totalDiscount", "Total Discount")}:
                </span>
                <span className="text-base font-bold">
                  {formData.currency} {calculateTotalDiscount().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-theme-border">
                <span className="text-base font-medium">
                  {t("invoices.total", "Total")}:
                </span>
                <span className="text-base font-bold">
                  {formData.currency} {calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* 6. Notes */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t("invoices.notes", "Notes")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t("invoices.clientNote", "Client Note")}
              </label>
              <textarea
                name="client_note"
                value={formData.client_note}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                rows="3"
                placeholder={t(
                  "invoices.clientNotePlaceholder",
                  "Note visible to the client",
                )}
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t("invoices.terms", "Terms & Conditions")}
              </label>
              <textarea
                name="terms"
                value={formData.terms}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                rows="3"
                placeholder={t(
                  "invoices.termsPlaceholder",
                  "Standard terms and conditions",
                )}
              ></textarea>
            </div>
          </div>
        </Card>

        {/* 7. Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreviewPDF}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {t("invoices.previewPdf", "Preview PDF")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
          >
            {t("invoices.saveDraft", "Save as Draft")}
          </Button>
          <Button type="submit" disabled={loading}>
            {t("invoices.save", "Save")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceCreate;
