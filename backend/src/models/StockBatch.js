const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockBatch = sequelize.define('StockBatch', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'warehouses',
            key: 'id'
        }
    },
    supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'suppliers',
            key: 'id'
        }
    },
    purchase_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'purchases',
            key: 'id'
        }
    },
    batch_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'External batch/lot number'
    },
    initial_quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Quantity originally received'
    },
    current_quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Current remaining quantity'
    },
    unit_cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    date_received: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'DEPLETED', 'QUARANTINE'),
        defaultValue: 'ACTIVE'
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
    tableName: 'stock_batches',
    timestamps: true,
    underscored: true
});

module.exports = StockBatch;
