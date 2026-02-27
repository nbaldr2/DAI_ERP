import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import apiService from "../services/api";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { format } from "date-fns";
import pdfService from "../services/pdfService";
import { useSettings } from "../contexts/SettingsContext";

const QuotationCreate = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { settings } = useSettings();
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const [formData, setFormData] = useState({
        customer_id: "",
        quotation_number: "QTN-LOADING...",
        quotation_date: format(new Date(), "yyyy-MM-dd"),
        valid_until: format(
            new Date(new Date().setDate(new Date().getDate() + 30)),
            "yyyy-MM-dd",
        ),
        currency: "QAR",
        discount: 0,
        notes: "",
        terms: "",
        items: [
            {
                product_id: "",
                description: "",
                quantity: 1,
                unit_price: 0,
                tax_rate: 0,
                total_price: 0,
            },
        ],
    });

    const [selectedCustomer, setSelectedCustomer] = useState(null);

    useEffect(() => {
        fetchCustomers();
        fetchProducts();
        // In a real app we might fetch the next number from backend, but for now we'll match Invoice logic or let backend handle it on submit if we don't display it perfectly
        // But since backend generates it on creation if missing, we can just show a placeholder or fetch logic if implemented.
        // The Invoice logic had a getNextNumber endpoint. We didn't implement getNextQuotationNumber strictly but we can add it or just rely on backend generation.
        // For better UX let's use a placeholder or "Auto-generated"
        setFormData(prev => ({ ...prev, quotation_number: "QTN-AUTO" }));
    }, []);

    // Debounced product search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (productSearch) {
                fetchProducts(productSearch);
            } else {
                fetchProducts();
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [productSearch]);

    const fetchCustomers = async () => {
        try {
            setLoadingCustomers(true);
            const response = await apiService.customers.list({ limit: 100 });
            setCustomers(response.data.data || []);
        } catch (error) {
            console.error("Error fetching customers:", error);
            toast.error("Failed to load customers");
        } finally {
            setLoadingCustomers(false);
        }
    };

    const fetchProducts = async (searchTerm = '') => {
        try {
            setLoadingProducts(true);
            const params = { limit: 100 };
            if (searchTerm) {
                params.search = searchTerm;
            }
            const response = await apiService.products.list(params);
            setProducts(response.data.data || []);
        } catch (error) {
            console.error("Error fetching products:", error);
            toast.error("Failed to load products");
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleCustomerChange = async (customerId) => {
        setFormData({
            ...formData,
            customer_id: customerId,
        });

        if (customerId) {
            try {
                const response = await apiService.customers.get(customerId);
                if (response && response.data) {
                    const customer = response.data.data || response.data;
                    setSelectedCustomer(customer);
                }
            } catch (error) {
                console.error("Error fetching customer details:", error);
                toast.error("Failed to load customer details");
                setSelectedCustomer(null);
            }
        } else {
            setSelectedCustomer(null);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleItemChange = async (index, field, value) => {
        const updatedItems = [...formData.items];
        const safeValue = value === undefined ? '' : value;
        updatedItems[index][field] = safeValue;

        // Logic similar to InvoiceCreate but adapted
        if (field === "product_id" && safeValue) {
            try {
                const product = products.find(p => p.id.toString() === safeValue.toString());
                if (product) {
                    updatedItems[index].product_name = product.name_en; // Store name
                    updatedItems[index].description = product.description || (product.name_ar ? `${product.name_en} - ${product.name_ar}` : product.name_en);
                    updatedItems[index].unit_price = product.price_per_unit || 0;
                    updatedItems[index].quantity = 1;
                } else {
                    // Fetch if not in list
                    const response = await apiService.products.get(safeValue);
                    const fetchedProduct = response.data?.data || response.data;
                    if (fetchedProduct) {
                        updatedItems[index].product_name = fetchedProduct.name_en;
                        updatedItems[index].description = fetchedProduct.description || fetchedProduct.name_en;
                        updatedItems[index].unit_price = fetchedProduct.price_per_unit || 0;
                        updatedItems[index].quantity = 1;
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }

        if (field === "quantity" || field === "unit_price") {
            const qty = parseFloat(updatedItems[index].quantity) || 0;
            const price = parseFloat(updatedItems[index].unit_price) || 0;
            updatedItems[index].total_price = parseFloat((qty * price).toFixed(2));
        }

        setFormData(prev => ({ ...prev, items: updatedItems }));
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [
                ...formData.items,
                {
                    product_id: "",
                    description: "",
                    quantity: 1,
                    unit_price: 0,
                    tax_rate: 0,
                    total_price: 0,
                },
            ],
        });
    };

    const removeItem = (index) => {
        if (formData.items.length === 1) {
            toast.error("Quotation must have at least one item");
            return;
        }
        const updatedItems = [...formData.items];
        updatedItems.splice(index, 1);
        setFormData({ ...formData, items: updatedItems });
    };

    const calculateSubtotal = () => {
        return formData.items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
    };

    const calculateTax = () => {
        return formData.items.reduce((sum, item) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unit_price) || 0;
            const taxRate = parseFloat(item.tax_rate) || 0;
            const itemTotal = qty * price;
            return sum + (itemTotal * (taxRate / 100));
        }, 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const tax = calculateTax();
        const discount = parseFloat(formData.discount) || 0;
        return subtotal + tax - discount;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.customer_id) {
            toast.error("Please select a customer");
            return;
        }

        if (formData.items.some((item) => !item.product_id)) {
            toast.error("All items must have a product selected");
            return;
        }

        try {
            setLoading(true);

            const quotationData = {
                ...formData,
                customer_id: parseInt(formData.customer_id),
                discount: parseFloat(formData.discount) || 0,
                items: formData.items.map(item => ({
                    product_id: parseInt(item.product_id),
                    product_name: item.product_name, // Ensure we send this if model uses it
                    description: item.description,
                    quantity: parseFloat(item.quantity),
                    unit_price: parseFloat(item.unit_price),
                    tax_rate: parseFloat(item.tax_rate) || 0
                }))
            };

            // Remove placeholder number so backend generates one
            if (quotationData.quotation_number === 'QTN-AUTO') {
                delete quotationData.quotation_number;
            }

            await apiService.quotations.create(quotationData);
            toast.success("Quotation created successfully");
            navigate("/quotations");
        } catch (error) {
            console.error("Error creating quotation:", error);
            toast.error("Failed to create quotation");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">
                        Create New Quotation
                    </h1>
                    <p className="text-text-secondary mt-1">
                        Create a new quotation for a customer
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => navigate("/quotations")}
                    className="flex items-center gap-2 hover:bg-card-hover transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Quotations
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Customer Info */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Customer</label>
                            <select
                                name="customer_id"
                                value={formData.customer_id}
                                onChange={(e) => handleCustomerChange(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                required
                            >
                                <option value="">Select...</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {selectedCustomer && (
                        <div className="mt-4 p-4 bg-background rounded-md">
                            <p className="font-medium">{selectedCustomer.name}</p>
                            <p className="text-sm text-text-secondary">{selectedCustomer.address}</p>
                            <p className="text-sm text-text-secondary">{selectedCustomer.phone || selectedCustomer.contact}</p>
                        </div>
                    )}
                </Card>

                {/* Quotation Details */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Quotation Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Quotation Number</label>
                            <input
                                type="text"
                                name="quotation_number"
                                value={formData.quotation_number}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md bg-card-hover"
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
                            <input
                                type="date"
                                name="quotation_date"
                                value={formData.quotation_date}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Valid Until</label>
                            <input
                                type="date"
                                name="valid_until"
                                value={formData.valid_until}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                required
                            />
                        </div>
                    </div>
                </Card>

                {/* Items */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Items</h3>
                    <div className="space-y-4">
                        {formData.items.map((item, index) => (
                            <div key={index} className="flex flex-col md:flex-row gap-4 items-start border-b pb-4 last:border-0">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-xs text-text-secondary mb-1">Product</label>
                                    <select
                                        value={item.product_id}
                                        onChange={(e) => handleItemChange(index, "product_id", e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                        required
                                    >
                                        <option value="">Select Product...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name_en || p.name} ({p.stock_quantity || 0} avail)</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-text-secondary mb-1">Description</label>
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs text-text-secondary mb-1">Qty</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="block text-xs text-text-secondary mb-1">Unit Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={item.unit_price}
                                        onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="block text-xs text-text-secondary mb-1">Total</label>
                                    <div className="w-full p-2 bg-background border border-theme-border rounded-md text-right">
                                        {formData.currency} {parseFloat(item.total_price || 0).toFixed(2)}
                                    </div>
                                </div>
                                <div className="w-10 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4">
                        <Button type="button" variant="outline" onClick={addItem} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Item
                        </Button>
                    </div>
                </Card>

                {/* Totals & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Notes & Terms</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Terms & Conditions</label>
                                <textarea
                                    name="terms"
                                    value={formData.terms}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Subtotal:</span>
                                <span className="font-medium">{formData.currency} {calculateSubtotal().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Tax:</span>
                                <span className="font-medium">{formData.currency} {calculateTax().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-text-secondary">Discount:</span>
                                <input
                                    type="number"
                                    name="discount"
                                    value={formData.discount}
                                    onChange={handleInputChange}
                                    className="w-24 p-1 border border-gray-300 rounded text-right"
                                />
                            </div>
                            <div className="border-t pt-3 flex justify-between items-center">
                                <span className="text-lg font-bold">Total:</span>
                                <span className="text-xl font-bold text-green-600">{formData.currency} {calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/quotations")}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Creating..." : "Create Quotation"}
                    </Button>
                </div>

            </form>
        </div>
    );
};

export default QuotationCreate;
