import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import ProductGrid from './ProductGrid';
import CartPanel from './CartPanel';
import CheckoutModal from './CheckoutModal';
import SessionModal from './SessionModal';
import POSReceipt from './POSReceipt';
import {
    usePosSession,
    useOpenSession,
    useCloseSession,
    usePosProducts,
    useCompleteSale,
    useWarehouses,
    useParkedOrders,
} from '../../hooks/queries/usePos';
import './pos.css';

export default function POSPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Session state
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [completedOrder, setCompletedOrder] = useState(null);

    // Cart state
    const [cart, setCart] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);

    // Search/category state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // Barcode scanner state
    const barcodeBuffer = useRef('');
    const barcodeTimeout = useRef(null);

    // Queries
    const { data: session, isLoading: sessionLoading, refetch: refetchSession } = usePosSession();
    const { data: warehouses = [] } = useWarehouses();
    const { data: productsData, isLoading: productsLoading } = usePosProducts(
        session?.warehouse_id || selectedWarehouse?.id,
        searchTerm,
        selectedCategory
    );
    const { data: parkedOrders = [] } = useParkedOrders(session?.id);

    // Mutations
    const openSessionMutation = useOpenSession();
    const closeSessionMutation = useCloseSession();
    const completeSaleMutation = useCompleteSale();

    // Determine warehouse
    const activeWarehouse = session?.warehouse || selectedWarehouse;

    // Check for existing session on mount
    useEffect(() => {
        if (!sessionLoading && !session) {
            setShowSessionModal(true);
        } else if (session) {
            setSelectedWarehouse(session.warehouse);
        }
    }, [session, sessionLoading]);

    // Barcode scanner listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // Clear previous timeout
            if (barcodeTimeout.current) {
                clearTimeout(barcodeTimeout.current);
            }

            // Append character to buffer
            if (e.key.length === 1) {
                barcodeBuffer.current += e.key;
            }

            // Check for Enter (barcode complete)
            if (e.key === 'Enter' && barcodeBuffer.current) {
                const barcode = barcodeBuffer.current.trim();
                barcodeBuffer.current = '';

                // Find product by barcode (search in name or SKU)
                const product = productsData?.products?.find(
                    p => p.name_en?.toLowerCase().includes(barcode.toLowerCase()) ||
                        p.name_ar?.includes(barcode)
                );

                if (product) {
                    addToCart(product);
                    toast.success(t('pos.addedToCart', { name: product.name_en }));
                } else {
                    toast.error(t('pos.productNotFound'));
                }
            }

            // Reset buffer after 100ms of no input
            barcodeTimeout.current = setTimeout(() => {
                barcodeBuffer.current = '';
            }, 100);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
        };
    }, [productsData?.products]);

    // Session handlers
    const handleOpenSession = useCallback(async (warehouseId, openingCash) => {
        try {
            await openSessionMutation.mutateAsync({
                warehouse_id: warehouseId,
                opening_cash: openingCash,
            });
            setShowSessionModal(false);
            const wh = warehouses.find(w => w.id === warehouseId);
            setSelectedWarehouse(wh);
        } catch (error) {
            console.error('Failed to open session:', error);
        }
    }, [openSessionMutation, warehouses]);

    const handleCloseSession = useCallback(async (closingCash) => {
        if (!session) return;
        try {
            await closeSessionMutation.mutateAsync({
                sessionId: session.id,
                closingCash,
            });
            navigate('/dashboard');
        } catch (error) {
            console.error('Failed to close session:', error);
        }
    }, [closeSessionMutation, session, navigate]);

    // Cart handlers
    const addToCart = useCallback((product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product_id === product.id
                        ? { ...item, qty: item.qty + 1 }
                        : item
                );
            }
            return [...prev, {
                product_id: product.id,
                product_name: product.name_en,
                unit_price: product.price,
                qty: 1,
                unit: product.unit,
                stock: product.stock,
                discount: 0,
            }];
        });
    }, []);

    const updateCartItem = useCallback((productId, updates) => {
        setCart(prev => prev.map(item =>
            item.product_id === productId
                ? { ...item, ...updates }
                : item
        ));
    }, []);

    const removeFromCart = useCallback((productId) => {
        setCart(prev => prev.filter(item => item.product_id !== productId));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
    }, []);

    // Checkout handler
    const handleCheckout = useCallback(() => {
        if (cart.length === 0) {
            toast.error(t('pos.cartIsEmpty'));
            return;
        }
        setShowCheckout(true);
    }, [cart]);

    const handleCompleteSale = useCallback(async (payment) => {
        if (!session) {
            toast.error(t('pos.noActiveSession'));
            return;
        }

        try {
            const order = await completeSaleMutation.mutateAsync({
                sessionId: session.id,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    qty: item.qty,
                    unit_price: item.unit_price,
                    discount: item.discount,
                })),
                payment,
            });

            setCompletedOrder(order);
            setShowCheckout(false);
            setShowReceipt(true);
            clearCart();
        } catch (error) {
            console.error('Sale failed:', error);
        }
    }, [session, cart, completeSaleMutation, clearCart]);

    // Calculate cart totals
    const cartTotals = cart.reduce((acc, item) => {
        const itemTotal = (item.qty * item.unit_price) - item.discount;
        return {
            subtotal: acc.subtotal + itemTotal,
            itemCount: acc.itemCount + item.qty,
        };
    }, { subtotal: 0, itemCount: 0 });

    // Loading state
    if (sessionLoading) {
        return (
            <div className="pos-loading">
                <div className="pos-spinner" />
                <p>{t('pos.loading')}</p>
            </div>
        );
    }

    return (
        <div className="pos-container">
            {/* Top Bar */}
            <header className="pos-header">
                <div className="pos-header-left">
                    <h1 className="pos-title">{t('pos.title')}</h1>
                    {session && (
                        <div className="pos-session-info">
                            <span className="pos-warehouse">{activeWarehouse?.name || t('pos.unknownWarehouse')}</span>
                            <span className="pos-session-badge">
                                {t('pos.sessionNumber', { id: session.id })}
                            </span>
                        </div>
                    )}
                </div>

                <div className="pos-header-center">
                    <div className="pos-search-container">
                        <input
                            type="text"
                            placeholder={t('pos.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pos-search-input"
                        />
                        {searchTerm && (
                            <button
                                className="pos-search-clear"
                                onClick={() => setSearchTerm('')}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                <div className="pos-header-right">
                    {/* Offline indicator */}
                    <div className="pos-sync-indicator">
                        <span className="pos-sync-dot online" />
                        <span>{t('pos.online')}</span>
                    </div>

                    {/* Parked orders count */}
                    {parkedOrders.length > 0 && (
                        <button className="pos-parked-btn">
                            📋 {parkedOrders.length} {t('pos.parked')}
                        </button>
                    )}

                    {/* Close session button */}
                    {session && (
                        <button
                            className="pos-close-session-btn"
                            onClick={() => setShowSessionModal(true)}
                        >
                            {t('pos.closeSession')}
                        </button>
                    )}

                    {/* Exit POS */}
                    <button
                        className="pos-exit-btn"
                        onClick={() => navigate('/dashboard')}
                    >
                        ✕ {t('pos.exit')}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="pos-main">
                {/* Product Grid - 70% */}
                <section className="pos-products-section">
                    <ProductGrid
                        products={productsData?.products || []}
                        categories={productsData?.categories || []}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                        onAddToCart={addToCart}
                        isLoading={productsLoading}
                        cart={cart}
                    />
                </section>

                {/* Cart Panel - 30% */}
                <aside className="pos-cart-section">
                    <CartPanel
                        cart={cart}
                        totals={cartTotals}
                        onUpdateItem={updateCartItem}
                        onRemoveItem={removeFromCart}
                        onClear={clearCart}
                        onCheckout={handleCheckout}
                        isProcessing={completeSaleMutation.isPending}
                    />
                </aside>
            </main>

            {/* Modals */}
            <AnimatePresence>
                {showSessionModal && (
                    <SessionModal
                        session={session}
                        warehouses={warehouses}
                        onOpen={handleOpenSession}
                        onClose={handleCloseSession}
                        isOpening={openSessionMutation.isPending}
                        isClosing={closeSessionMutation.isPending}
                        onCancel={() => {
                            if (!session) navigate('/dashboard');
                            setShowSessionModal(false);
                        }}
                    />
                )}

                {showCheckout && (
                    <CheckoutModal
                        cart={cart}
                        totals={cartTotals}
                        onComplete={handleCompleteSale}
                        onCancel={() => setShowCheckout(false)}
                        isProcessing={completeSaleMutation.isPending}
                    />
                )}

                {showReceipt && completedOrder && (
                    <POSReceipt
                        order={completedOrder}
                        session={session}
                        onClose={() => {
                            setShowReceipt(false);
                            setCompletedOrder(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}