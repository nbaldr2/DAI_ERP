import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  Building,
  Calendar,
  DollarSign,
  Package,
  Save,
  ArrowLeft,
  X,
  Home
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PurchaseCreate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State for form data
  const [formData, setFormData] = useState({
    supplier_id: '',
    po_number: '',
    order_date: format(new Date(), 'yyyy-MM-dd'),
    expected_date: '',
    notes: '',
    status: 'DRAFT'
  });

  // State for items in the purchase order
  const [items, setItems] = useState([]);
  
  // State for suppliers, products, and warehouses
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  
  // State for loading
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // State for search and filter
  const [productSearch, setProductSearch] = useState('');
  
  // State for validation
  const [errors, setErrors] = useState({});

  // Debounced search term
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  
  // Debounce the product search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearch);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Fetch suppliers, products, and warehouses on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [suppliersResponse, productsResponse, warehousesResponse] = await Promise.all([
          apiService.get('/suppliers'),
          apiService.get('/products'),
          apiService.get('/warehouses')
        ]);
        
        setSuppliers(suppliersResponse.data.data || []);
        setProducts(productsResponse.data.data || []);
        setWarehouses(warehousesResponse.data.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error(t('purchases.errors.fetch_failed', 'Failed to fetch data'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [t]);

  // Filter suppliers based on search term
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier =>
      supplier && supplier.name && supplier.name.toLowerCase().includes(debouncedProductSearch.toLowerCase())
    );
  }, [suppliers, debouncedProductSearch]);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product && (
        (product.name_en && product.name_en.toLowerCase().includes(debouncedProductSearch.toLowerCase())) ||
        (product.name_ar && product.name_ar.toLowerCase().includes(debouncedProductSearch.toLowerCase())) ||
        (product.name && product.name.toLowerCase().includes(debouncedProductSearch.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(debouncedProductSearch.toLowerCase())) ||
        (product.origin && product.origin.toLowerCase().includes(debouncedProductSearch.toLowerCase()))
      )
    );
  }, [products, debouncedProductSearch]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    
    // Convert specific fields to appropriate types
    if (name === 'supplier_id' && value) {
      newValue = parseInt(value);
    } else if (name === 'warehouse_id' && value) {
      newValue = parseInt(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Clear validation error when field is updated
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // Add a new item to the purchase order
  const addItem = (product) => {
    // Check if product already exists in items
    const existingItem = items.find(item => item.product_id === product.id);
    
    if (existingItem) {
      toast.error(t('purchases.errors.product_already_added', 'Product already added to this purchase order'));
      return;
    }
    
    // Create product description with both English and Arabic names
    const productDescription = product.name_en && product.name_ar 
      ? `${product.name_en} - ${product.name_ar}`
      : product.name || product.name_en || product.name_ar || t('purchases.unnamed_product', 'Unnamed Product');
    
    // Set default quantity and unit price as numbers
    const qty = 1;
    const unit_price = parseFloat(product.price_per_unit) || 0;
    const total_price = qty * unit_price;
    
    setItems(prev => [
      ...prev,
      {
        product_id: product.id,
        product_name: productDescription,
        qty: qty,
        unit_price: unit_price,
        total_price: total_price,
        warehouse_id: formData.warehouse_id || null // Use the default warehouse from form
      }
    ]);
    
    // Show success message
    toast.success(t('purchases.product_added', 'Product added to purchase order'));
  };

  // Remove an item from the purchase order
  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update item quantity
  const updateItemQuantity = (index, qty) => {
    const newQty = parseFloat(qty);
    
    if (isNaN(newQty) || newQty <= 0) {
      return;
    }
    
    setItems(prev => {
      const newItems = [...prev];
      newItems[index].qty = newQty;
      newItems[index].total_price = newQty * (parseFloat(newItems[index].unit_price) || 0);
      return newItems;
    });
  };

  // Update item unit price
  const updateItemUnitPrice = (index, price) => {
    const newPrice = parseFloat(price);
    
    if (isNaN(newPrice) || newPrice < 0) {
      return;
    }
    
    setItems(prev => {
      const newItems = [...prev];
      newItems[index].unit_price = newPrice;
      newItems[index].total_price = (parseFloat(newItems[index].qty) || 0) * newPrice;
      return newItems;
    });
  };

  // Update item warehouse
  const updateItemWarehouse = (index, warehouseId) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index].warehouse_id = warehouseId || null;
      return newItems;
    });
  };

  // Calculate total amount
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.supplier_id) {
      newErrors.supplier_id = t('purchases.errors.supplier_required', 'Supplier is required');
    }
    
    if (!formData.order_date) {
      newErrors.order_date = t('purchases.errors.order_date_required', 'Order date is required');
    }
    
    if (items.length === 0) {
      newErrors.items = t('purchases.errors.items_required', 'At least one item is required');
    }
    
    // Validate that each item has a quantity
    for (let i = 0; i < items.length; i++) {
      const qty = parseFloat(items[i].qty);
      if (isNaN(qty) || qty <= 0) {
        newErrors[`item_${i}_qty`] = t('purchases.errors.quantity_required', 'Quantity must be greater than 0');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error(t('purchases.errors.validation_failed', 'Please fix the errors before submitting'));
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Prepare form data with proper formatting
      const purchaseData = {
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
        po_number: formData.po_number || undefined, // Let backend generate if empty
        order_date: formData.order_date,
        expected_date: formData.expected_date || undefined, // Send undefined if empty
        notes: formData.notes || undefined, // Send undefined if empty
        status: formData.status,
        total: calculateTotal(),
        items: items.map(item => ({
          product_id: parseInt(item.product_id),
          qty: parseFloat(item.qty) || 0,
          unit_price: parseFloat(item.unit_price) || 0,
          total_price: parseFloat(item.total_price) || 0,
          warehouse_id: item.warehouse_id ? parseInt(item.warehouse_id) : null
        }))
      };
      
      const response = await apiService.post('/purchases', purchaseData);
      
      // Debug the response structure
      console.log('Purchase creation response:', response);
      
      toast.success(t('purchases.success.created', 'Purchase order created successfully'));
      // Navigate to the newly created purchase detail page
      navigate(`/purchases/${response.data.data.purchase.id}`);

    } catch (error) {
      console.error('Error creating purchase order:', error);
      // Log the actual validation errors from the backend
      if (error.response && error.response.data && error.response.data.errors) {
        console.error('Validation errors:', error.response.data.errors);
        toast.error(t('purchases.errors.validation_failed_details', 'Validation failed. Please check the form data.'));
      } else {
        toast.error(t('purchases.errors.create_failed', 'Failed to create purchase order'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
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
              {t('purchases.create_title', 'Create Purchase Order')}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('purchases.create_subtitle', 'Create a new purchase order for your suppliers')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Purchase Order Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('purchases.details', 'Purchase Order Details')}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('purchases.supplier', 'Supplier')}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleInputChange}
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.supplier_id ? 'border-red-500' : 'border-gray-200'}`}
                  >
                    <option value="">{t('purchases.select_supplier', 'Select a supplier')}</option>
                    {filteredSuppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  {errors.supplier_id && (
                    <p className="text-red-500 text-xs mt-1">{errors.supplier_id}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('purchases.po_number', 'PO Number')}
                  </label>
                  <input
                    type="text"
                    name="po_number"
                    value={formData.po_number}
                    onChange={handleInputChange}
                    placeholder={t('purchases.po_number_placeholder', 'Auto-generated if left empty')}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('purchases.order_date', 'Order Date')}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="order_date"
                    value={formData.order_date}
                    onChange={handleInputChange}
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.order_date ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.order_date && (
                    <p className="text-red-500 text-xs mt-1">{errors.order_date}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('purchases.expected_date', 'Expected Delivery Date')}
                  </label>
                  <input
                    type="date"
                    name="expected_date"
                    value={formData.expected_date}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('purchases.warehouse', 'Default Warehouse')}
                  </label>
                  <select
                    name="warehouse_id"
                    value={formData.warehouse_id || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">{t('purchases.select_warehouse', 'Select a warehouse')}</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('purchases.status', 'Status')}
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="DRAFT">{t('purchases.status_draft', 'Draft')}</option>
                    <option value="SENT">{t('purchases.status_sent', 'Sent')}</option>
                    <option value="CONFIRMED">{t('purchases.status_confirmed', 'Confirmed')}</option>
                    <option value="RECEIVED">{t('purchases.status_received', 'Received')}</option>
                    <option value="CLOSED">{t('purchases.status_closed', 'Closed')}</option>
                    <option value="CANCELLED">{t('purchases.status_cancelled', 'Cancelled')}</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('purchases.notes', 'Notes')}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t('purchases.notes_placeholder', 'Add any additional notes or instructions...')}
                ></textarea>
              </div>
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
              
              {errors.items && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-500 text-sm">{errors.items}</p>
                </div>
              )}
              
              {items.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">
                    {t('purchases.no_items', 'No items added to this purchase order yet')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('purchases.add_items_instruction', 'Search and add products from the panel on the right')}
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
                          {t('purchases.table.warehouse', 'Warehouse')}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('purchases.table.total', 'Total')}
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('common.actions', 'Actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.product_name}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.qty}
                              onChange={(e) => updateItemQuantity(index, e.target.value)}
                              className={`w-20 p-1 text-right border rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors[`item_${index}_qty`] ? 'border-red-500' : 'border-gray-200'}`}
                            />
                            {errors[`item_${index}_qty`] && (
                              <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_qty`]}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center justify-end">
                              <span className="text-gray-500 mr-1">QAR</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateItemUnitPrice(index, e.target.value)}
                                className="w-24 p-1 text-right border border-gray-200 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={item.warehouse_id || ''}
                              onChange={(e) => updateItemWarehouse(index, e.target.value)}
                              className="w-full p-1 border border-gray-200 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                              <option value="">{t('purchases.select_warehouse', 'Select...')}</option>
                              {warehouses.map(warehouse => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-gray-900">
                              QAR {(parseFloat(item.total_price) || 0).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
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
                      <tr className="bg-gray-50">
                        <td colSpan="4" className="px-4 py-3 text-right font-medium">
                          {t('purchases.table.grand_total', 'Grand Total')}:
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-lg font-bold text-gray-900">
                            QAR {(parseFloat(calculateTotal()) || 0).toFixed(2)}
                          </div>
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
          
          {/* Product Selection Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('purchases.add_products', 'Add Products')}
                </h2>
                <div className="text-sm text-gray-500">
                  {filteredProducts.length} {t('purchases.of', 'of')} {products.length} {t('purchases.products', 'products')}
                </div>
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('purchases.search_products', 'Search products...')}
                  className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Search info */}
              {productSearch && (
                <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                  <span>
                    {t('purchases.search_results', 'Showing {{count}} results for "{{search}}"', { 
                      count: filteredProducts.length, 
                      search: productSearch 
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="text-blue-600 hover:text-blue-800 focus:outline-none"
                  >
                    {t('common.clear', 'Clear')}
                  </button>
                </div>
              )}
              
              {/* Bulk Actions */}
              {filteredProducts.length > 0 && (
                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      let addedCount = 0;
                      const notAddedProducts = filteredProducts.filter(product => 
                        !items.find(item => item.product_id === product.id)
                      );
                      
                      if (notAddedProducts.length === 0) {
                        toast.info(t('purchases.all_products_already_added', 'All filtered products are already in the purchase order'));
                        return;
                      }
                      
                      notAddedProducts.forEach(product => {
                        addItem(product);
                        addedCount++;
                      });
                      
                      toast.success(t('purchases.products_added', '{{count}} products added to purchase order', { count: addedCount }));
                    }}
                    className="flex-1"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {t('purchases.add_all_filtered', 'Add All Filtered')} ({filteredProducts.filter(p => !items.find(i => i.product_id === p.id)).length})
                  </Button>
                </div>
              )}
              
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredProducts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                      {t('purchases.no_products_found', 'No products found')}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {t('purchases.try_adjusting_search', 'Try adjusting your search criteria')}
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {filteredProducts.map(product => {
                      const isAdded = items.some(item => item.product_id === product.id);
                      return (
                        <li key={product.id} className={`p-4 transition-colors duration-150 ${isAdded ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50'}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {product.name_en && product.name_ar 
                                  ? `${product.name_en} - ${product.name_ar}`
                                  : product.name || product.name_en || product.name_ar || t('purchases.unnamed_product', 'Unnamed Product')}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {product.category && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {product.category}
                                  </span>
                                )}
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  QAR {parseFloat(product.price_per_unit || 0).toFixed(2)}
                                </span>
                                {product.unit && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {product.unit}
                                  </span>
                                )}
                                {product.origin && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    {product.origin}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addItem(product)}
                              disabled={isAdded}
                              className={`flex items-center gap-1 ml-2 flex-shrink-0 ${isAdded ? 'bg-green-50 border-green-200 text-green-700' : ''}`}
                              title={isAdded ? t('purchases.already_added', 'Already added') : t('common.add', 'Add')}
                            >
                              {isAdded ? (
                                <span className="text-xs">✓</span>
                              ) : (
                                <Plus className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

            </Card>
            
            {/* Warehouse Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" />
                {t('purchases.warehouse_info', 'Warehouse Information')}
              </h2>
              
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  {t('purchases.warehouse_info_desc', 'Select the destination warehouse where these products will be stored upon delivery.')}
                </p>
                
                {formData.warehouse_id ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
                      {warehouses.find(w => w.id == formData.warehouse_id)?.name}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {warehouses.find(w => w.id == formData.warehouse_id)?.location || t('purchases.no_location', 'No location specified')}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-500">
                      {t('purchases.no_warehouse_selected', 'No warehouse selected')}
                    </p>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Actions */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('purchases.actions', 'Actions')}
              </h2>
              
              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {t('purchases.save', 'Save Purchase Order')}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => navigate('/purchases')}
                >
                  <X className="w-4 h-4" />
                  {t('common.cancel', 'Cancel')}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PurchaseCreate;