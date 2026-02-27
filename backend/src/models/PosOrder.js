const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PosOrder = sequelize.define('PosOrder', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    session_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'pos_sessions', key: 'id' }
    },
    order_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'customers', key: 'id' }
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    tax_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    tax_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    discount_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    payment_method: {
        type: DataTypes.ENUM('CASH', 'CARD', 'SPLIT'),
        allowNull: false,
        defaultValue: 'CASH'
    },
    cash_received: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    change_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    card_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('COMPLETED', 'VOIDED', 'PARKED'),
        allowNull: false,
        defaultValue: 'COMPLETED'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'pos_orders',
    timestamps: true,
    underscored: true
});

module.exports = PosOrder;
