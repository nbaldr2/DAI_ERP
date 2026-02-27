import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function SessionModal({
    session,
    warehouses,
    onOpen,
    onClose,
    isOpening,
    isClosing,
    onCancel,
}) {
    const { t } = useTranslation();
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [openingCash, setOpeningCash] = useState('0');
    const [closingCash, setClosingCash] = useState('');

    // If session exists, show close modal
    const isClosingMode = session !== null && session !== undefined;

    const handleOpenSession = () => {
        if (!selectedWarehouse) {
            alert(t('common.selectWarehouse', 'Please select a warehouse'));
            return;
        }
        onOpen(parseInt(selectedWarehouse), parseFloat(openingCash) || 0);
    };

    const handleCloseSession = () => {
        onClose(parseFloat(closingCash) || 0);
    };

    return (
        <motion.div
            className="pos-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="pos-modal pos-session-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
            >
                <div className="pos-modal-header">
                    <h2>{isClosingMode ? t('pos.closeSession') : t('pos.sessionOptions', 'Open POS Session')}</h2>
                    <button className="pos-modal-close" onClick={onCancel}>
                        ✕
                    </button>
                </div>

                <div className="pos-modal-content">
                    {isClosingMode ? (
                        // Close session form
                        <div className="pos-session-close">
                            <div className="pos-session-info-card">
                                <h3>{t('pos.sessionInfo', 'Session Information')}</h3>
                                <div className="pos-session-info-row">
                                    <span>{t('pos.sessionNumber', { id: session.id }).replace(`#${session.id}`, '')}:</span>
                                    <span>#{session.id}</span>
                                </div>
                                <div className="pos-session-info-row">
                                    <span>{t('common.warehouse', 'Warehouse')}:</span>
                                    <span>{session.warehouse?.name || 'N/A'}</span>
                                </div>
                                <div className="pos-session-info-row">
                                    <span>{t('pos.openedAt', 'Opened At')}:</span>
                                    <span>{new Date(session.opened_at).toLocaleString()}</span>
                                </div>
                                <div className="pos-session-info-row">
                                    <span>{t('pos.openingCash', 'Opening Cash')}:</span>
                                    <span>{parseFloat(session.opening_cash).toFixed(2)} DH</span>
                                </div>
                            </div>

                            <div className="pos-session-close-form">
                                <label>
                                    {t('pos.closingCash', 'Closing Cash Amount')}
                                    <input
                                        type="number"
                                        value={closingCash}
                                        onChange={(e) => setClosingCash(e.target.value)}
                                        placeholder={t('pos.enterClosingCash', 'Enter closing cash amount')}
                                        min="0"
                                        step="0.01"
                                    />
                                </label>
                                <p className="pos-session-hint">
                                    {t('pos.closingCashHint', 'Count the cash in the drawer and enter the total amount.')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        // Open session form
                        <div className="pos-session-open">
                            <div className="pos-session-form">
                                <label>
                                    {t('common.selectWarehouse', 'Select Warehouse')}
                                    <select
                                        value={selectedWarehouse}
                                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                                    >
                                        <option value="">{t('common.chooseWarehouse', 'Choose a warehouse...')}</option>
                                        {warehouses.map(wh => (
                                            <option key={wh.id} value={wh.id}>
                                                {wh.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    {t('pos.openingCash', 'Opening Cash')}
                                    <input
                                        type="number"
                                        value={openingCash}
                                        onChange={(e) => setOpeningCash(e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </label>
                                <p className="pos-session-hint">
                                    {t('pos.openingCashHint', 'Enter the amount of cash in the drawer at the start of the session.')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pos-modal-footer">
                    <button
                        className="pos-modal-btn cancel"
                        onClick={onCancel}
                        disabled={isOpening || isClosing}
                    >
                        {isClosingMode ? t('pos.cancel') : t('common.back', 'Back')}
                    </button>
                    <button
                        className="pos-modal-btn confirm"
                        onClick={isClosingMode ? handleCloseSession : handleOpenSession}
                        disabled={isOpening || isClosing || (!isClosingMode && !selectedWarehouse)}
                    >
                        {isOpening || isClosing
                            ? t('common.loading')
                            : isClosingMode
                                ? t('pos.closeSession')
                                : t('pos.startSession', 'Start Session')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}