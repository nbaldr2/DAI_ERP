import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function CheckoutModal({
    cart,
    totals,
    onComplete,
    onCancel,
    isProcessing,
}) {
    const { t } = useTranslation();
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [cashReceived, setCashReceived] = useState('');
    const [cardAmount, setCardAmount] = useState('');
    const [taxRate, setTaxRate] = useState(0);
    const [discountAmount, setDiscountAmount] = useState('');
    const [notes, setNotes] = useState('');

    const numpadRef = useRef(null);

    // Calculate totals
    const taxAmount = totals.subtotal * (taxRate / 100);
    const totalDiscount = parseFloat(discountAmount) || 0;
    const finalTotal = totals.subtotal + taxAmount - totalDiscount;

    // Calculate change for cash payment
    const cashReceivedNum = parseFloat(cashReceived) || 0;
    const change = paymentMethod === 'CASH' ? cashReceivedNum - finalTotal : 0;

    // Split payment calculations
    const cardAmountNum = parseFloat(cardAmount) || 0;
    const splitCashAmount = paymentMethod === 'SPLIT' ? finalTotal - cardAmountNum : 0;

    // Auto-set cash received to total amount when switching to cash
    useEffect(() => {
        if (paymentMethod === 'CASH') {
            setCashReceived(Math.ceil(finalTotal).toString());
        } else if (paymentMethod === 'SPLIT') {
            setCardAmount('');
            setCashReceived('');
        }
    }, [paymentMethod, finalTotal]);

    // Numpad handler
    const handleNumpadInput = (value) => {
        if (paymentMethod === 'CASH') {
            if (value === 'C') {
                setCashReceived('');
            } else if (value === '.') {
                if (!cashReceived.includes('.')) {
                    setCashReceived(cashReceived + '.');
                }
            } else {
                setCashReceived(cashReceived + value);
            }
        } else if (paymentMethod === 'SPLIT') {
            if (value === 'C') {
                setCardAmount('');
            } else if (value === '.') {
                if (!cardAmount.includes('.')) {
                    setCardAmount(cardAmount + '.');
                }
            } else {
                setCardAmount(cardAmount + value);
            }
        }
    };

    // Quick cash buttons
    const quickAmounts = [50, 100, 200, 500];

    const handleQuickAmount = (amount) => {
        if (paymentMethod === 'CASH') {
            const newAmount = (parseFloat(cashReceived) || 0) + amount;
            setCashReceived(newAmount.toString());
        }
    };

    // Handle submit
    const handleSubmit = () => {
        const payment = {
            method: paymentMethod,
            tax_rate: taxRate,
            discount_amount: totalDiscount,
            notes: notes || undefined,
        };

        if (paymentMethod === 'CASH') {
            if (cashReceivedNum < finalTotal) {
                alert('Insufficient cash received');
                return;
            }
            payment.cash_received = cashReceivedNum;
        } else if (paymentMethod === 'CARD') {
            payment.card_amount = finalTotal;
        } else if (paymentMethod === 'SPLIT') {
            if (cardAmountNum + splitCashAmount !== finalTotal) {
                alert('Split amounts must equal total');
                return;
            }
            payment.card_amount = cardAmountNum;
            payment.cash_amount = splitCashAmount;
        }

        onComplete(payment);
    };

    return (
        <motion.div
            className="pos-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="pos-modal pos-checkout-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
            >
                <div className="pos-modal-header">
                    <h2>{t('pos.checkout')}</h2>
                    <button className="pos-modal-close" onClick={onCancel}>
                        ✕
                    </button>
                </div>

                <div className="pos-checkout-content">
                    {/* Left: Order Summary */}
                    <div className="pos-checkout-summary">
                        <h3>{t('pos.cartTitle')}</h3>
                        <div className="pos-checkout-items">
                            {cart.map(item => (
                                <div key={item.product_id} className="pos-checkout-item">
                                    <span>{item.product_name}</span>
                                    <span>× {item.qty}</span>
                                    <span>{((item.qty * item.unit_price) - item.discount).toFixed(2)} DH</span>
                                </div>
                            ))}
                        </div>

                        <div className="pos-checkout-calculations">
                            <div className="pos-checkout-row">
                                <span>{t('pos.subtotal')}</span>
                                <span>{totals.subtotal.toFixed(2)} DH</span>
                            </div>

                            {/* Tax */}
                            <div className="pos-checkout-row tax">
                                <label>
                                    Tax Rate (%)
                                    <input
                                        type="number"
                                        value={taxRate}
                                        onChange={(e) => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                                        min="0"
                                        max="100"
                                        step="0.1"
                                    />
                                </label>
                                <span>{taxAmount.toFixed(2)} DH</span>
                            </div>

                            {/* Discount */}
                            <div className="pos-checkout-row discount">
                                <label>
                                    Discount
                                    <input
                                        type="number"
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </label>
                                <span>-{totalDiscount.toFixed(2)} DH</span>
                            </div>

                            <div className="pos-checkout-total">
                                <span>{t('pos.total')}</span>
                                <span>{finalTotal.toFixed(2)} DH</span>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="pos-checkout-notes">
                            <label>{t('common.notes', 'Notes')} ({t('common.optional', 'optional')})</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t('common.addNote', 'Add a note...')}
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Right: Payment */}
                    <div className="pos-checkout-payment">
                        <h3>{t('pos.paymentMethod')}</h3>

                        {/* Payment method buttons */}
                        <div className="pos-payment-methods">
                            <button
                                className={`pos-payment-method ${paymentMethod === 'CASH' ? 'active' : ''}`}
                                onClick={() => setPaymentMethod('CASH')}
                            >
                                💵 {t('pos.cash')}
                            </button>
                            <button
                                className={`pos-payment-method ${paymentMethod === 'CARD' ? 'active' : ''}`}
                                onClick={() => setPaymentMethod('CARD')}
                            >
                                💳 {t('pos.card')}
                            </button>
                            <button
                                className={`pos-payment-method ${paymentMethod === 'SPLIT' ? 'active' : ''}`}
                                onClick={() => setPaymentMethod('SPLIT')}
                            >
                                💰 Split
                            </button>
                        </div>

                        {/* Cash payment UI */}
                        {paymentMethod === 'CASH' && (
                            <div className="pos-cash-payment">
                                <div className="pos-cash-display">
                                    <div className="pos-cash-row">
                                        <span>Total:</span>
                                        <span className="pos-cash-total">{finalTotal.toFixed(2)} DH</span>
                                    </div>
                                    <div className="pos-cash-row">
                                        <span>Received:</span>
                                        <input
                                            type="text"
                                            value={cashReceived}
                                            onChange={(e) => setCashReceived(e.target.value.replace(/[^0-9.]/g, ''))}
                                            className="pos-cash-input"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="pos-cash-row change">
                                        <span>Change:</span>
                                        <span className={change >= 0 ? 'pos-change-positive' : 'pos-change-negative'}>
                                            {change.toFixed(2)} DH
                                        </span>
                                    </div>
                                </div>

                                {/* Quick amount buttons */}
                                <div className="pos-quick-amounts">
                                    {quickAmounts.map(amount => (
                                        <button
                                            key={amount}
                                            className="pos-quick-amount"
                                            onClick={() => handleQuickAmount(amount)}
                                        >
                                            +{amount}
                                        </button>
                                    ))}
                                </div>

                                {/* Numpad */}
                                <div className="pos-numpad">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'C'].map(key => (
                                        <button
                                            key={key}
                                            className={`pos-numpad-key ${key === 'C' ? 'clear' : ''}`}
                                            onClick={() => handleNumpadInput(key)}
                                        >
                                            {key}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Card payment UI */}
                        {paymentMethod === 'CARD' && (
                            <div className="pos-card-payment">
                                <div className="pos-card-info">
                                    <div className="pos-card-icon">💳</div>
                                    <p>Card payment for</p>
                                    <p className="pos-card-amount">{finalTotal.toFixed(2)} DH</p>
                                </div>
                                <p className="pos-card-note">
                                    Process card payment on terminal
                                </p>
                            </div>
                        )}

                        {/* Split payment UI */}
                        {paymentMethod === 'SPLIT' && (
                            <div className="pos-split-payment">
                                <div className="pos-split-row">
                                    <label>Card Amount:</label>
                                    <input
                                        type="text"
                                        value={cardAmount}
                                        onChange={(e) => setCardAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="pos-split-row">
                                    <label>Cash Amount:</label>
                                    <span>{splitCashAmount.toFixed(2)} DH</span>
                                </div>
                                <div className="pos-split-total">
                                    <span>Total:</span>
                                    <span>{finalTotal.toFixed(2)} DH</span>
                                </div>
                                {cardAmountNum + splitCashAmount !== finalTotal && cardAmountNum > 0 && (
                                    <div className="pos-split-warning">
                                        Amounts must equal total
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer actions */}
                <div className="pos-modal-footer">
                    <button
                        className="pos-modal-btn cancel"
                        onClick={onCancel}
                        disabled={isProcessing}
                    >
                        {t('pos.cancel')}
                    </button>
                    <button
                        className="pos-modal-btn confirm"
                        onClick={handleSubmit}
                        disabled={isProcessing || (paymentMethod === 'CASH' && cashReceivedNum < finalTotal)}
                    >
                        {isProcessing ? t('common.loading') : `${t('pos.confirm')} - ${finalTotal.toFixed(2)} DH`}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}