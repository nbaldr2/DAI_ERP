import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Package,
  Users,
  TrendingUp,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import { toast } from 'react-hot-toast';

const Warehouses = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [formData, setFormData] = useState({
    name: '',
    location: ''
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...(search && { search })
      };
      
      const response = await apiService.warehouses.list(params);
      setWarehouses(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch warehouses');
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchWarehouses(1, searchTerm);
  };

  const handleAdd = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      location: ''
    });
    setShowModal(true);
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      location: warehouse.location || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await apiService.warehouses.update(editingWarehouse.id, formData);
        toast.success('Warehouse updated successfully');
      } else {
        await apiService.warehouses.create(formData);
        toast.success('Warehouse created successfully');
      }
      
      setShowModal(false);
      fetchWarehouses(pagination.page, searchTerm);
    } catch (error) {
      toast.error(editingWarehouse ? 'Failed to update warehouse' : 'Failed to create warehouse');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        await apiService.warehouses.delete(id);
        toast.success('Warehouse deleted successfully');
        fetchWarehouses(pagination.page, searchTerm);
      } catch (error) {
        toast.error('Failed to delete warehouse');
      }
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading warehouses..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-gray-600 mt-1">Manage your warehouse locations and inventory</p>
        </div>
        {hasPermission('warehouses:create') && (
          <button 
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Warehouse
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search warehouses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Warehouses Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        ) : warehouses.length === 0 ? (
          <div className="p-8 text-center">
            <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No warehouses found</h3>
            <p className="text-gray-500">Get started by adding your first warehouse.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Warehouse Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {warehouses.map((warehouse) => (
                    <tr key={warehouse.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <Building className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                          <a href={`/warehouses/${warehouse.id}`} onClick={(e) => { e.preventDefault(); navigate(`/warehouses/${warehouse.id}`); }} className="text-primary-600 hover:underline">
                            {warehouse.name}
                          </a>
                        </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          {warehouse.location || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(warehouse.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/warehouses/${warehouse.id}`)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {hasPermission('warehouses:update') && (
                            <button
                              onClick={() => handleEdit(warehouse)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('warehouses:delete') && (
                            <button
                              onClick={() => handleDelete(warehouse.id)}
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
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => fetchWarehouses(pagination.page - 1, searchTerm)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchWarehouses(pagination.page + 1, searchTerm)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter warehouse location"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingWarehouse ? 'Update' : 'Create'} Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Warehouses;
