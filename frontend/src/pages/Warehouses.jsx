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
import Swal from 'sweetalert2';

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
        Swal.fire({
          title: 'Success!',
          text: 'Warehouse updated successfully!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      } else {
        await apiService.warehouses.create(formData);
        Swal.fire({
          title: 'Success!',
          text: 'Warehouse created successfully!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      }
      
      setShowModal(false);
      fetchWarehouses(pagination.page, searchTerm);
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: editingWarehouse ? 'Failed to update warehouse' : 'Failed to create warehouse',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };

  const handleDelete = async (id) => {
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
          await apiService.warehouses.delete(id);
          Swal.fire(
            'Deleted!',
            'The warehouse has been deleted.',
            'success'
          );
          fetchWarehouses(pagination.page, searchTerm);
        } catch (error) {
          Swal.fire(
            'Error!',
            'Failed to delete warehouse',
            'error'
          );
        }
      }
    });
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading warehouses..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Warehouses</h1>
          <p className="text-text-secondary mt-1">Manage your warehouse locations and inventory</p>
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
      <div className="bg-card rounded-lg shadow-sm border p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
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
      <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        ) : warehouses.length === 0 ? (
          <div className="p-8 text-center">
            <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No warehouses found</h3>
            <p className="text-text-secondary">Get started by adding your first warehouse.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Warehouse Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Created Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme-border">
                  {warehouses.map((warehouse) => (
                    <tr key={warehouse.id} className="hover:bg-card-hover">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <Building className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-sm font-medium text-text-primary">
                          <a href={`/warehouses/${warehouse.id}`} onClick={(e) => { e.preventDefault(); navigate(`/warehouses/${warehouse.id}`); }} className="text-primary-600 hover:underline">
                            {warehouse.name}
                          </a>
                        </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-text-primary">
                          <MapPin className="w-4 h-4 text-text-secondary mr-2" />
                          {warehouse.location || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {new Date(warehouse.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/warehouses/${warehouse.id}`)}
                            className="text-text-secondary hover:text-text-primary"
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
              <div className="px-6 py-3 border-t border-theme-border flex items-center justify-between">
                <div className="text-sm text-text-secondary">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => fetchWarehouses(pagination.page - 1, searchTerm)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-card-hover"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchWarehouses(pagination.page + 1, searchTerm)}
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
                {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
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
                <label className="block text-sm font-medium text-text-secondary mb-1">
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
                  className="px-4 py-2 border border-gray-300 text-text-secondary rounded-lg hover:bg-card-hover transition-colors"
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
