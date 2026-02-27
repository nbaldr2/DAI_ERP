import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, AlertCircle, Calendar } from 'lucide-react';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const SalesCreateModal = ({ isOpen, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1); // 1: Select Product, 2: Select Batch, 3: Details
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [stockEntries, setStockEntries] = useState([]);
    const [customers, setCustomers] = useState([]);

    // Selection State
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [formData, setFormData] = useState({
        customer_id: '',
        sold_weight: '',
        unit_price: '',
        sale_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    // Search/Filter State
    const [productSearch, setProductSearch] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedProduct(null);
            setSelectedBatch(null);
            setFormData({
                customer_id: '',
                sold_weight: '',
                unit_price: '',
                sale_date: new Date().toISOString().split('T')[0],
                notes: ''
            });
            fetchProducts();
            fetchCustomers();
        }
    }, [isOpen]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await apiService.products.list({ page: 1, limit: 100 });
            setProducts(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await apiService.customers.list({ page: 1, limit: 100 });
            setCustomers(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const fetchStockEntries = async (productId) => {
        try {
            setLoading(true);
            // Fetch stock entries for product that are RECEIVED or INSPECTED and have balance
            const response = await apiService.stock.list({
                product_id: productId,
                status: ['RECEIVED', 'INSPECTED'],
                page: 1,
                limit: 50
            });

            // Filter out entries with 0 balance (though backend might do this, good to be safe)
            const validEntries = (response.data?.data || []).filter(entry => entry.available_qty > 0);
            setStockEntries(validEntries);

            if (validEntries.length === 0) {
                toast.error('No available stock for this product');
            } else {
                setStep(2);
            }
        } catch (error) {
            console.error('Error fetching stock:', error);
            toast.error('Failed to load stock entries');
        } finally {
            setLoading(false);
        }
    };

    const handleProductSelect = (product) => {
        setSelectedProduct(product);
        setFormData(prev => ({ ...prev, unit_price: product.price || '' }));
        fetchStockEntries(product.id);
    };

    const handleBatchSelect = (batch) => {
        setSelectedBatch(batch);
        setStep(3);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedBatch) return;

        // Validation
        if (parseFloat(formData.sold_weight) > selectedBatch.available_qty) {
            toast.error(`Cannot sell more than available quantity (${selectedBatch.available_qty.toFixed(2)} kg)`);
            return;
        }

        try {
            setLoading(true);
            const payload = {
                stock_entry_id: selectedBatch.id,
                customer_id: formData.customer_id || null,
                sold_weight: parseFloat(formData.sold_weight),
                unit_price: parseFloat(formData.unit_price),
                sale_date: formData.sale_date,
                notes: formData.notes
            };

            await apiService.sales.create(payload);
            toast.success('Sale created successfully');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating sale:', error);
            // Error is handled by interceptor, but we can add specific handling if needed
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium leading-6 text-text-primary">
                                New Sale
                                {step > 1 && <span className="text-sm font-normal text-text-secondary ml-2">Step {step}/3</span>}
                            </h3>
                            <button onClick={onClose} className="text-text-secondary hover:text-text-secondary">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {loading && step === 1 && products.length === 0 ? (
                            <LoadingSpinner />
                        ) : (
                            <div className="mt-2">
                                {/* Step 1: Select Product */}
                                {step === 1 && (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search products..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                            />
                                            <Search className="w-5 h-5 text-text-secondary absolute left-3 top-1/2 transform -translate-y-1/2" />
                                        </div>

                                        <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                                            {products
                                                .filter(p =>
                                                    (p.name_en?.toLowerCase() || '').includes(productSearch.toLowerCase()) ||
                                                    (p.name_ar?.toLowerCase() || '').includes(productSearch.toLowerCase())
                                                )
                                                .map(product => (
                                                    <button
                                                        key={product.id}
                                                        onClick={() => handleProductSelect(product)}
                                                        className="w-full text-left px-4 py-3 hover:bg-card-hover focus:outline-none flex justify-between items-center"
                                                    >
                                                        <div>
                                                            <p className="font-medium text-text-primary">{product.name_en}</p>
                                                            {product.name_ar && <p className="text-sm text-text-secondary">{product.name_ar}</p>}
                                                        </div>
                                                        <span className="text-text-secondary text-sm">Select &rarr;</span>
                                                    </button>
                                                ))}
                                            {products.length === 0 && (
                                                <p className="text-center py-4 text-text-secondary">No products found</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Select Batch */}
                                {step === 2 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between bg-background p-3 rounded-lg">
                                            <span className="font-medium text-text-secondary">Selected Product:</span>
                                            <div className="flex items-center">
                                                <span className="text-text-primary mr-2">{selectedProduct?.name_en}</span>
                                                <button onClick={() => setStep(1)} className="text-primary-600 text-sm hover:underline">Change</button>
                                            </div>
                                        </div>

                                        <h4 className="text-sm font-medium text-text-secondary">Select Stock Batch</h4>

                                        {loading ? (
                                            <LoadingSpinner />
                                        ) : stockEntries.length === 0 ? (
                                            <div className="text-center py-6 bg-background rounded-lg border border-dashed">
                                                <p className="text-text-secondary">No available stock for this product.</p>
                                                <button onClick={() => setStep(1)} className="mt-2 text-primary-600 font-medium">Select another product</button>
                                            </div>
                                        ) : (
                                            <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                                                {stockEntries.map(entry => (
                                                    <button
                                                        key={entry.id}
                                                        onClick={() => handleBatchSelect(entry)}
                                                        className="w-full text-left px-4 py-3 hover:bg-card-hover focus:outline-none"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-medium text-text-primary">
                                                                    ID: {entry.id} • {entry.warehouse?.name || 'Unknown Warehouse'}
                                                                </p>
                                                                <p className="text-sm text-text-secondary">
                                                                    In: {new Date(entry.date_in).toLocaleDateString()}
                                                                    {entry.expiry_date && ` • Exp: ${new Date(entry.expiry_date).toLocaleDateString()}`}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    {entry.available_qty.toFixed(2)} {selectedProduct?.unit || 'kg'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Step 3: Sale Details */}
                                {step === 3 && (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="flex items-center justify-between bg-background p-3 rounded-lg text-sm">
                                            <div>
                                                <span className="block font-medium text-text-secondary">Product: {selectedProduct?.name_en}</span>
                                                <span className="block text-text-secondary">Batch #{selectedBatch?.id} • Available: {selectedBatch?.available_qty.toFixed(2)}</span>
                                            </div>
                                            <button type="button" onClick={() => setStep(2)} className="text-primary-600 hover:underline">Change Batch</button>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary">Customer</label>
                                            <select
                                                value={formData.customer_id}
                                                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                                                required
                                            >
                                                <option value="">Select Customer</option>
                                                {customers.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary">
                                                    Weight Sold ({selectedProduct?.unit || 'kg'})
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    max={selectedBatch?.available_qty}
                                                    required
                                                    value={formData.sold_weight}
                                                    onChange={(e) => setFormData({ ...formData, sold_weight: e.target.value })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                                />
                                                {parseFloat(formData.sold_weight) > (selectedBatch?.available_qty || 0) && (
                                                    <p className="mt-1 text-xs text-red-600 flex items-center">
                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                        Exceeds available quantity
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary">Unit Price</label>
                                                <div className="mt-1 relative rounded-md shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-text-secondary sm:text-sm">QAR</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        required
                                                        value={formData.unit_price}
                                                        onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                                                        className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-12 sm:text-sm border-gray-300 rounded-md py-2"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary">Sale Date</label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <input
                                                    type="date"
                                                    required
                                                    value={formData.sale_date}
                                                    onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                                                    className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary">Notes (Optional)</label>
                                            <textarea
                                                rows={2}
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3"
                                            />
                                        </div>

                                        <div className="bg-background p-3 rounded-md">
                                            <div className="flex justify-between text-sm font-medium text-text-primary">
                                                <span>Total Amount:</span>
                                                <span>QAR {(parseFloat(formData.sold_weight || 0) * parseFloat(formData.unit_price || 0)).toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                            <button
                                                type="submit"
                                                disabled={loading || parseFloat(formData.sold_weight) > (selectedBatch?.available_qty || 0)}
                                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                                            >
                                                {loading ? 'Process...' : 'Complete Sale'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStep(step === 3 ? 2 : step === 2 ? 1 : onClose())}
                                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-card text-base font-medium text-text-secondary hover:bg-card-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                            >
                                                Back
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesCreateModal;
