import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Plus, Trash2, ArrowRight } from 'lucide-react';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const StockTransferCreateModal = ({ isOpen, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        source_warehouse_id: '',
        destination_warehouse_id: '',
        notes: '',
        transfer_date: new Date().toISOString().split('T')[0]
    });

    const [items, setItems] = useState([]);

    // Add Item State
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [availableBatches, setAvailableBatches] = useState([]);
    const [newItem, setNewItem] = useState({
        batch_id: '',
        quantity: ''
    });

    // Fetch data on mount
    useEffect(() => {
        if (isOpen) {
            fetchWarehouses();
            fetchProducts();
            // Reset state
            setFormData({
                source_warehouse_id: '',
                destination_warehouse_id: '',
                notes: '',
                transfer_date: new Date().toISOString().split('T')[0]
            });
            setItems([]);
            setIsAddingItem(false);
            resetAddItemState();
        }
    }, [isOpen]);

    const fetchWarehouses = async () => {
        try {
            const response = await apiService.warehouses.list();
            setWarehouses(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching warehouses:', error);
            toast.error('Failed to load warehouses');
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await apiService.products.list({ limit: 1000 });
            setProducts(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchBatches = async (productId) => {
        if (!productId || !formData.source_warehouse_id) return;
        try {
            setLoading(true);
            const response = await apiService.stock.list({
                product_id: productId,
                warehouse_id: formData.source_warehouse_id,
                status: ['RECEIVED', 'ACTIVE', 'INSPECTED'],
                limit: 100
            });
            setAvailableBatches(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching batches:', error);
            toast.error('Failed to load batches');
        } finally {
            setLoading(false);
        }
    };

    const handleProductSelect = (product) => {
        if (!formData.source_warehouse_id) {
            toast.error('Please select a source warehouse first');
            return;
        }
        setSelectedProduct(product);
        fetchBatches(product.id);
        setNewItem({ ...newItem, batch_id: '', quantity: '' });
    };

    const resetAddItemState = () => {
        setSelectedProduct(null);
        setAvailableBatches([]);
        setNewItem({ batch_id: '', quantity: '' });
        setProductSearch('');
        setIsAddingItem(false);
    };

    const handleAddItem = () => {
        if (!selectedProduct || !newItem.batch_id || !newItem.quantity) {
            toast.error('Please complete all item fields');
            return;
        }

        const batch = availableBatches.find(b => b.id === parseInt(newItem.batch_id));
        if (parseFloat(newItem.quantity) > batch.available_qty) {
            toast.error(`Quantity exceeds available stock (${batch.available_qty})`);
            return;
        }

        const item = {
            product_id: selectedProduct.id,
            product_name: selectedProduct.name_en,
            batch_id: parseInt(newItem.batch_id),
            batch: batch,
            quantity: parseFloat(newItem.quantity),
            tempId: Date.now()
        };

        setItems([...items, item]);
        resetAddItemState();
    };

    const handleRemoveItem = (tempId) => {
        setItems(items.filter(i => i.tempId !== tempId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.source_warehouse_id || !formData.destination_warehouse_id) {
            toast.error('Please select both warehouses');
            return;
        }
        if (formData.source_warehouse_id === formData.destination_warehouse_id) {
            toast.error('Source and destination must be different');
            return;
        }
        if (items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        try {
            setLoading(true);
            const payload = {
                source_warehouse_id: parseInt(formData.source_warehouse_id),
                destination_warehouse_id: parseInt(formData.destination_warehouse_id),
                notes: formData.notes,
                expected_date: formData.transfer_date,
                items: items.map(i => ({
                    product_id: i.product_id,
                    batch_id: i.batch_id,
                    quantity: i.quantity
                }))
            };

            await apiService.stock.transfers.create(payload);
            toast.success('Transfer created successfully');
            onSuccess();
        } catch (error) {
            console.error('Error creating transfer:', error);
            toast.error(error.message || 'Failed to create transfer');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                <div className="inline-block align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-medium leading-6 text-text-primary">
                                New Stock Transfer
                            </h3>
                            <button onClick={onClose} className="text-text-secondary hover:text-text-secondary">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Warehouse Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary">Source Warehouse</label>
                                    <select
                                        required
                                        disabled={items.length > 0}
                                        value={formData.source_warehouse_id}
                                        onChange={(e) => setFormData({ ...formData, source_warehouse_id: e.target.value })}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                                    >
                                        <option value="">Select Source</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id} disabled={w.id === parseInt(formData.destination_warehouse_id)}>
                                                {w.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="hidden md:flex justify-center pt-6">
                                    <ArrowRight className="w-5 h-5 text-text-secondary" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-secondary">Destination Warehouse</label>
                                    <select
                                        required
                                        value={formData.destination_warehouse_id}
                                        onChange={(e) => setFormData({ ...formData, destination_warehouse_id: e.target.value })}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                                    >
                                        <option value="">Select Destination</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id} disabled={w.id === parseInt(formData.source_warehouse_id)}>
                                                {w.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary">Notes</label>
                                <textarea
                                    rows={2}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {/* Items Section */}
                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-sm font-medium text-text-primary">Items to Transfer</h4>
                                    {!isAddingItem && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!formData.source_warehouse_id) {
                                                    toast.error('Select source warehouse first');
                                                    return;
                                                }
                                                setIsAddingItem(true);
                                            }}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200"
                                        >
                                            <Plus className="w-4 h-4 mr-1" /> Add Item
                                        </button>
                                    )}
                                </div>

                                {/* Add Item Form */}
                                {isAddingItem && (
                                    <div className="bg-background p-4 rounded-lg mb-4 border border-theme-border">
                                        <div className="space-y-3">
                                            {!selectedProduct ? (
                                                <div>
                                                    <label className="block text-xs font-medium text-text-secondary uppercase">Search Product</label>
                                                    <div className="relative mt-1">
                                                        <input
                                                            type="text"
                                                            placeholder="Type to search..."
                                                            value={productSearch}
                                                            onChange={(e) => setProductSearch(e.target.value)}
                                                            className="block w-full pl-9 sm:text-sm border-gray-300 rounded-md"
                                                            autoFocus
                                                        />
                                                        <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 transform -translate-y-1/2" />
                                                    </div>
                                                    {productSearch && (
                                                        <div className="mt-2 max-h-40 overflow-y-auto bg-card border rounded-md shadow-sm">
                                                            {products
                                                                .filter(p => p.name_en.toLowerCase().includes(productSearch.toLowerCase()))
                                                                .map(p => (
                                                                    <button
                                                                        key={p.id}
                                                                        type="button"
                                                                        onClick={() => handleProductSelect(p)}
                                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-card-hover"
                                                                    >
                                                                        {p.name_en}
                                                                    </button>
                                                                ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-medium text-text-primary">{selectedProduct.name_en}</span>
                                                        <button type="button" onClick={() => setSelectedProduct(null)} className="text-xs text-primary-600 hover:underline">Change Product</button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-text-secondary uppercase">Batch</label>
                                                            <select
                                                                value={newItem.batch_id}
                                                                onChange={(e) => setNewItem({ ...newItem, batch_id: e.target.value })}
                                                                className="mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
                                                            >
                                                                <option value="">Select Batch</option>
                                                                {availableBatches.map(b => (
                                                                    <option key={b.id} value={b.id}>
                                                                        #{b.id} - Avail: {b.available_qty}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-text-secondary uppercase">Quantity</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0.01"
                                                                value={newItem.quantity}
                                                                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                                                className="mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-end space-x-2 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={resetAddItemState}
                                                    className="px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-text-secondary bg-card hover:bg-card-hover"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleAddItem}
                                                    disabled={!selectedProduct || !newItem.batch_id || !newItem.quantity}
                                                    className="px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                                                >
                                                    Add Item
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Items Table */}
                                {items.length > 0 ? (
                                    <div className="overflow-hidden border border-theme-border rounded-lg">
                                        <table className="min-w-full divide-y divide-theme-border">
                                            <thead className="bg-background">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Product</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Batch</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary uppercase">Quantity</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary uppercase"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-theme-border bg-card">
                                                {items.map((item) => (
                                                    <tr key={item.tempId}>
                                                        <td className="px-4 py-2 text-sm text-text-primary">{item.product_name}</td>
                                                        <td className="px-4 py-2 text-sm text-text-secondary">#{item.batch_id}</td>
                                                        <td className="px-4 py-2 text-sm text-right font-medium">{item.quantity}</td>
                                                        <td className="px-4 py-2 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItem(item.tempId)}
                                                                className="text-red-400 hover:text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    !isAddingItem && (
                                        <div className="text-center py-8 bg-background rounded-lg border border-dashed border-gray-300">
                                            <p className="text-sm text-text-secondary">No items added.</p>
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Form Actions */}
                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                <button
                                    type="submit"
                                    disabled={loading || items.length === 0}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                                >
                                    {loading ? 'Submitting...' : 'Create Transfer'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-card text-base font-medium text-text-secondary hover:bg-card-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockTransferCreateModal;
