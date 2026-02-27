const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    type: {
        type: DataTypes.ENUM('INFO', 'WARNING', 'ERROR', 'SUCCESS'),
        defaultValue: 'INFO',
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    reference_type: {
        type: DataTypes.STRING, // e.g., 'STOCK_ENTRY', 'INVOICE', 'SALE'
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'notifications',
    updatedAt: false, // We only care about creation and read status
    timestamps: true, // We want createdAt, but we'll manually handle it or let Sequelize do it
    createdAt: 'created_at'
});

module.exports = Notification;
