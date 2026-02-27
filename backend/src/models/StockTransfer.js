const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockTransfer = sequelize.define('StockTransfer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    source_warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'warehouses',
            key: 'id'
        }
    },
    destination_warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'warehouses',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('DRAFT', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'DRAFT'
    },
    transfer_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    received_by: {
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
    tableName: 'stock_transfers',
    timestamps: true,
    underscored: true
});

module.exports = StockTransfer;
