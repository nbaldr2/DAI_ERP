import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Calendar, Trash2, Edit, DollarSign, FileText, Download } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { useExpenses } from '../hooks/queries/useExpenses';
import toast from 'react-hot-toast';
import pdfService from '../services/pdfService';
import { useSettings } from '../hooks/queries/useSettings';

const Expenses = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // kept for backward compat with dropdown if needed, or we can just use start/end
  // for this implementation we rely on custom dates primarily or buttons for quick ranges

  const [page, setPage] = useState(1);
  const limit = 50;

  // Query Hook
  const {
    data: expensesData,
    isLoading,
    createExpense,
    updateExpense,
    deleteExpense,
    isCreating,
    isUpdating,
    isDeleting
  } = useExpenses({
    page,
    limit,
    search: searchTerm,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    date_from: startDate,
    date_to: endDate
  });

  const expenses = expensesData?.data || [];
  const pagination = expensesData?.pagination || { total: 0, pages: 1 };

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

  // Handlers
  const handleExportPDF = () => {
    try {
      if (expenses.length === 0) {
        toast.error('No expenses to export');
        return;
      }
      const blob = pdfService.generateExpenseReportPDF(
        expenses,
        { startDate, endDate },
        settings
      );
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error('Failed to generate PDF');
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
      payment_method: 'CASH', // Default
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (!payload.supplier_id) delete payload.supplier_id;
    payload.amount = parseFloat(payload.amount);

    if (editingId) {
      updateExpense({ id: editingId, data: payload }, {
        onSuccess: () => setIsFormOpen(false)
      });
    } else {
      createExpense(payload, {
        onSuccess: () => setIsFormOpen(false)
      });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this expense?')) {
      deleteExpense(id);
    }
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-card-hover text-text-primary';
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('expenses.title', 'Expenses')}</h1>
          <p className="text-text-secondary mt-1">{t('expenses.subtitle', 'Track and manage company expenses')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportPDF} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            {t('common.export_pdf', 'Export PDF')}
          </Button>
          <Button onClick={openCreateForm} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('expenses.create', 'Add Expense')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
            <input
              type="text"
              placeholder={t('expenses.search', 'Search expenses...')}
              className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
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

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
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

          {/* Date Range Start */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-text-secondary text-xs">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Date Range End */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-text-secondary text-xs">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">{t('expenses.stats.total', 'Total Expenses')}</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{pagination.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Note: Filter logic is now server-side, so counts here reflect the *current filtered view* if the API returns accurate counts for filtered subsets, OR we might want to do client-side counting if we have all data. 
            For now, let's assume we want to show totals of the *fetched* page or we need a stats endpoint. 
            Simpler: Just show counts of what we have on screen or remove specific status breakdown if it's confusing with server-side pagination.
            Better: Just keep the cards but calculate from `expenses` array (which is just one page). 
            Actually, let's keep it simple: Total Expenses (from pagination.total). 
            Status breakdown is tricky with server-side pagination unless we ask backend for stats.
            I will keep the cards but note they only reflect the current view or total count.
        */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">Pending (On Page)</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{expenses.filter(e => e.status === 'PENDING').length}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
        {/* ... other cards could be misleading, maybe better to remove or just show Total Amount if we had it */}
      </div>

      {/* Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-theme-border">
            <thead className="bg-background">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-theme-border">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-text-secondary">
                    No expenses found.
                  </td>
                </tr>
              ) : expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-3 text-sm text-text-primary">{expense.expense_date}</td>
                  <td className="px-4 py-3 text-sm text-text-primary">{expense.category}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{expense.description || '-'}</td>
                  <td className="px-4 py-3 text-sm text-text-primary text-right">{Number(expense.amount).toFixed(2)} {expense.currency}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{expense.supplier?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => openEditForm(expense)} className="p-1">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" onClick={() => handleDelete(expense.id)} className="p-1 text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-text-secondary">
            Page {page} of {pagination.pages || 1}
          </div>
          <div className="flex gap-2">
            <Button disabled={page === 1} onClick={() => setPage(p => p - 1)} variant="outline">Previous</Button>
            <Button disabled={page >= (pagination.pages || 1)} onClick={() => setPage(p => p + 1)} variant="outline">Next</Button>
          </div>
        </div>
      </Card>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-text-secondary hover:text-text-secondary">✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
                  <input type="date" name="expense_date" value={formData.expense_date} onChange={handleFormChange} className="w-full border border-theme-border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
                  <select name="category" value={formData.category} onChange={handleFormChange} className="w-full border border-theme-border rounded-lg px-3 py-2" required>
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
                  <label className="block text-sm font-medium text-text-secondary mb-1">Amount</label>
                  <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleFormChange} className="w-full border border-theme-border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Payment Method</label>
                  <select name="payment_method" value={formData.payment_method} onChange={handleFormChange} className="w-full border border-theme-border rounded-lg px-3 py-2">
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="CARD">Card</option>
                    <option value="ONLINE">Online</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleFormChange} className="w-full border border-theme-border rounded-lg px-3 py-2" rows={3} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Supplier (optional ID)</label>
                  <input type="number" name="supplier_id" value={formData.supplier_id} onChange={handleFormChange} className="w-full border border-theme-border rounded-lg px-3 py-2" placeholder="e.g. 10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                  <select name="status" value={formData.status} onChange={handleFormChange} className="w-full border border-theme-border rounded-lg px-3 py-2">
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PAID">Paid</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleFormChange} className="w-full border border-theme-border rounded-lg px-3 py-2" rows={2} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {isCreating || isUpdating ? <LoadingSpinner size="sm" /> : (editingId ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;