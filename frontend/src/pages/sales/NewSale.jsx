import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  User,
  Package,
  Calendar,
  DollarSign,
  FileText,
  Save,
  ArrowLeft,
  Calculator,
  AlertCircle,
  Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const NewSale = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Data states
  const [customers, setCustomers] = useState([]);
  const [stockEntries, setStockEntries] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Search and filter states
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Validation states
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!hasPermission('sales:create')) {
      toast.error('You do not have permission to create sales');
      navigate('/sales');
      return;
    }

    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [customersRes, stockRes] = await Promise.all([
        apiService.customers.list({ limit: 100 }),
        apiService.stock.list({
          status: 'available',
          limit: 200,
          include_products: true
        })
      ]);

      setCustomers(customersRes.data?.data || []);
      setStockEntries(stockRes.data?.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone?.includes(customerSearch)
  );

  const filteredStockEntries = stockEntries.filter(entry => {
    const product = entry.product;
    const searchTerm = productSearch.toLowerCase();

    return product?.name?.toLowerCase().includes(searchTerm) ||
           product?.sku?.toLowerCase().includes(searchTerm) ||
           entry.batch_number?.toLowerCase().includes(searchTerm);
  }).filter(entry => entry.available_weight > 0);

  const addItemToSale = (stockEntry) => {
    const existingItem = selectedItems.find(item => item.stock_entry_id === stockEntry.id);

    if (existingItem) {
      toast.error('Item already added to sale');
      return;
    }

    const newItem = {
      stock_entry_id: stockEntry.id,
      stockEntry: stockEntry,
      product: stockEntry.product,
      warehouse: stockEntry.warehouse,
      batch_number: stockEntry.batch_number,
      available_weight: stockEntry.available_weight,
      sold_weight: 1,
      unit_price: stockEntry.unit_price || 0,
      total_amount: stockEntry.unit_price || 0,
      expiry_date: stockEntry.expiry_date
    };

    setSelectedItems([...selectedItems, newItem]);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const removeItemFromSale = (stockEntryId) => {
    setSelectedItems(selectedItems.filter(item => item.stock_entry_id !== stockEntryId));
  };

  const updateItemQuantity = (stockEntryId, newWeight) => {
    if (newWeight <= 0) {
      removeItemFromSale(stockEntryId);
      return;
    }

    setSelectedItems(selectedItems.map(item => {
      if (item.stock_entry_id === stockEntryId) {
        const updatedItem = {
          ...item,
          sold_weight: newWeight,
          total_amount: newWeight * item.unit_price
        };
        return updatedItem;
      }
      return item;
    }));
  };

  const updateItemPrice = (stockEntryId, newPrice) => {
    if (newPrice < 0) return;

    setSelectedItems(selectedItems.map(item => {
      if (item.stock_entry_id === stockEntryId) {
        const updatedItem = {
          ...item,
          unit_price: newPrice,
          total_amount: item.sold_weight * newPrice
        };
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = selectedItems.reduce((sum, item) => sum + item.total_amount, 0);
    const totalWeight = selectedItems.reduce((sum, item) => sum + item.sold_weight, 0);
    const itemCount = selectedItems.length;

    return { subtotal, totalWeight, itemCount };
  };

  const validateForm = () => {
    const newErrors = {};

    if (selectedItems.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    selectedItems.forEach((item, index) => {
      if (item.sold_weight > item.available_weight) {
        newErrors[`item_${index}_weight`] = `Sold weight cannot exceed available weight (${item.available_weight})`;
      }
      if (item.sold_weight <= 0) {
        newErrors[`item_${index}_weight`] = 'Sold weight must be greater than 0';
      }
      if (item.unit_price < 0) {
        newErrors[`item_${index}_price`] = 'Unit price cannot be negative';
      }
    });

    if (!saleDate) {
      newErrors.sale_date = 'Sale date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setSaving(true);

    try {
      const salePromises = selectedItems.map(item =>
        apiService.sales.create({
          stock_entry_id: item.stock_entry_id,
          customer_id: selectedCustomer?.id || null,
          sold_weight: item.sold_weight,
          unit_price: item.unit_price,
          sale_date: saleDate,
          notes: notes || null
        })
      );

      await Promise.all(salePromises);

      toast.success('Sale recorded successfully!');
      navigate('/sales');
    } catch (error) {
      console.error('Error creating sale:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create sale';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const { subtotal, totalWeight, itemCount } = calculateTotals();

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading sale data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/sales')}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-card-hover rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">New Sale</h1>
          <p className="text-text-secondary">Create a new sales transaction</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Sale Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </h3>

              <div className="relative">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Select Customer (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedCustomer ? selectedCustomer.name : customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                      if (selectedCustomer) setSelectedCustomer(null);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Search customers by name, email, or phone..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <Search className="absolute right-3 top-2.5 w-5 h-5 text-text-secondary" />
                </div>

                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerSearch('');
                            setShowCustomerDropdown(false);
                          }}
                          className="p-3 hover:bg-card-hover cursor-pointer border-b border-theme-border last:border-b-0"
                        >
                          <div className="font-medium text-text-primary">{customer.name}</div>
                          <div className="text-sm text-text-secondary">{customer.email}</div>
                          {customer.phone && (
                            <div className="text-sm text-text-secondary">{customer.phone}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-text-secondary text-center">No customers found</div>
                    )}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-900">{selectedCustomer.name}</div>
                        <div className="text-sm text-green-700">{selectedCustomer.email}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Product Selection */}
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Add Products
              </h3>

              <div className="relative">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Search products by name, SKU, or batch number..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <Search className="absolute right-3 top-2.5 w-5 h-5 text-text-secondary" />
              </div>

              {showProductDropdown && productSearch && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredStockEntries.length > 0 ? (
                    filteredStockEntries.map((entry) => (
                      <div
                        key={entry.id}
                        onClick={() => addItemToSale(entry)}
                        className="p-3 hover:bg-card-hover cursor-pointer border-b border-theme-border last:border-b-0"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-text-primary">{entry.product?.name}</div>
                            <div className="text-sm text-text-secondary">SKU: {entry.product?.sku}</div>
                            <div className="text-sm text-text-secondary">Batch: {entry.batch_number}</div>
                            <div className="text-sm text-text-secondary">Available: {entry.available_weight} {entry.product?.unit || 'kg'}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-text-primary">${entry.unit_price}/{entry.product?.unit || 'kg'}</div>
                            <div className="text-sm text-text-secondary">{entry.warehouse?.name}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-text-secondary text-center">No products found</div>
                  )}
                </div>
              )}

              {errors.items && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.items}
                </p>
              )}
            </div>

            {/* Selected Items */}
            {selectedItems.length > 0 && (
              <div className="bg-card rounded-lg p-6 shadow-sm border">
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Sale Items ({itemCount})
                </h3>

                <div className="space-y-4">
                  {selectedItems.map((item, index) => (
                    <div key={item.stock_entry_id} className="border border-theme-border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-text-primary">{item.product?.name}</h4>
                          <p className="text-sm text-text-secondary">
                            SKU: {item.product?.sku} | Batch: {item.batch_number}
                          </p>
                          <p className="text-sm text-text-secondary">
                            Available: {item.available_weight} {item.product?.unit || 'kg'} | Warehouse: {item.warehouse?.name}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItemFromSale(item.stock_entry_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">
                            Quantity (kg)
                          </label>
                          <input
                            type="number"
                            value={item.sold_weight}
                            onChange={(e) => updateItemQuantity(item.stock_entry_id, parseFloat(e.target.value) || 0)}
                            min="0.01"
                            max={item.available_weight}
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          {errors[`item_${index}_weight`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_weight`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">
                            Unit Price ($)
                          </label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItemPrice(item.stock_entry_id, parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          {errors[`item_${index}_price`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_price`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">
                            Total Amount
                          </label>
                          <div className="px-3 py-2 bg-background border border-gray-300 rounded-lg font-medium text-text-primary">
                            ${item.total_amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            {/* Sale Summary */}
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
                <Calculator className="w-5 h-5 mr-2" />
                Sale Summary
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Items:</span>
                  <span className="font-medium">{itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Weight:</span>
                  <span className="font-medium">{totalWeight.toFixed(2)} kg</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-text-primary">Total Amount:</span>
                    <span className="text-xl font-bold text-green-600">${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sale Details */}
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Sale Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Sale Date
                  </label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.sale_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.sale_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any additional notes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={saving || selectedItems.length === 0}
                  className="w-full flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing Sale...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Record Sale
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/sales')}
                  className="w-full flex items-center justify-center px-4 py-3 bg-card-hover text-text-secondary rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewSale;
