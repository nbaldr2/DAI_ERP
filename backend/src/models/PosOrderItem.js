const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PosOrderItem = sequelize.define('PosOrderItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'pos_orders', key: 'id' }
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' }
    },
    product_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Snapshot of product name at time of sale'
    },
    qty: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'kg'
    },
    unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
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
    tableName: 'pos_order_items',
    timestamps: true,
    underscored: true
});

module.exports = PosOrderItem;
