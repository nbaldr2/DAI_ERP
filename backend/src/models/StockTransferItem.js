const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockTransferItem = sequelize.define('StockTransferItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    transfer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'stock_transfers',
            key: 'id'
        }
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    batch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'stock_batches',
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
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
    tableName: 'stock_transfer_items',
    timestamps: true,
    underscored: true
});

module.exports = StockTransferItem;
