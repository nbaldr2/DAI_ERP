const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockMovement = sequelize.define('StockMovement', {
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
    batch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'stock_batches',
            key: 'id'
        }
    },
    type: {
        type: DataTypes.ENUM('IN', 'OUT', 'ADJUST', 'TRANSFER', 'RESERVE', 'UNRESERVE'),
        allowNull: false
    },
    quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Positive for IN, Negative for OUT'
    },
    reference_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'purchase, sale, adjustment, transfer_in, transfer_out'
    },
    reference_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    performed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'stock_movements',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
        {
            fields: ['product_id', 'warehouse_id']
        },
        {
            fields: ['batch_id']
        },
        {
            fields: ['reference_type', 'reference_id']
        },
        {
            fields: ['created_at']
        }
    ]
});

module.exports = StockMovement;
