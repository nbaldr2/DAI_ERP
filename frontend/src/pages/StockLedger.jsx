import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useStockLedger } from '../hooks/queries/useStock';
import debounce from 'lodash.debounce';

const StockLedger = () => {
    const { t } = useTranslation();

    // Ledger state for params
    const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
    const [ledgerDateRange, setLedgerDateRange] = useState('all');
    const [ledgerStartDate, setLedgerStartDate] = useState('');
    const [ledgerEndDate, setLedgerEndDate] = useState('');

    // Debounced ledger search handler
    const debouncedLedgerSearch = useMemo(
        () => debounce((value) => {
            setLedgerSearchTerm(value);
        }, 500),
        []
    );

    const handleLedgerSearchChange = (e) => {
        debouncedLedgerSearch(e.target.value);
    };

    // Ledger QueryParams
    const ledgerParams = useMemo(() => {
        const params = {};
        if (ledgerDateRange && ledgerDateRange !== 'all') params.date_range = ledgerDateRange;
        if (ledgerStartDate) params.start_date = ledgerStartDate;
        if (ledgerEndDate) params.end_date = ledgerEndDate;
        if (ledgerSearchTerm) params.search = ledgerSearchTerm;
        return params;
    }, [ledgerDateRange, ledgerStartDate, ledgerEndDate, ledgerSearchTerm]);

    const { data: ledgerResponse, isLoading: ledgerLoading } = useStockLedger(ledgerParams);
    const ledgerRecords = ledgerResponse?.data || [];

    if (ledgerLoading) {
        return <LoadingSpinner fullScreen message="Loading ledger..." />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text-primary">Stock Ledger</h1>
                <p className="text-text-secondary mt-1">History of all stock movements</p>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            <Filter className="w-4 h-4 mr-2" /> Apply Filters
                        </button>
                    </div>
                </div>

                {/* Ledger Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search product, note, batch..."
                            onChange={handleLedgerSearchChange}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <select
                            value={ledgerDateRange}
                            onChange={(e) => setLedgerDateRange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="all">All time</option>
                            <option value="today">Today</option>
                            <option value="week">Last 7 days</option>
                            <option value="month">This month</option>
                            <option value="90">Last 90 days</option>
                        </select>
                    </div>

                    <div>
                        <input
                            type="date"
                            value={ledgerStartDate}
                            onChange={(e) => setLedgerStartDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <input
                            type="date"
                            value={ledgerEndDate}
                            onChange={(e) => setLedgerEndDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="bg-card rounded-lg shadow-sm border overflow-hidden mt-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-theme-border">
                            <thead className="bg-background">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Movement</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Balance After</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Performed By</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Note</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-theme-border">
                                {ledgerRecords.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-card-hover">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                            {new Date(entry.performed_at || entry.updatedAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                            {entry.stock_entry?.product?.name_en || entry.stock_entry?.product?.name_ar || '—'}
                                            <div className="text-xs text-text-secondary">
                                                Supplier: {entry.stock_entry?.supplier?.name || '—'}
                                                <br />
                                                Warehouse: {entry.stock_entry?.warehouse?.name || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-card-hover text-text-primary">
                                                {entry.movement_type || entry.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                            {entry.qty || entry.quantity}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                            {entry.balance_after}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                            {entry.performer?.name || entry.performer?.username || 'System'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                            {entry.note || entry.notes || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {ledgerRecords.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-text-secondary">No ledger entries match the current filters.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StockLedger;
