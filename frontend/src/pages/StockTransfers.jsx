import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Plus, Eye, Truck, CheckCircle, XCircle, Package, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/api';

/* ─── Status helpers ──────────────────────────────────────────────────── */

const STATUS_CONFIG = {
    DRAFT: { label: 'Draft', color: 'bg-card-hover text-text-secondary', dot: 'bg-gray-400' },
    IN_TRANSIT: { label: 'In Transit', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

/* ─── Modal wrapper ───────────────────────────────────────────────────── */

function Modal({ title, onClose, children, size = 'max-w-2xl' }) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`bg-card rounded-2xl shadow-2xl w-full ${size} max-h-[90vh] flex flex-col`}>
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-bold text-text-primary">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-card-hover text-text-secondary">
                        <X size={18} />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-6">{children}</div>
            </div>
        </div>
    );
}

/* ─── Create Transfer Modal ───────────────────────────────────────────── */

function CreateTransferModal({ onClose, onSuccess }) {
    const [step, setStep] = useState(1); // 1 = warehouses, 2 = items
    const [form, setForm] = useState({
        source_warehouse_id: '',
        destination_warehouse_id: '',
        transfer_date: new Date().toISOString().split('T')[0],
        notes: '',
    });
    const [items, setItems] = useState([]); // { product_id, product_name, batch_id, quantity, available }
    const [productSearch, setProductSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [addQty, setAddQty] = useState('');

    /* Warehouses */
    const { data: warehouses = [] } = useQuery({
        queryKey: ['warehouses'],
        queryFn: async () => {
            const { data } = await apiService.warehouses.list({ limit: 100 });
            return data.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    /* Batches in source warehouse */
    const { data: sourceBatches = [], isLoading: batchesLoading } = useQuery({
        queryKey: ['stock', 'batches', form.source_warehouse_id],
        queryFn: async () => {
            const { data } = await apiService.stock.list({
                warehouse_id: form.source_warehouse_id,
                status: 'ACTIVE',
                limit: 1000,
            });
            return data.data || [];
        },
        enabled: !!form.source_warehouse_id && step === 2,
        staleTime: 30_000,
    });

    /* Unique products available in source warehouse */
    const availableProducts = useMemo(() => {
        const map = {};
        for (const batch of sourceBatches) {
            const pid = batch.product_id;
            if (!map[pid]) {
                map[pid] = {
                    product_id: pid,
                    product_name: batch.product?.name_en || `Product #${pid}`,
                    product_name_ar: batch.product?.name_ar || '',
                    unit: batch.product?.unit || 'kg',
                    available: 0,
                    batches: [],
                };
            }
            map[pid].available += parseFloat(batch.current_quantity || 0);
            map[pid].batches.push(batch);
        }
        return Object.values(map).filter(p => p.available > 0);
    }, [sourceBatches]);

    const filteredProducts = useMemo(() => {
        if (!productSearch) return availableProducts;
        const q = productSearch.toLowerCase();
        return availableProducts.filter(p =>
            p.product_name.toLowerCase().includes(q) ||
            (p.product_name_ar && p.product_name_ar.includes(productSearch))
        );
    }, [availableProducts, productSearch]);

    /* Pick best batch(es) by FIFO (oldest expiry first) */
    function resolveBatch(product, qty) {
        const batches = [...product.batches].sort((a, b) =>
            new Date(a.expiry_date || '9999') - new Date(b.expiry_date || '9999')
        );
        let remaining = parseFloat(qty);
        const resolved = [];
        for (const b of batches) {
            if (remaining <= 0) break;
            const take = Math.min(parseFloat(b.current_quantity), remaining);
            resolved.push({ batch_id: b.id, quantity: take, batch_number: b.batch_number });
            remaining -= take;
        }
        if (remaining > 0.001) return null; // insufficient stock
        return resolved;
    }

    function handleAddItem() {
        if (!selectedProduct || !addQty || parseFloat(addQty) <= 0) {
            toast.error('Select a product and enter a valid quantity');
            return;
        }
        const qty = parseFloat(addQty);
        if (qty > selectedProduct.available) {
            toast.error(`Max available: ${selectedProduct.available} ${selectedProduct.unit}`);
            return;
        }
        const batches = resolveBatch(selectedProduct, qty);
        if (!batches) {
            toast.error('Insufficient stock across batches');
            return;
        }
        // Flatten into one item per batch
        for (const b of batches) {
            const exists = items.find(i => i.batch_id === b.batch_id);
            if (exists) {
                setItems(prev => prev.map(i =>
                    i.batch_id === b.batch_id
                        ? { ...i, quantity: parseFloat(i.quantity) + b.quantity }
                        : i
                ));
            } else {
                setItems(prev => [...prev, {
                    product_id: selectedProduct.product_id,
                    product_name: selectedProduct.product_name,
                    unit: selectedProduct.unit,
                    batch_id: b.batch_id,
                    batch_number: b.batch_number,
                    quantity: b.quantity,
                    available: selectedProduct.available,
                }]);
            }
        }
        setSelectedProduct(null);
        setAddQty('');
        setProductSearch('');
    }

    /* Mutation */
    const queryClient = useQueryClient();
    const createMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                source_warehouse_id: parseInt(form.source_warehouse_id),
                destination_warehouse_id: parseInt(form.destination_warehouse_id),
                transfer_date: form.transfer_date,
                notes: form.notes,
                items: items.map(i => ({
                    product_id: i.product_id,
                    batch_id: i.batch_id,
                    quantity: i.quantity,
                })),
            };
            const { data } = await apiService.stock.transfers.create(payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock', 'transfers'] });
            toast.success('Transfer created successfully');
            onSuccess();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to create transfer');
        },
    });

    const canProceed = form.source_warehouse_id &&
        form.destination_warehouse_id &&
        form.source_warehouse_id !== form.destination_warehouse_id;

    return (
        <Modal title="New Stock Transfer" onClose={onClose} size="max-w-3xl">
            {/* Steps indicator */}
            <div className="flex items-center gap-2 mb-6">
                {[1, 2].map(s => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                            ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-text-secondary'}`}>
                            {s}
                        </div>
                        <span className={`text-sm ${step >= s ? 'text-indigo-700 font-medium' : 'text-text-secondary'}`}>
                            {s === 1 ? 'Warehouses' : 'Products'}
                        </span>
                        {s < 2 && <ChevronRight size={16} className="text-gray-300 mx-1" />}
                    </div>
                ))}
            </div>

            {step === 1 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Source Warehouse *</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                                value={form.source_warehouse_id}
                                onChange={e => setForm(f => ({ ...f, source_warehouse_id: e.target.value }))}
                            >
                                <option value="">Select source...</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Destination Warehouse *</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                                value={form.destination_warehouse_id}
                                onChange={e => setForm(f => ({ ...f, destination_warehouse_id: e.target.value }))}
                            >
                                <option value="">Select destination...</option>
                                {warehouses
                                    .filter(w => String(w.id) !== String(form.source_warehouse_id))
                                    .map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Transfer Date</label>
                        <input
                            type="date"
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                            value={form.transfer_date}
                            onChange={e => setForm(f => ({ ...f, transfer_date: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                        <textarea
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none"
                            rows={3}
                            placeholder="Optional notes..."
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        />
                    </div>
                    {form.source_warehouse_id && form.source_warehouse_id === form.destination_warehouse_id && (
                        <p className="text-red-500 text-sm">Source and destination must be different</p>
                    )}
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={() => setStep(2)}
                            disabled={!canProceed}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-indigo-700 transition"
                        >
                            Next: Add Products →
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    {/* Route summary */}
                    <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg text-sm">
                        <span className="font-semibold text-indigo-700">
                            {warehouses.find(w => String(w.id) === String(form.source_warehouse_id))?.name}
                        </span>
                        <ArrowRightLeft size={16} className="text-indigo-400 flex-shrink-0" />
                        <span className="font-semibold text-indigo-700">
                            {warehouses.find(w => String(w.id) === String(form.destination_warehouse_id))?.name}
                        </span>
                    </div>

                    {/* Product search & add */}
                    {batchesLoading ? (
                        <div className="text-center py-6 text-text-secondary text-sm">Loading available stock...</div>
                    ) : (
                        <div className="border rounded-xl p-4 bg-background space-y-3">
                            <p className="text-sm font-semibold text-text-secondary">Add Product</p>
                            <input
                                type="text"
                                placeholder="Search product..."
                                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                                value={productSearch}
                                onChange={e => { setProductSearch(e.target.value); setSelectedProduct(null); }}
                            />
                            {productSearch && !selectedProduct && (
                                <div className="border rounded-lg bg-card max-h-48 overflow-y-auto divide-y">
                                    {filteredProducts.length === 0 ? (
                                        <div className="p-3 text-sm text-text-secondary">No products found</div>
                                    ) : filteredProducts.map(p => (
                                        <button
                                            key={p.product_id}
                                            onClick={() => { setSelectedProduct(p); setProductSearch(p.product_name); }}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex justify-between items-center"
                                        >
                                            <span>{p.product_name}</span>
                                            <span className="text-xs text-text-secondary">{p.available.toFixed(2)} {p.unit}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedProduct && (
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="text-xs text-text-secondary block mb-1">
                                            Quantity ({selectedProduct.unit}) — Available: {selectedProduct.available.toFixed(2)}
                                        </label>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            max={selectedProduct.available}
                                            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                                            value={addQty}
                                            onChange={e => setAddQty(e.target.value)}
                                            placeholder="Enter quantity..."
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddItem}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
                                    >
                                        + Add
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Items list */}
                    {items.length > 0 && (
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-background">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold text-text-secondary">Product</th>
                                        <th className="px-4 py-2 text-left font-semibold text-text-secondary">Batch</th>
                                        <th className="px-4 py-2 text-right font-semibold text-text-secondary">Qty</th>
                                        <th className="px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-card-hover">
                                            <td className="px-4 py-2">{item.product_name}</td>
                                            <td className="px-4 py-2 text-text-secondary text-xs">{item.batch_number || `#${item.batch_id}`}</td>
                                            <td className="px-4 py-2 text-right font-medium">{parseFloat(item.quantity).toFixed(2)} {item.unit}</td>
                                            <td className="px-4 py-2 text-right">
                                                <button
                                                    onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                                                    className="text-red-400 hover:text-red-600"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex justify-between pt-2">
                        <button
                            onClick={() => setStep(1)}
                            className="px-4 py-2 border rounded-lg text-sm text-text-secondary hover:bg-card-hover"
                        >
                            ← Back
                        </button>
                        <button
                            onClick={() => createMutation.mutate()}
                            disabled={items.length === 0 || createMutation.isPending}
                            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-green-700 transition"
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Transfer'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

/* ─── Transfer Detail Modal ───────────────────────────────────────────── */

function TransferDetailModal({ transferId, onClose }) {
    const queryClient = useQueryClient();

    const { data: transfer, isLoading } = useQuery({
        queryKey: ['stock', 'transfers', transferId],
        queryFn: async () => {
            const { data } = await apiService.stock.transfers.get(transferId);
            return data.data;
        },
        enabled: !!transferId,
    });

    const statusMutation = useMutation({
        mutationFn: async (status) => {
            const { data } = await apiService.stock.transfers.updateStatus(transferId, status);
            return data.data;
        },
        onSuccess: (_, status) => {
            queryClient.invalidateQueries({ queryKey: ['stock', 'transfers'] });
            toast.success(`Transfer marked as ${status.replace('_', ' ')}`);
            onClose();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Status update failed');
        },
    });

    if (isLoading || !transfer) {
        return (
            <Modal title="Transfer Details" onClose={onClose}>
                <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
            </Modal>
        );
    }

    const items = transfer.StockTransferItems || transfer.items || [];

    return (
        <Modal title={`Transfer #${transfer.id}`} onClose={onClose} size="max-w-2xl">
            {/* Status + route */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 text-sm font-semibold text-text-secondary">
                    <span className="text-base">{transfer.source_warehouse?.name}</span>
                    <ArrowRightLeft size={18} className="text-indigo-500" />
                    <span className="text-base">{transfer.destination_warehouse?.name}</span>
                </div>
                <StatusBadge status={transfer.status} />
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="bg-background rounded-lg p-3">
                    <p className="text-text-secondary text-xs mb-1">Created by</p>
                    <p className="font-medium">{transfer.creator?.name || '—'}</p>
                </div>
                <div className="bg-background rounded-lg p-3">
                    <p className="text-text-secondary text-xs mb-1">Transfer Date</p>
                    <p className="font-medium">{transfer.transfer_date || '—'}</p>
                </div>
                {transfer.receiver && (
                    <div className="bg-background rounded-lg p-3">
                        <p className="text-text-secondary text-xs mb-1">Received by</p>
                        <p className="font-medium">{transfer.receiver.name}</p>
                    </div>
                )}
                {transfer.notes && (
                    <div className="bg-background rounded-lg p-3 col-span-2">
                        <p className="text-text-secondary text-xs mb-1">Notes</p>
                        <p className="font-medium">{transfer.notes}</p>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="border rounded-xl overflow-hidden mb-5">
                <div className="bg-background px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Items ({items.length})
                </div>
                {items.length === 0 ? (
                    <div className="p-4 text-sm text-text-secondary">No items</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="px-4 py-2 text-left text-text-secondary">Product</th>
                                <th className="px-4 py-2 text-left text-text-secondary">Batch</th>
                                <th className="px-4 py-2 text-right text-text-secondary">Quantity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-card-hover">
                                    <td className="px-4 py-2">{item.product?.name_en || item.product_id}</td>
                                    <td className="px-4 py-2 text-text-secondary text-xs">{item.batch?.batch_number || `#${item.batch_id}`}</td>
                                    <td className="px-4 py-2 text-right font-medium">
                                        {parseFloat(item.quantity).toFixed(2)} {item.product?.unit || ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
                {transfer.status === 'DRAFT' && (
                    <>
                        <button
                            onClick={() => statusMutation.mutate('CANCELLED')}
                            disabled={statusMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                        >
                            <XCircle size={16} /> Cancel
                        </button>
                        <button
                            onClick={() => statusMutation.mutate('IN_TRANSIT')}
                            disabled={statusMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            <Truck size={16} /> {statusMutation.isPending ? 'Sending...' : 'Send (In Transit)'}
                        </button>
                    </>
                )}
                {transfer.status === 'IN_TRANSIT' && (
                    <>
                        <button
                            onClick={() => statusMutation.mutate('CANCELLED')}
                            disabled={statusMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                        >
                            <XCircle size={16} /> Cancel
                        </button>
                        <button
                            onClick={() => statusMutation.mutate('COMPLETED')}
                            disabled={statusMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                        >
                            <CheckCircle size={16} /> {statusMutation.isPending ? 'Completing...' : 'Mark Received'}
                        </button>
                    </>
                )}
                {(transfer.status === 'COMPLETED' || transfer.status === 'CANCELLED') && (
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-card-hover text-text-secondary rounded-lg text-sm font-semibold hover:bg-gray-200"
                    >
                        Close
                    </button>
                )}
            </div>
        </Modal>
    );
}

/* ─── Main Page ───────────────────────────────────────────────────────── */

export default function StockTransfers() {
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [page, setPage] = useState(1);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['stock', 'transfers', statusFilter, page],
        queryFn: async () => {
            const params = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const { data } = await apiService.stock.transfers.list(params);
            return data;
        },
        staleTime: 30_000,
    });

    const transfers = data?.data || [];
    const pagination = data?.pagination || {};

    const STATUS_TABS = [
        { label: 'All', value: '' },
        { label: 'Draft', value: 'DRAFT' },
        { label: 'In Transit', value: 'IN_TRANSIT' },
        { label: 'Completed', value: 'COMPLETED' },
        { label: 'Cancelled', value: 'CANCELLED' },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-text-primary">Stock Transfers</h1>
                        <p className="text-sm text-text-secondary">Move stock between warehouses</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
                >
                    <Plus size={16} />
                    New Transfer
                </button>
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-1 bg-card-hover rounded-xl p-1 w-fit">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition
                            ${statusFilter === tab.value
                                ? 'bg-card text-indigo-700 shadow-sm'
                                : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl shadow-sm border overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : transfers.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-text-secondary font-medium">No transfers found</p>
                        <p className="text-sm text-text-secondary mt-1">Create a transfer to move stock between warehouses</p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                        >
                            + New Transfer
                        </button>
                    </div>
                ) : (
                    <>
                        <table className="w-full text-sm">
                            <thead className="bg-background border-b">
                                <tr>
                                    <th className="px-5 py-3 text-left font-semibold text-text-secondary">#</th>
                                    <th className="px-5 py-3 text-left font-semibold text-text-secondary">From</th>
                                    <th className="px-5 py-3 text-center font-semibold text-text-secondary"></th>
                                    <th className="px-5 py-3 text-left font-semibold text-text-secondary">To</th>
                                    <th className="px-5 py-3 text-left font-semibold text-text-secondary">Date</th>
                                    <th className="px-5 py-3 text-left font-semibold text-text-secondary">Created by</th>
                                    <th className="px-5 py-3 text-left font-semibold text-text-secondary">Status</th>
                                    <th className="px-5 py-3 text-right font-semibold text-text-secondary">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {transfers.map(t => (
                                    <tr key={t.id} className="hover:bg-card-hover transition">
                                        <td className="px-5 py-3 font-mono text-text-secondary">#{t.id}</td>
                                        <td className="px-5 py-3 font-medium">{t.source_warehouse?.name || '—'}</td>
                                        <td className="px-2 py-3 text-center">
                                            <ArrowRightLeft size={14} className="text-indigo-400 mx-auto" />
                                        </td>
                                        <td className="px-5 py-3 font-medium">{t.destination_warehouse?.name || '—'}</td>
                                        <td className="px-5 py-3 text-text-secondary">
                                            {t.transfer_date || new Date(t.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-3 text-text-secondary">{t.creator?.name || '—'}</td>
                                        <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                onClick={() => setSelectedId(t.id)}
                                                className="flex items-center gap-1.5 ml-auto px-3 py-1.5 text-indigo-600 bg-indigo-50 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
                                            >
                                                <Eye size={13} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3 border-t bg-background">
                                <p className="text-sm text-text-secondary">
                                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={pagination.page <= 1}
                                        className="px-3 py-1.5 border rounded-lg text-sm text-text-secondary disabled:opacity-40 hover:bg-card-hover"
                                    >
                                        ← Prev
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={pagination.page >= pagination.totalPages}
                                        className="px-3 py-1.5 border rounded-lg text-sm text-text-secondary disabled:opacity-40 hover:bg-card-hover"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            {showCreate && (
                <CreateTransferModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => setShowCreate(false)}
                />
            )}
            {selectedId && (
                <TransferDetailModal
                    transferId={selectedId}
                    onClose={() => setSelectedId(null)}
                />
            )}
        </div>
    );
}
