import { memo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// forwardRef is required so framer-motion's AnimatePresence (PopChild) can pass refs
const CartItem = memo(forwardRef(function CartItem({ item, onUpdate, onRemove }, ref) {
    const itemTotal = (item.qty * item.unit_price) - item.discount;

    return (
        <motion.div
            ref={ref}
            className="pos-cart-item"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            layout
        >
            <div className="pos-cart-item-info">
                <div className="pos-cart-item-name">{item.product_name}</div>
                <div className="pos-cart-item-price">
                    {item.unit_price.toFixed(2)} DH / {item.unit}
                </div>
                {item.stock !== undefined && (
                    <div className={`pos-cart-item-stock ${item.stock <= item.qty ? 'stock-warn' : ''}`}>
                        Stock: {item.stock} {item.unit}
                    </div>
                )}
            </div>

            <div className="pos-cart-item-qty">
                <button
                    className="pos-qty-btn"
                    onClick={() => onUpdate(item.product_id, { qty: Math.max(1, item.qty - 1) })}
                >
                    −
                </button>
                <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => onUpdate(item.product_id, { qty: Math.max(1, parseFloat(e.target.value) || 1) })}
                    className="pos-qty-input"
                    min="1"
                    step={item.unit === 'kg' ? '0.1' : '1'}
                />
                <button
                    className="pos-qty-btn"
                    onClick={() => onUpdate(item.product_id, { qty: item.qty + 1 })}
                >
                    +
                </button>
            </div>

            <div className="pos-cart-item-total">
                {itemTotal.toFixed(2)} QAR
            </div>

            <button
                className="pos-cart-item-remove"
                onClick={() => onRemove(item.product_id)}
            >
                ✕
            </button>
        </motion.div>
    );
}));

export default function CartPanel({
    cart,
    totals,
    onUpdateItem,
    onRemoveItem,
    onClear,
    onCheckout,
    isProcessing,
}) {
    const { t } = useTranslation();

    return (
        <div className="pos-cart-panel">
            {/* Header */}
            <div className="pos-cart-header">
                <h2 className="pos-cart-title">
                    {t('pos.cartTitle')}
                    {cart.length > 0 && (
                        <span className="pos-cart-count">{cart.length}</span>
                    )}
                </h2>
                {cart.length > 0 && (
                    <button className="pos-cart-clear" onClick={onClear}>
                        {t('common.clearAll', 'Clear All')}
                    </button>
                )}
            </div>

            {/* Items List */}
            <div className="pos-cart-items">
                <AnimatePresence mode="popLayout">
                    {cart.length === 0 ? (
                        <div className="pos-cart-empty">
                            <div className="pos-cart-empty-icon">🛒</div>
                            <p>{t('pos.emptyCart')}</p>
                            <span>{t('pos.emptyCartSub')}</span>
                        </div>
                    ) : (
                        cart.map(item => (
                            <CartItem
                                key={item.product_id}
                                item={item}
                                onUpdate={onUpdateItem}
                                onRemove={onRemoveItem}
                            />
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Summary */}
            {cart.length > 0 && (
                <div className="pos-cart-summary">
                    <div className="pos-cart-summary-row">
                        <span>{t('pos.subtotal')}</span>
                        <span>{totals.subtotal.toFixed(2)} DH</span>
                    </div>
                    <div className="pos-cart-summary-row">
                        <span>{t('pos.items')}</span>
                        <span>{totals.itemCount}</span>
                    </div>
                </div>
            )}

            {/* Checkout Button */}
            <div className="pos-cart-footer">
                <button
                    className="pos-checkout-btn"
                    onClick={onCheckout}
                    disabled={cart.length === 0 || isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <div className="pos-btn-spinner" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <span>{t('pos.checkout')}</span>
                            <span className="pos-checkout-total">
                                {totals.subtotal.toFixed(2)} DH
                            </span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
