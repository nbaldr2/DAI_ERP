import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function POSReceipt({ order, session, onClose }) {
    const { t } = useTranslation();
    const receiptRef = useRef(null);

    // Auto print when component mounts (only when order is ready)
    useEffect(() => {
        if (!order?.order_number) return;
        const timer = setTimeout(() => {
            if (receiptRef.current) {
                window.print();
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [order?.order_number]);

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleString();
    };

    // Resolve warehouse name from order.session (receipt fetch) or from session prop (after sale)
    const warehouseName =
        order?.session?.warehouse?.name ||
        session?.warehouse?.name ||
        'Main Warehouse';

    const subtotal = order?.items?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) ?? 0;
    const total = parseFloat(order?.total || 0);
    const taxAmount = parseFloat(order?.tax_amount || 0);
    const taxRate = parseFloat(order?.tax_rate || 0);
    const discountAmount = parseFloat(order?.discount_amount || 0);
    const cashReceived = parseFloat(order?.cash_received || 0);
    const changeAmount = parseFloat(order?.change_amount || 0);
    const cardAmount = parseFloat(order?.card_amount || order?.total || 0);

    return (
        <>
            {/* Print styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .pos-receipt-print, .pos-receipt-print * {
                        visibility: visible;
                    }
                    .pos-receipt-print {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 80mm;
                        padding: 0;
                        margin: 0;
                        background: white !important;
                    }
                    .pos-receipt-overlay,
                    .pos-receipt-actions {
                        display: none !important;
                    }
                }
            `}</style>

            <motion.div
                className="pos-receipt-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="pos-receipt-container"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                >
                    {/* On-screen receipt preview */}
                    <div className="pos-receipt-preview">
                        <div className="pos-receipt-header-bar">
                            <h2>{t('pos.receipt')}</h2>
                            <button className="pos-modal-close" onClick={onClose}>
                                ✕
                            </button>
                        </div>

                        <div className="pos-receipt-actions">
                            <button className="pos-receipt-btn print" onClick={() => window.print()}>
                                🖨️ {t('pos.printReceipt')}
                            </button>
                            <button className="pos-receipt-btn close" onClick={onClose}>
                                {t('common.close', 'Done')}
                            </button>
                        </div>
                    </div>

                    {/* Printable receipt */}
                    <div className="pos-receipt-print" ref={receiptRef}>
                        <div className="receipt-header">
                            <div className="receipt-logo">🛒 DAI Trading</div>
                            <div className="receipt-company">
                                <p>Point of Sale</p>
                                <p>{warehouseName}</p>
                            </div>
                        </div>

                        <div className="receipt-info">
                            <div className="receipt-row">
                                <span>{t('sales.saleDetails', 'Order')}:</span>
                                <span>{order?.order_number || '—'}</span>
                            </div>
                            <div className="receipt-row">
                                <span>{t('common.date', 'Date')}:</span>
                                <span>{formatDate(order?.created_at)}</span>
                            </div>
                            <div className="receipt-row">
                                <span>{t('invoices.saleAgent', 'Cashier')}:</span>
                                <span>{order?.creator?.name || session?.user?.name || 'Staff'}</span>
                            </div>
                            {order?.customer && (
                                <div className="receipt-row">
                                    <span>{t('sales.customer', 'Customer')}:</span>
                                    <span>{order.customer.name}</span>
                                </div>
                            )}
                        </div>

                        <div className="receipt-divider">--------------------------------</div>

                        <div className="receipt-items">
                            <div className="receipt-items-header">
                                <span>{t('invoices.item', 'Item')}</span>
                                <span>{t('pos.qty')}</span>
                                <span>{t('pos.price')}</span>
                                <span>{t('pos.total')}</span>
                            </div>
                            {order?.items?.map((item, idx) => (
                                <div key={idx} className="receipt-item">
                                    <div className="receipt-item-name">{item.product_name}</div>
                                    <div className="receipt-item-details">
                                        <span>{item.qty} {item.unit}</span>
                                        <span>{parseFloat(item.unit_price || 0).toFixed(2)}</span>
                                        <span>{parseFloat(item.total || 0).toFixed(2)}</span>
                                    </div>
                                    {parseFloat(item.discount || 0) > 0 && (
                                        <div className="receipt-item-discount">
                                            {t('invoices.discount', 'Discount')}: -{parseFloat(item.discount).toFixed(2)} DH
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="receipt-divider">--------------------------------</div>

                        <div className="receipt-totals">
                            <div className="receipt-total-row">
                                <span>{t('pos.subtotal')}</span>
                                <span>{subtotal.toFixed(2)} DH</span>
                            </div>
                            {taxAmount > 0 && (
                                <div className="receipt-total-row">
                                    <span>{t('invoices.totalTax', 'Tax')} ({taxRate}%):</span>
                                    <span>{taxAmount.toFixed(2)} DH</span>
                                </div>
                            )}
                            {discountAmount > 0 && (
                                <div className="receipt-total-row discount">
                                    <span>{t('invoices.totalDiscount', 'Discount')}:</span>
                                    <span>-{discountAmount.toFixed(2)} DH</span>
                                </div>
                            )}
                            <div className="receipt-total-row grand">
                                <span>{t('pos.total')}</span>
                                <span>{total.toFixed(2)} DH</span>
                            </div>
                        </div>

                        <div className="receipt-divider">--------------------------------</div>

                        <div className="receipt-payment">
                            <div className="receipt-payment-method">
                                Payment: {order?.payment_method || '—'}
                            </div>
                            {order?.payment_method === 'CASH' && (
                                <>
                                    <div className="receipt-payment-row">
                                        <span>Cash Received:</span>
                                        <span>{cashReceived.toFixed(2)} DH</span>
                                    </div>
                                    <div className="receipt-payment-row change">
                                        <span>Change:</span>
                                        <span>{changeAmount.toFixed(2)} DH</span>
                                    </div>
                                </>
                            )}
                            {order?.payment_method === 'CARD' && (
                                <div className="receipt-payment-row">
                                    <span>Card:</span>
                                    <span>{cardAmount.toFixed(2)} DH</span>
                                </div>
                            )}
                            {order?.payment_method === 'SPLIT' && (
                                <>
                                    <div className="receipt-payment-row">
                                        <span>Card:</span>
                                        <span>{parseFloat(order?.card_amount || 0).toFixed(2)} DH</span>
                                    </div>
                                    <div className="receipt-payment-row">
                                        <span>Cash:</span>
                                        <span>{parseFloat(order?.cash_received || 0).toFixed(2)} DH</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="receipt-footer">
                            <p>Thank you for your purchase!</p>
                            <p>Visit us again</p>
                            <p className="receipt-powered">Powered by DAI ERP</p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </>
    );
}
