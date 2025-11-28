import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Calendar, Trash2, Edit, DollarSign, FileText } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const Expenses = () => {
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    category: '',
    description: '',
    amount: '',
    currency: 'QAR',
    payment_method: 'CASH',
    supplier_id: '',
    status: 'APPROVED',
    notes: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        date_range: dateRange !== 'all' ? dateRange : undefined
      };
      const response = await apiService.expenses.list(params);
      setExpenses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({
      expense_date: new Date().toISOString().slice(0, 10),
      category: '',
      description: '',
      amount: '',
      currency: 'QAR',
      payment_method: 'CASH',
      supplier_id: '',
      status: 'APPROVED',
      notes: ''
    });
    setIsFormOpen(true);
  };

  const openEditForm = (expense) => {
    setEditingId(expense.id);
    setFormData({
      expense_date: expense.expense_date,
      category: expense.category || '',
      description: expense.description || '',
      amount: expense.amount?.toString() || '',
      currency: expense.currency || 'QAR',
      payment_method: expense.payment_method || 'CASH',
      supplier_id: expense.supplier_id || '',
      status: expense.status || 'APPROVED',
      notes: expense.notes || ''
    });
    setIsFormOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.supplier_id) delete payload.supplier_id;
      payload.amount = parseFloat(payload.amount);

      if (editingId) {
        await apiService.expenses.update(editingId, payload);
        toast.success('Expense updated');
      } else {
        await apiService.expenses.create(payload);
        toast.success('Expense created');
      }
      setIsFormOpen(false);
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      // toasts are handled by interceptor
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await apiService.expenses.delete(id);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('expenses.title', 'Expenses')}</h1>
          <p className="text-gray-600 mt-1">{t('expenses.subtitle', 'Track and manage company expenses')}</p>
        </div>
        <Button onClick={openCreateForm} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('expenses.create', 'Add Expense')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('expenses.search', 'Search expenses...')}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t('common.all_status', 'All Status')}</option>
              <option value="PENDING">{t('expenses.status.pending', 'Pending')}</option>
              <option value="APPROVED">{t('expenses.status.approved', 'Approved')}</option>
              <option value="PAID">{t('expenses.status.paid', 'Paid')}</option>
              <option value="CANCELLED">{t('expenses.status.cancelled', 'Cancelled')}</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">{t('common.all_categories', 'All Categories')}</option>
              <option value="RENT">{t('expenses.category.rent', 'Rent')}</option>
              <option value="UTILITIES">{t('expenses.category.utilities', 'Utilities')}</option>
              <option value="SALARIES">{t('expenses.category.salaries', 'Salaries')}</option>
              <option value="SUPPLIES">{t('expenses.category.supplies', 'Supplies')}</option>
              <option value="TRANSPORT">{t('expenses.category.transport', 'Transport')}</option>
              <option value="MISC">{t('expenses.category.misc', 'Misc')}</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">{t('common.all_dates', 'All Dates')}</option>
              <option value="today">{t('common.today', 'Today')}</option>
              <option value="week">{t('common.this_week', 'This Week')}</option>
              <option value="month">{t('common.this_month', 'This Month')}</option>
              <option value="quarter">{t('common.this_quarter', 'This Quarter')}</option>
            </select>
          </div>

          <Button onClick={fetchExpenses} variant="outline" className="flex items-center justify-center gap-2">
            <Search className="w-4 h-4" />
            {t('common.search', 'Search')}
          </Button>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('expenses.stats.total', 'Total Expenses')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{expenses.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('expenses.stats.pending', 'Pending')}</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{expenses.filter(e => e.status === 'PENDING').length}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('expenses.stats.approved', 'Approved')}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{expenses.filter(e => e.status === 'APPROVED').length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('expenses.stats.paid', 'Paid')}</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{expenses.filter(e => e.status === 'PAID').length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{expense.expense_date}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{expense.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{expense.description || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{Number(expense.amount).toFixed(2)} {expense.currency}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{expense.supplier?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => openEditForm(expense)} className="flex items-center gap-2">
                        <Edit className="w-4 h-4" /> Edit
                      </Button>
                      <Button variant="outline" onClick={() => handleDelete(expense.id)} className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" name="expense_date" value={formData.expense_date} onChange={handleFormChange} className="w-full border border-gray-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select name="category" value={formData.category} onChange={handleFormChange} className="w-full border border-gray-200 rounded-lg px-3 py-2">
                    <option value="">Select category</option>
                    <option value="RENT">Rent</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="SALARIES">Salaries</option>
                    <option value="SUPPLIES">Supplies</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="MISC">Misc</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleFormChange} className="w-full border border-gray-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select name="payment_method" value={formData.payment_method} onChange={handleFormChange} className="w-full border border-gray-200 rounded-lg px-3 py-2">
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="CARD">Card</option>
                    <option value="ONLINE">Online</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleFormChange} className="w-full border border-gray-200 rounded-lg px-3 py-2" rows={3} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier (optional)</label>
                  <input type="number" name="supplier_id" value={formData.supplier_id} onChange={handleFormChange} className="w-full border border-gray-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={formData.status} onChange={handleFormChange} className="w-full border border-gray-200 rounded-lg px-3 py-2">
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PAID">Paid</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleFormChange} className="w-full border border-gray-200 rounded-lg px-3 py-2" rows={2} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit">{editingId ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;