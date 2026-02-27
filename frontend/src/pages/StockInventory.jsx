import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Package,
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    AlertTriangle,
    ArrowUpDown,
    CheckCircle,
    XCircle,
    ShieldAlert
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useStock, useStockMutation } from '../hooks/queries/useStock';

const StockInventory = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();

    // Stock Query
    const { data: stockResponse, isLoading: stockLoading } = useStock();
    const stockItems = stockResponse?.data || [];

    // Stock Mutations
    const { deleteStock } = useStockMutation();

    // Local state for stock filtering/sorting
    const [filteredItems, setFilteredItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortField, setSortField] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');

    // Filter and Sort Stock Items
    useEffect(() => {
        if (!stockItems) return;

        let filtered = [...stockItems];

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item => {
                const productName = item.product?.name_en || item.product?.name_ar || '';
                const supplierName = item.supplier?.name || '';
                const warehouseName = item.warehouse?.name || '';
                const batchNum = item.batch_number || '';
                return (
                    productName.toLowerCase().includes(term) ||
                    supplierName.toLowerCase().includes(term) ||
                    warehouseName.toLowerCase().includes(term) ||
                    batchNum.toLowerCase().includes(term)
                );
            });
        }

        // Apply status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(item => item.status === filterStatus);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortField) {
                case 'product':
                    aValue = (a.product?.name_en || '').toLowerCase();
                    bValue = (b.product?.name_en || '').toLowerCase();
                    break;
                case 'current_quantity':
                    aValue = parseFloat(a.current_quantity) || 0;
                    bValue = parseFloat(b.current_quantity) || 0;
                    break;
                case 'unit_cost':
                    aValue = parseFloat(a.unit_cost) || 0;
                    bValue = parseFloat(b.unit_cost) || 0;
                    break;
                case 'expiry_date':
                    aValue = a.expiry_date || '';
                    bValue = b.expiry_date || '';
                    break;
                default:
                    aValue = a[sortField] || '';
                    bValue = b[sortField] || '';
            }

            if (sortDirection === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        setFilteredItems(filtered);
    }, [stockItems, searchTerm, filterStatus, sortField, sortDirection]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800';
            case 'EXPIRED':
                return 'bg-red-100 text-red-800';
            case 'DEPLETED':
                return 'bg-card-hover text-text-primary';
            case 'QUARANTINE':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-card-hover text-text-primary';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'ACTIVE':
                return <CheckCircle className="w-4 h-4" />;
            case 'EXPIRED':
                return <XCircle className="w-4 h-4" />;
            case 'DEPLETED':
                return <Package className="w-4 h-4" />;
            case 'QUARANTINE':
                return <ShieldAlert className="w-4 h-4" />;
            default:
                return <Package className="w-4 h-4" />;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString();
    };

    if (stockLoading) {
        return <LoadingSpinner fullScreen message="Loading inventory..." />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Inventory</h1>
                    <p className="text-text-secondary mt-1">Manage stock batches</p>
                </div>
                {hasPermission('stock:create') && (
                    <button
                        onClick={() => navigate('/stock/new')}
                        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add New Batch
                    </button>
                )}
            </div>

            {/* Filters and Search */}
            <div className="bg-card rounded-lg p-6 shadow-sm border">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search by product, supplier, warehouse, or batch..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="EXPIRED">Expired</option>
                            <option value="DEPLETED">Depleted</option>
                            <option value="QUARANTINE">Quarantine</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stock Table */}
            <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-theme-border">
                        <thead className="bg-background">
                            <tr>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-card-hover"
                                    onClick={() => handleSort('product')}
                                >
                                    <div className="flex items-center">
                                        Product
                                        <ArrowUpDown className="w-4 h-4 ml-1" />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    Batch #
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-card-hover"
                                    onClick={() => handleSort('current_quantity')}
                                >
                                    <div className="flex items-center">
                                        Quantity
                                        <ArrowUpDown className="w-4 h-4 ml-1" />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    Status
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-card-hover"
                                    onClick={() => handleSort('unit_cost')}
                                >
                                    <div className="flex items-center">
                                        Unit Cost
                                        <ArrowUpDown className="w-4 h-4 ml-1" />
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-card-hover"
                                    onClick={() => handleSort('expiry_date')}
                                >
                                    <div className="flex items-center">
                                        Expiry
                                        <ArrowUpDown className="w-4 h-4 ml-1" />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    Supplier / Warehouse
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-theme-border">
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-card-hover">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-text-primary">
                                                {item.product?.name_en || item.product?.name_ar || '—'}
                                            </div>
                                            <div className="text-xs text-text-secondary">
                                                Received: {formatDate(item.date_received)}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary font-mono">
                                        {item.batch_number || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-text-primary">
                                            {parseFloat(item.current_quantity || 0).toLocaleString()} kg
                                        </div>
                                        <div className="text-xs text-text-secondary">
                                            Initial: {parseFloat(item.initial_quantity || 0).toLocaleString()} kg
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                            {getStatusIcon(item.status)}
                                            <span className="ml-1 capitalize">{(item.status || '').toLowerCase()}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                        QAR {parseFloat(item.unit_cost || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={
                                            item.expiry_date && new Date(item.expiry_date) < new Date()
                                                ? 'text-red-600 font-medium'
                                                : item.expiry_date && new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                                    ? 'text-yellow-600 font-medium'
                                                    : 'text-text-primary'
                                        }>
                                            {formatDate(item.expiry_date)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-text-primary">{item.supplier?.name || '—'}</div>
                                        <div className="text-xs text-text-secondary">{item.warehouse?.name || '—'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => navigate(`/stock/${item.id}`)}
                                                className="text-primary-600 hover:text-primary-700 p-1 rounded"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {hasPermission('stock:update') && (
                                                <button
                                                    onClick={() => navigate(`/stock/${item.id}/edit`)}
                                                    className="text-blue-600 hover:text-blue-700 p-1 rounded"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}
                                            {hasPermission('stock:delete') && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to delete this batch?')) {
                                                            deleteStock(item.id);
                                                        }
                                                    }}
                                                    className="text-red-600 hover:text-red-700 p-1 rounded"
                                                    title="Delete"
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

                {filteredItems.length === 0 && (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-text-primary mb-2">No stock batches found</h3>
                        <p className="text-text-secondary">
                            {searchTerm || filterStatus !== 'all'
                                ? 'Try adjusting your search or filter criteria.'
                                : 'Get started by receiving your first stock batch.'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockInventory;
