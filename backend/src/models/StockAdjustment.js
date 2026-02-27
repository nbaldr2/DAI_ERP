const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockAdjustment = sequelize.define('StockAdjustment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'warehouses',
            key: 'id'
        }
    },
    reason: {
        type: DataTypes.ENUM('STOCKTAKE', 'DAMAGE', 'EXPIRED', 'CORRECTION', 'OTHER'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('DRAFT', 'APPROVED', 'REJECTED'),
        defaultValue: 'DRAFT'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    adjustment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
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
    tableName: 'stock_adjustments',
    timestamps: true,
    underscored: true
});

module.exports = StockAdjustment;
