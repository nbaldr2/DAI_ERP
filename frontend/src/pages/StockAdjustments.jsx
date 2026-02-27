import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ClipboardList,
    Plus,
    Search,
    Filter,
    Eye,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useStockAdjustments } from '../hooks/queries/useStock';
import apiService from '../services/api';
import debounce from 'lodash.debounce';
import StockAdjustmentCreateModal from './StockAdjustmentCreateModal';

const StockAdjustments = () => {
    const { t } = useTranslation();
    const { hasPermission, user } = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Query
    const { data: adjustmentsResponse, isLoading, refetch } = useStockAdjustments({
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined
    });

    const adjustments = adjustmentsResponse?.data || [];

    const handleApprove = async (id) => {
        if (!window.confirm('Are you sure you want to approve this adjustment? This action cannot be undone.')) return;
        try {
            await apiService.stock.adjustments.approve(id);
            toast.success('Adjustment approved successfully');
            refetch();
        } catch (error) {
            console.error('Approve error:', error);
            toast.error(error.message || 'Failed to approve adjustment');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" /> Approved
                    </span>
                );
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" /> Rejected
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" /> Draft
                    </span>
                );
        }
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Stock Adjustments</h1>
                    <p className="text-text-secondary mt-1">Manage stocktake and inventory corrections</p>
                </div>
                {hasPermission('stock:create') && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        New Adjustment
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-card rounded-lg p-6 shadow-sm border">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search by ID or reason..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-theme-border">
                        <thead className="bg-background">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Reference</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Warehouse</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Reason</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Created By</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-theme-border">
                            {adjustments.map((adj) => (
                                <tr key={adj.id} className="hover:bg-card-hover">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                                        #{adj.id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                        {new Date(adj.adjustment_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                        {adj.warehouse?.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                        {adj.reason}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(adj.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                        {adj.creator?.name || 'System'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                className="text-primary-600 hover:text-primary-900"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            {adj.status === 'DRAFT' && hasPermission('stock:approve') && (
                                                <button
                                                    onClick={() => handleApprove(adj.id)}
                                                    className="text-green-600 hover:text-green-900"
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {adjustments.length === 0 && (
                    <div className="text-center py-12">
                        <ClipboardList className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-text-primary mb-2">No adjustments found</h3>
                        <p className="text-text-secondary">Create a new adjustment to get started.</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <StockAdjustmentCreateModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        refetch();
                    }}
                />
            )}
        </div>
    );
};

export default StockAdjustments;
