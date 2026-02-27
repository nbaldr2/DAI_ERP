import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    ShoppingCart, TrendingUp, Calendar, Clock, Users,
    CreditCard, Banknote, Layers, Trophy, ArrowUpRight,
    Store, ChevronRight, CheckCircle, XCircle, Activity
} from 'lucide-react';
import apiService from '../services/api';

/* ─── Helpers ─────────────────────────────────────────────────────────── */

const fmt = (n) => parseFloat(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDateTime = (d) => d ? `${fmtDate(d)} ${fmtTime(d)}` : '—';

const PAYMENT_ICONS = {
    CASH: { icon: Banknote, color: 'text-green-600', bg: 'bg-green-50', label: 'Cash' },
    CARD: { icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Card' },
    SPLIT: { icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Split' },
};

/* ─── KPI Card ────────────────────────────────────────────────────────── */

function KPICard({ label, amount, orders, icon: Icon, color, bg }) {
    return (
        <div className={`rounded-2xl p-5 border ${bg} flex items-start justify-between`}>
            <div>
                <p className="text-sm font-medium text-text-secondary mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{fmt(amount)} <span className="text-base font-semibold">QAR</span></p>
                <p className="text-xs text-text-secondary mt-1">{orders} order{orders !== 1 ? 's' : ''}</p>
            </div>
            <div className={`p-3 rounded-xl ${bg} border`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
        </div>
    );
}

/* ─── Mini bar chart (CSS-only) ──────────────────────────────────────── */

function MiniBarChart({ data }) {
    if (!data || data.length === 0) return (
        <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No data yet</div>
    );
    const max = Math.max(...data.map(d => parseFloat(d.total || 0)), 1);
    return (
        <div className="flex items-end gap-0.5 h-32 w-full">
            {data.map((d, i) => {
                const h = Math.max(4, (parseFloat(d.total || 0) / max) * 100);
                return (
                    <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1 group relative"
                    >
                        <div
                            className="w-full bg-indigo-500 rounded-t opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
                            style={{ height: `${h}%` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none">
                            {d.date}: {fmt(d.total)} QAR ({d.count} orders)
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Sessions Table ──────────────────────────────────────────────────── */

function SessionsTable({ sessions, onViewOrders }) {
    if (!sessions?.length) return (
        <div className="text-center py-8 text-text-secondary text-sm">No sessions yet</div>
    );
    return (
        <table className="w-full text-sm">
            <thead className="bg-background">
                <tr>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary">Cashier</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary">Warehouse</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary">Opened</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary">Closed</th>
                    <th className="px-4 py-3 text-right font-semibold text-text-secondary">Orders</th>
                    <th className="px-4 py-3 text-right font-semibold text-text-secondary">Revenue</th>
                    <th className="px-4 py-3 text-center font-semibold text-text-secondary">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {sessions.map(s => (
                    <tr key={s.id} className="hover:bg-card-hover transition">
                        <td className="px-4 py-3 font-medium">{s.user?.name || '—'}</td>
                        <td className="px-4 py-3 text-text-secondary">{s.warehouse?.name || '—'}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{fmtDateTime(s.opened_at || s.created_at)}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{s.closed_at ? fmtDateTime(s.closed_at) : <span className="text-green-500 font-medium">Open</span>}</td>
                        <td className="px-4 py-3 text-right">{s.order_count ?? 0}</td>
                        <td className="px-4 py-3 text-right font-semibold text-indigo-700">{fmt(s.total_sales)} QAR</td>
                        <td className="px-4 py-3 text-center">
                            {s.status === 'OPEN' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Open
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-card-hover text-text-secondary font-medium">
                                    Closed
                                </span>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/* ─── Main Dashboard ──────────────────────────────────────────────────── */

export default function POSDashboard() {
    const [sessionsPage, setSessionsPage] = useState(1);

    /* Dashboard stats */
    const { data: dashData, isLoading: dashLoading } = useQuery({
        queryKey: ['pos', 'dashboard'],
        queryFn: async () => {
            const { data } = await apiService.pos.getDashboard();
            return data.data;
        },
        staleTime: 60_000,
        refetchInterval: 5 * 60_000,
    });

    /* Sessions list (paginated) */
    const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
        queryKey: ['pos', 'sessions', sessionsPage],
        queryFn: async () => {
            const { data } = await apiService.pos.listSessions({ page: sessionsPage, limit: 10 });
            return data;
        },
        staleTime: 30_000,
    });

    const periods = dashData?.periods || {};
    const paymentBreakdown = dashData?.paymentBreakdown || [];
    const topProducts = dashData?.topProducts || [];
    const dailyRevenue = dashData?.dailyRevenue || [];
    const recentOrders = dashData?.recentOrders || [];
    const sessions = sessionsData?.data || [];
    const pagination = sessionsData?.pagination || {};

    /* Total payment for percentage */
    const totalPaymentRevenue = paymentBreakdown.reduce((s, p) => s + parseFloat(p.total || 0), 0);

    return (
        <div className="space-y-6">
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 rounded-xl">
                        <Store className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-text-primary">POS Dashboard</h1>
                        <p className="text-sm text-text-secondary">Sales analytics & session history</p>
                    </div>
                </div>
                <Link
                    to="/pos"
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
                >
                    <ShoppingCart size={16} />
                    Open POS
                </Link>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────────── */}
            {dashLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 rounded-2xl bg-card-hover animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        label="Today"
                        amount={periods.today?.total}
                        orders={periods.today?.count}
                        icon={Calendar}
                        color="text-blue-700"
                        bg="bg-blue-50 border-blue-100"
                    />
                    <KPICard
                        label="This Week"
                        amount={periods.thisWeek?.total}
                        orders={periods.thisWeek?.count}
                        icon={TrendingUp}
                        color="text-indigo-700"
                        bg="bg-indigo-50 border-indigo-100"
                    />
                    <KPICard
                        label="This Month"
                        amount={periods.thisMonth?.total}
                        orders={periods.thisMonth?.count}
                        icon={Activity}
                        color="text-purple-700"
                        bg="bg-purple-50 border-purple-100"
                    />
                    <KPICard
                        label="This Year"
                        amount={periods.thisYear?.total}
                        orders={periods.thisYear?.count}
                        icon={ArrowUpRight}
                        color="text-green-700"
                        bg="bg-green-50 border-green-100"
                    />
                </div>
            )}

            {/* ── Charts Row ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Daily Revenue Chart (last 30 days) */}
                <div className="lg:col-span-2 bg-card rounded-2xl border shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-text-primary">Daily Revenue (Last 30 Days)</h2>
                        <span className="text-xs text-text-secondary bg-card-hover px-2 py-1 rounded-lg">
                            {dailyRevenue.length} days with sales
                        </span>
                    </div>
                    {dashLoading ? (
                        <div className="h-32 bg-card-hover animate-pulse rounded-xl" />
                    ) : (
                        <MiniBarChart data={dailyRevenue} />
                    )}
                </div>

                {/* Payment Methods */}
                <div className="bg-card rounded-2xl border shadow-sm p-5">
                    <h2 className="font-bold text-text-primary mb-4">Payment Methods (This Month)</h2>
                    {dashLoading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-14 bg-card-hover animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : paymentBreakdown.length === 0 ? (
                        <div className="text-center py-8 text-gray-300 text-sm">No sales this month</div>
                    ) : (
                        <div className="space-y-3">
                            {paymentBreakdown.map(p => {
                                const cfg = PAYMENT_ICONS[p.payment_method] || PAYMENT_ICONS.CASH;
                                const Icon = cfg.icon;
                                const pct = totalPaymentRevenue > 0 ? (parseFloat(p.total) / totalPaymentRevenue * 100) : 0;
                                return (
                                    <div key={p.payment_method} className={`flex items-center gap-3 p-3 rounded-xl ${cfg.bg}`}>
                                        <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.color}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-semibold text-text-secondary">{cfg.label}</span>
                                                <span className="text-xs text-text-secondary">{parseInt(p.count)} orders</span>
                                            </div>
                                            <div className="w-full bg-card rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full ${cfg.color.replace('text-', 'bg-')}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className={`text-xs font-bold ${cfg.color}`}>{fmt(p.total)} QAR</span>
                                                <span className="text-xs text-text-secondary">{pct.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom Row: Top Products + Recent Orders ─────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Products */}
                <div className="bg-card rounded-2xl border shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <h2 className="font-bold text-text-primary">Top Products This Month</h2>
                    </div>
                    {dashLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-10 bg-card-hover animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : topProducts.length === 0 ? (
                        <div className="text-center py-8 text-gray-300 text-sm">No sales this month</div>
                    ) : (
                        <div className="space-y-2">
                            {topProducts.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-card-hover">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                                        ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                            idx === 1 ? 'bg-card-hover text-text-secondary' :
                                                idx === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-background text-text-secondary'}`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary truncate">{p.product_name}</p>
                                        <p className="text-xs text-text-secondary">Qty: {parseFloat(p.qty_sold || 0).toFixed(2)}</p>
                                    </div>
                                    <span className="text-sm font-bold text-indigo-700 whitespace-nowrap">{fmt(p.revenue)} QAR</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Orders */}
                <div className="bg-card rounded-2xl border shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <h2 className="font-bold text-text-primary">Recent Orders</h2>
                    </div>
                    {dashLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-10 bg-card-hover animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : recentOrders.length === 0 ? (
                        <div className="text-center py-8 text-gray-300 text-sm">No orders yet</div>
                    ) : (
                        <div className="space-y-1">
                            {recentOrders.map(o => {
                                const pmCfg = PAYMENT_ICONS[o.payment_method] || PAYMENT_ICONS.CASH;
                                return (
                                    <div key={o.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-card-hover">
                                        <div className={`p-1.5 rounded-lg ${pmCfg.bg}`}>
                                            <pmCfg.icon className={`w-3.5 h-3.5 ${pmCfg.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-text-secondary">#{o.order_number || o.id}</p>
                                            <p className="text-xs text-text-secondary">{fmtDateTime(o.created_at)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-text-primary">{fmt(o.total)} QAR</p>
                                            <p className="text-xs text-text-secondary">{o.creator?.name || '—'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Sessions History ─────────────────────────────────────── */}
            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-text-secondary" />
                        <h2 className="font-bold text-text-primary">Session History</h2>
                        {pagination.total != null && (
                            <span className="text-xs bg-card-hover text-text-secondary px-2 py-0.5 rounded-full">
                                {pagination.total} total
                            </span>
                        )}
                    </div>
                </div>

                {sessionsLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <SessionsTable sessions={sessions} />
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t bg-background">
                        <p className="text-sm text-text-secondary">
                            Page {pagination.page} of {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSessionsPage(p => Math.max(1, p - 1))}
                                disabled={pagination.page <= 1}
                                className="px-3 py-1.5 border rounded-lg text-sm text-text-secondary disabled:opacity-40 hover:bg-card-hover"
                            >
                                ← Prev
                            </button>
                            <button
                                onClick={() => setSessionsPage(p => p + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                                className="px-3 py-1.5 border rounded-lg text-sm text-text-secondary disabled:opacity-40 hover:bg-card-hover"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
