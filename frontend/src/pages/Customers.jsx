import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';

const Customers = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    address: '',
    type: 'RETAIL',
    credit_limit: '',
    balance: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (page = 1, search = '', type = '') => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(type && { type })
      };
      
      const response = await apiService.customers.list(params);
      setCustomers(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCustomers(1, searchTerm, typeFilter);
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      contact: '',
      address: '',
      type: 'RETAIL',
      credit_limit: ''
    });
    setShowModal(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      contact: customer.contact || '',
      address: customer.address || '',
      type: customer.type,
      credit_limit: customer.credit_limit || '',
      balance: customer.balance || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
        balance: formData.balance ? parseFloat(formData.balance) : 0
      };

      if (editingCustomer) {
        await apiService.customers.update(editingCustomer.id, submitData);
        Swal.fire({
          title: 'Success!',
          text: 'Customer updated successfully!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      } else {
        await apiService.customers.create(submitData);
        Swal.fire({
          title: 'Success!',
          text: 'Customer created successfully!',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      }
      
      setShowModal(false);
      fetchCustomers(pagination.page, searchTerm, typeFilter);
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: editingCustomer ? 'Failed to update customer' : 'Failed to create customer',
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
          await apiService.customers.delete(id);
          Swal.fire(
            'Deleted!',
            'The customer has been deleted.',
            'success'
          );
          fetchCustomers(pagination.page, searchTerm, typeFilter);
        } catch (error) {
          Swal.fire(
            'Error!',
            'Failed to delete customer',
            'error'
          );
        }
      }
    });
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading customers..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Customers</h1>
          <p className="text-text-secondary mt-1">Manage your customer relationships</p>
        </div>
        {hasPermission('customers:create') && (
          <button 
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Customer
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-lg shadow-sm border p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
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

      {/* Customers Table */}
      <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No customers found</h3>
            <p className="text-text-secondary">Get started by adding your first customer.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t("customers.name", "Customer Name")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t("customers.contact", "Contact")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t("customers.type", "Type")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t("customers.creditLimit", "Credit Limit")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t("customers.balance", "Balance")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t("customers.availableCredit", "Available Credit")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t("customers.address", "Address")}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t("common.actions", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme-border">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-card-hover">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text-primary">
                          {customer.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {customer.contact || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.type === 'WHOLESALE' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {customer.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        <b className='text-text-secondary'>{customer.credit_limit || '0.00'}</b>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        <b className='text-red-600'>{customer.balance || '0.00'}</b>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        <b className='text-green-600'>{((customer.credit_limit || 0) - (customer.balance || 0)).toFixed(2)}</b>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-primary max-w-xs truncate">
                        {customer.address || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {hasPermission('customers:update') && (
                            <button
                              onClick={() => handleEdit(customer)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('customers:delete') && (
                            <button
                              onClick={() => handleDelete(customer.id)}
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
                    onClick={() => fetchCustomers(pagination.page - 1, searchTerm, typeFilter)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-card-hover"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchCustomers(pagination.page + 1, searchTerm, typeFilter)}
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
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
                  Customer Name *
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
                  Contact
                </label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Credit Limit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Current Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Available Credit
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-background text-text-secondary">
                    {(parseFloat(formData.credit_limit || 0) - parseFloat(formData.balance || 0)).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Address
                </label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                  {editingCustomer ? 'Update' : 'Create'} Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
