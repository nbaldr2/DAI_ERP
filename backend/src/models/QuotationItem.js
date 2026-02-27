const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuotationItem = sequelize.define('QuotationItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    quotation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'quotations',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    product_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1
    },
    unit_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    tax_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    total_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    }
}, {
    tableName: 'quotation_items',
    timestamps: false
});

module.exports = QuotationItem;
