const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockAdjustmentItem = sequelize.define('StockAdjustmentItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    adjustment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'stock_adjustments',
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
    quantity_adjusted: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Quantity difference (+/-)'
    },
    reason: {
        type: DataTypes.STRING(255),
        allowNull: true
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
    tableName: 'stock_adjustment_items',
    timestamps: true,
    underscored: true
});

module.exports = StockAdjustmentItem;
