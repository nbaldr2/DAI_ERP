const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InvoiceAttachment = sequelize.define('InvoiceAttachment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  file_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  uploaded_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'invoice_attachments',
  timestamps: true,
  createdAt: 'uploaded_at',
  updatedAt: false
});

module.exports = InvoiceAttachment;