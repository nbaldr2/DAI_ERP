import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import debounce from 'lodash.debounce';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { useProducts } from '../hooks/queries/useProducts';
import apiService from '../services/api';
import { Download } from 'lucide-react';
import Swal from 'sweetalert2';

const Products = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setSearchTerm(value);
      setPage(1);
    }, 500),
    []
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const {
    data: productsData,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    isCreating,
    isUpdating,
    isDeleting
  } = useProducts({
    page,
    limit,
    search: searchTerm,
    category: categoryFilter
  });

  const products = productsData?.data || [];
  const pagination = productsData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  };

  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    description: '',
    category: '',
    origin: '',
    unit: 'kg',
    min_qty: 0,
    expiry_alert_days: 7,
    price_per_unit: 0
  });

  // Handle search (now just prevents default form submission)
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Reset to first page on search
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProduct) {
      updateProduct({ id: editingProduct.id, data: formData }, {
        onSuccess: () => {
          setShowModal(false);
          setEditingProduct(null);
          resetForm();
        }
      });
    } else {
      createProduct(formData, {
        onSuccess: () => {
          setShowModal(false);
          setEditingProduct(null);
          resetForm();
        }
      });
    }
  };

  // Handle delete
  const handleDelete = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteProduct(id, {
          onSuccess: () => {
            Swal.fire(
              'Deleted!',
              'The product has been deleted.',
              'success'
            );
          },
          onError: () => {
            Swal.fire(
              'Error!',
              'Failed to delete the product.',
              'error'
            );
          }
        });
      }
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name_en: '',
      name_ar: '',
      description: '',
      category: '',
      origin: '',
      unit: 'kg',
      min_qty: 0,
      expiry_alert_days: 7,
      price_per_unit: 0
    });
  };

  // Handle export products
  const handleExportProducts = async () => {
    try {
      // Call the export API
      const response = await apiService.export.table('products', {
        responseType: 'blob' // Important for file downloads
      });
      
      // Create a temporary link to trigger the download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.remove();
      window.URL.revokeObjectURL(url);
      
      Swal.fire({
        title: 'Success!',
        text: 'Products exported successfully!',
        icon: 'success',
        confirmButtonText: 'OK'
      });
    } catch (error) {
      console.error('Export error:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to export products',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };

  // Open edit modal
  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name_en: product.name_en || '',
      name_ar: product.name_ar || '',
      description: product.description || '',
      category: product.category || '',
      origin: product.origin || '',
      unit: product.unit || 'kg',
      min_qty: product.min_qty || 0,
      expiry_alert_days: product.expiry_alert_days || 7,
      price_per_unit: product.price_per_unit || 0
    });
    setShowModal(true);
  };

  // Open add modal
  const handleAdd = () => {
    setEditingProduct(null);
    resetForm();
    setShowModal(true);
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading products..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Products</h1>
          <p className="text-text-secondary mt-1">Manage your product catalog</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {hasPermission('products:create') && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Product
            </button>
          )}
          <button
            onClick={handleExportProducts}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="Export Products to CSV"
          >
            <Download className="w-5 h-5 mr-2" />
            Export Products
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-card rounded-lg shadow-sm border p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search products..."
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              <option value="Fruits">Fruits</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Dairy">Dairy</option>
              <option value="Meat">Meat</option>
              <option value="Grains">Grains</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No products found</h3>
            <p className="text-text-secondary">Get started by adding your first product.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Origin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Price/Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Min Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme-border">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-card-hover">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            {product.name_en}
                          </div>
                          {product.name_ar && (
                            <div className="text-sm text-text-secondary">
                              {product.name_ar}
                            </div>
                          )}
                          {product.description && (
                            <div className="text-xs text-text-secondary mt-1 truncate max-w-xs" title={product.description}>
                              {product.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {product.category || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {product.origin || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {product.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        Qr {parseFloat(product.price_per_unit || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {product.min_qty || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {hasPermission('products:update') && (
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('products:delete') && (
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-3 border-t border-theme-border flex items-center justify-between">
                <div className="text-sm text-text-secondary">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-card-hover"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-card-hover"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium text-text-primary">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-text-secondary hover:text-text-secondary"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Product Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Product Name (Arabic)
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Enter product description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Meat">Meat</option>
                  <option value="Grains">Grains</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Origin
                </label>
                <input
                  type="text"
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="lb">lb</option>
                    <option value="piece">piece</option>
                    <option value="box">box</option>
                    <option value="liter">liter</option>
                    <option value="bucket">bucket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Price per Unit *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price_per_unit}
                    onChange={(e) => setFormData({ ...formData, price_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Minimum Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.min_qty}
                    onChange={(e) => setFormData({ ...formData, min_qty: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Expiry Alert (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.expiry_alert_days}
                    onChange={(e) => setFormData({ ...formData, expiry_alert_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-text-secondary rounded-lg hover:bg-card-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingProduct ? 'Update' : 'Create'} Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
