const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductStock = sequelize.define('ProductStock', {
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
    quantity_on_hand: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Total physical quantity'
    },
    reserved_quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Quantity committed to sales or transfers'
    },
    available_quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'quantity_on_hand - reserved_quantity'
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
    tableName: 'product_stocks',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['product_id', 'warehouse_id']
        }
    ],
    hooks: {
        beforeSave: (instance) => {
            // Ensure available_quantity is always correct
            instance.available_quantity = parseFloat(instance.quantity_on_hand) - parseFloat(instance.reserved_quantity);
        }
    }
});

module.exports = ProductStock;
