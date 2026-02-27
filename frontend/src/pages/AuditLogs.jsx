import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Plus,
  RefreshCw
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow, isValid } from 'date-fns';

const AuditLogs = () => {
  const { t } = useTranslation();

  // Helper function to safely format dates
  const safeFormatDate = (dateString, formatStr = 'MMM dd, yyyy HH:mm') => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isValid(date) ? format(date, formatStr) : 'Invalid Date';
  };

  // Helper function to safely format relative time
  const safeFormatDistanceToNow = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : 'Unknown';
  };
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState(null);

  const pageSize = 20;

  useEffect(() => {
    fetchAuditLogs();
    fetchStats();
  }, [currentPage, entityTypeFilter, actionFilter, userFilter, dateRange, searchTerm]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        entity_type: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        user_id: userFilter !== 'all' ? userFilter : undefined,
        date_range: dateRange !== 'all' ? dateRange : undefined
      };

      const response = await apiService.auditLogs.list(params);
      setAuditLogs(response.data.data || []);

      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to fetch audit logs');
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.auditLogs.getStatistics();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching audit stats:', error);
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const getActionIcon = (action) => {
    switch (action?.toLowerCase()) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'update':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'view':
        return <Eye className="w-4 h-4 text-text-secondary" />;
      case 'login':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'logout':
        return <XCircle className="w-4 h-4 text-text-secondary" />;
      default:
        return <Activity className="w-4 h-4 text-text-secondary" />;
    }
  };

  const getActionColor = (action) => {
    switch (action?.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'view':
        return 'bg-card-hover text-text-primary';
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'logout':
        return 'bg-card-hover text-text-primary';
      default:
        return 'bg-card-hover text-text-primary';
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const handleReset = () => {
    setSearchTerm('');
    setEntityTypeFilter('all');
    setActionFilter('all');
    setUserFilter('all');
    setDateRange('all');
    setCurrentPage(1);
  };

  if (loading && currentPage === 1) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Shield className="w-6 h-6 text-green-600" />
            {t('auditLogs.title', 'Audit Logs')}
          </h1>
          <p className="text-text-secondary mt-1">
            {t('auditLogs.subtitle', 'Track all system activities and user actions')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchAuditLogs}
            variant="outline"
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  {t('auditLogs.stats.total', 'Total Activities')}
                </p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {stats.total_activities?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  {t('auditLogs.stats.today', 'Today')}
                </p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {stats.today_activities?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  {t('auditLogs.stats.active_users', 'Active Users')}
                </p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {stats.active_users || '0'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <User className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  {t('auditLogs.stats.critical', 'Critical Actions')}
                </p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {stats.critical_actions || '0'}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
            <input
              type="text"
              placeholder={t('auditLogs.search', 'Search activities...')}
              className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
            >
              <option value="all">{t('common.all_entities', 'All Entities')}</option>
              <option value="stock_entries">{t('auditLogs.entities.stock', 'Stock')}</option>
              <option value="sales">{t('auditLogs.entities.sales', 'Sales')}</option>
              <option value="products">{t('auditLogs.entities.products', 'Products')}</option>
              <option value="customers">{t('auditLogs.entities.customers', 'Customers')}</option>
              <option value="suppliers">{t('auditLogs.entities.suppliers', 'Suppliers')}</option>
              <option value="users">{t('auditLogs.entities.users', 'Users')}</option>
            </select>
          </div>

          <div className="relative">
            <Activity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">{t('common.all_actions', 'All Actions')}</option>
              <option value="create">{t('auditLogs.actions.create', 'Create')}</option>
              <option value="update">{t('auditLogs.actions.update', 'Update')}</option>
              <option value="delete">{t('auditLogs.actions.delete', 'Delete')}</option>
              <option value="view">{t('auditLogs.actions.view', 'View')}</option>
              <option value="login">{t('auditLogs.actions.login', 'Login')}</option>
              <option value="logout">{t('auditLogs.actions.logout', 'Logout')}</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">{t('common.all_dates', 'All Dates')}</option>
              <option value="today">{t('common.today', 'Today')}</option>
              <option value="yesterday">{t('common.yesterday', 'Yesterday')}</option>
              <option value="week">{t('common.this_week', 'This Week')}</option>
              <option value="month">{t('common.this_month', 'This Month')}</option>
            </select>
          </div>

          <Button
            onClick={handleSearch}
            className="flex items-center justify-center gap-2"
            disabled={loading}
          >
            <Search className="w-4 h-4" />
            {t('common.search', 'Search')}
          </Button>

          <Button
            onClick={handleReset}
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.reset', 'Reset')}
          </Button>
        </div>
      </Card>

      {/* Audit Logs List */}
      <Card>
        <div className="p-6 border-b border-theme-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {t('auditLogs.list.title', 'Activity Log')}
          </h2>
        </div>

        {auditLogs.length === 0 && !loading ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {t('auditLogs.empty.title', 'No audit logs found')}
            </h3>
            <p className="text-text-secondary">
              {t('auditLogs.empty.description', 'No activities match your current filters.')}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t('auditLogs.table.timestamp', 'Timestamp')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t('auditLogs.table.user', 'User')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t('auditLogs.table.action', 'Action')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t('auditLogs.table.entity', 'Entity')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t('auditLogs.table.description', 'Description')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      {t('common.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme-border">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-card-hover">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        <div className="flex flex-col">
                          <span>{safeFormatDate(log.performed_at)}</span>
                          <span className="text-xs text-text-secondary">
                            {safeFormatDistanceToNow(log.performed_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-text-secondary mr-2" />
                          <div className="text-sm text-text-primary">
                            {log.performer?.name || log.performer?.username || log.user?.name || log.user?.username || 'System'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                            {t(`auditLogs.actions.${log.action?.toLowerCase()}`, log.action?.toUpperCase())}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        <div className="flex flex-col">
                          <span className="font-medium">{log.entity_type}</span>
                          {log.entity_id && (
                            <span className="text-xs text-text-secondary">ID: {log.entity_id}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        <div className="max-w-xs truncate" title={log.description}>
                          {log.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(log)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          {t('common.view', 'View')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-theme-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-text-secondary">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-theme-border">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  {getActionIcon(selectedLog.action)}
                  {t('auditLogs.details.title', 'Activity Details')}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  ×
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    {t('auditLogs.details.timestamp', 'Timestamp')}
                  </label>
                  <p className="text-sm text-text-primary">
                    {safeFormatDate(selectedLog.performed_at, 'PPpp')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    {t('auditLogs.details.user', 'User')}
                  </label>
                  <p className="text-sm text-text-primary">
                    {selectedLog.performer?.name || selectedLog.performer?.username || selectedLog.user?.name || selectedLog.user?.username || 'System'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    {t('auditLogs.details.action', 'Action')}
                  </label>
                  <p className="text-sm text-text-primary">
                    {selectedLog.action?.toUpperCase()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    {t('auditLogs.details.entity', 'Entity')}
                  </label>
                  <p className="text-sm text-text-primary">
                    {selectedLog.entity_type} {selectedLog.entity_id && `(ID: ${selectedLog.entity_id})`}
                  </p>
                </div>
              </div>

              {selectedLog.description && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    {t('auditLogs.details.description', 'Description')}
                  </label>
                  <p className="text-sm text-text-primary bg-background p-3 rounded-lg">
                    {selectedLog.description}
                  </p>
                </div>
              )}

              {selectedLog.old_values && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    {t('auditLogs.details.old_values', 'Previous Values')}
                  </label>
                  <pre className="text-xs text-text-primary bg-red-50 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    {t('auditLogs.details.new_values', 'New Values')}
                  </label>
                  <pre className="text-xs text-text-primary bg-green-50 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.ip_address && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    {t('auditLogs.details.ip_address', 'IP Address')}
                  </label>
                  <p className="text-sm text-text-primary font-mono">
                    {selectedLog.ip_address}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
