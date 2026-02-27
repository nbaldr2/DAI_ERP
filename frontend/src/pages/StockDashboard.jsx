import React, { useMemo } from 'react';
import { useStock, useStockSummary, useStockTrends } from '../hooks/queries/useStock';
import LoadingSpinner from '../components/LoadingSpinner';
import { Package, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Archive, ShieldAlert, Activity } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const StockDashboard = () => {
    // Queries
    const { data: stockResponse, isLoading: stockLoading } = useStock();
    const { data: trendsResponse, isLoading: trendsLoading } = useStockTrends({ days: 30 });
    const { data: summaryResponse, isLoading: summaryLoading } = useStockSummary();

    const stockItems = stockResponse?.data || [];
    const trends = trendsResponse?.data || {};
    const summary = summaryResponse?.data || {};

    // Metrics Calculation — using real StockBatch fields
    const metrics = useMemo(() => {
        let totalValue = 0;
        let active = 0;
        let expired = 0;
        let depleted = 0;
        let quarantine = 0;
        let totalItems = stockItems.length;

        stockItems.forEach(item => {
            const qty = parseFloat(item.current_quantity) || parseFloat(item.available_qty) || 0;
            const cost = parseFloat(item.unit_cost) || 0;
            totalValue += qty * cost;

            switch (item.status) {
                case 'ACTIVE': active++; break;
                case 'EXPIRED': expired++; break;
                case 'DEPLETED': depleted++; break;
                case 'QUARANTINE': quarantine++; break;
            }
        });

        return { totalValue, active, expired, depleted, quarantine, totalItems };
    }, [stockItems]);

    // Chart Data - Trends
    const trendChartData = useMemo(() => {
        const labels = [];
        const datasets = [];

        if (trends && Object.keys(trends).length > 0) {
            const allDates = new Set();
            Object.values(trends).forEach(prodTrends => {
                if (Array.isArray(prodTrends)) {
                    prodTrends.forEach(pt => allDates.add(pt.date));
                }
            });
            const sortedDates = Array.from(allDates).sort();
            labels.push(...sortedDates);

            Object.keys(trends).slice(0, 5).forEach((productName, index) => {
                const data = sortedDates.map(date => {
                    const entry = trends[productName]?.find(t => t.date === date);
                    return entry ? entry.change : 0;
                });

                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

                datasets.push({
                    label: productName,
                    data,
                    borderColor: colors[index % colors.length],
                    backgroundColor: colors[index % colors.length],
                    tension: 0.4,
                });
            });
        }

        return { labels, datasets };
    }, [trends]);

    // Chart Data — Distribution by status
    const statusChartData = useMemo(() => {
        return {
            labels: ['Active', 'Expired', 'Depleted', 'Quarantine'],
            datasets: [{
                data: [metrics.active, metrics.expired, metrics.depleted, metrics.quarantine],
                backgroundColor: ['#10b981', '#ef4444', '#6b7280', '#f59e0b'],
            }]
        };
    }, [metrics]);

    if (stockLoading || trendsLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-card p-6 rounded-lg shadow-sm border border-theme-border">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-text-secondary">Total Value</p>
                            <h3 className="text-2xl font-bold text-text-primary mt-2">
                                QAR {metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border border-theme-border">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-text-secondary">Active Batches</p>
                            <h3 className="text-2xl font-bold text-text-primary mt-2">{metrics.active}</h3>
                            <p className="text-xs text-text-secondary mt-1">{metrics.totalItems} total</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <Package className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border border-theme-border">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-text-secondary">Expired</p>
                            <h3 className="text-2xl font-bold text-text-primary mt-2">{metrics.expired}</h3>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border border-theme-border">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-text-secondary">Quarantine</p>
                            <h3 className="text-2xl font-bold text-text-primary mt-2">{metrics.quarantine}</h3>
                        </div>
                        <div className="p-2 bg-yellow-50 rounded-lg">
                            <ShieldAlert className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-card p-6 rounded-lg shadow-sm border border-theme-border">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Stock Movement Trends (30 Days)</h3>
                    <div className="h-80">
                        {trendChartData.datasets.length > 0 ? (
                            <Line
                                data={trendChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'bottom' } }
                                }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-text-secondary">
                                <div className="text-center">
                                    <Activity className="w-12 h-12 mx-auto mb-2" />
                                    <p>No movement data for the last 30 days</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-card p-6 rounded-lg shadow-sm border border-theme-border">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Stock by Status</h3>
                    <div className="h-64 flex items-center justify-center">
                        {metrics.totalItems > 0 ? (
                            <Doughnut
                                data={statusChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'bottom' } }
                                }}
                            />
                        ) : (
                            <div className="text-center text-text-secondary">
                                <Archive className="w-12 h-12 mx-auto mb-2" />
                                <p>No stock data</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockDashboard;
