import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit, Trash2, Shield } from 'lucide-react';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';

const roleOptions = [
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'WAREHOUSE', label: 'WAREHOUSE' },
  { value: 'SALES', label: 'SALES' },
  { value: 'ACCOUNTANT', label: 'ACCOUNTANT' },
  { value: 'VIEWER', label: 'VIEWER' },
];

export default function Users() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', name: '', role: 'VIEWER', password: '' });

  const fetchUsers = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = { page, limit: pagination.limit, ...(search && { search }) };
      const res = await apiService.users.list(params);
      setUsers(res.data.data || []);
      setPagination(res.data.pagination || pagination);
    } catch (error) {
      toast.error('Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1, searchTerm);
  };

  const openAddForm = () => {
    setEditingUser(null);
    setFormData({ username: '', name: '', role: 'VIEWER', password: '' });
    setShowForm(true);
  };

  const openEditForm = (u) => {
    setEditingUser(u);
    setFormData({ username: u.username, name: u.name, role: u.role, password: '' });
    setShowForm(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingUser) {
        const payload = { username: formData.username, name: formData.name, role: formData.role };
        if (formData.password) payload.password = formData.password;
        await apiService.users.update(editingUser.id, payload);
        toast.success('User updated successfully');
      } else {
        await apiService.users.create(formData);
        toast.success('User created successfully');
      }
      setShowForm(false);
      fetchUsers(pagination.page, searchTerm);
    } catch (error) {
      // errors handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      setLoading(true);
      await apiService.users.delete(id);
      toast.success('User deleted');
      fetchUsers(pagination.page, searchTerm);
    } catch (error) {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  if (loading && !showForm) return <LoadingSpinner fullScreen message="Loading users..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" />
            Users
          </h1>
          <p className="text-text-secondary mt-1">Manage users and roles</p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add User
        </button>
      </div>

      <div className="bg-card rounded-lg shadow-sm border p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg">Search</button>
        </form>
      </div>

      <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-theme-border">
          <thead className="bg-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-theme-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-card-hover">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{u.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{u.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">{u.role}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => openEditForm(u)}
                    className="inline-flex items-center px-3 py-2 text-text-secondary hover:text-primary-700"
                  >
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </button>
                  {u.id !== user?.id && (
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="inline-flex items-center px-3 py-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold mb-4">{editingUser ? 'Edit User' : 'Add User'}</h2>
            <form onSubmit={submitForm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">{editingUser ? 'New Password (optional)' : 'Password'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  {...(editingUser ? {} : { required: true })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="px-4 py-2 border rounded-lg" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg">
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}