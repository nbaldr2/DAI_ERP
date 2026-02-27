const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PosSession = sequelize.define('PosSession', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' }
    },
    warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'warehouses', key: 'id' }
    },
    opening_cash: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    closing_cash: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    opened_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    closed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('OPEN', 'CLOSED'),
        allowNull: false,
        defaultValue: 'OPEN'
    },
    notes: {
        type: DataTypes.TEXT,
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
    tableName: 'pos_sessions',
    timestamps: true,
    underscored: true
});

module.exports = PosSession;
