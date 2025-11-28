const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  payment_mode: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  invoice_type: {
    type: DataTypes.ENUM('SALE', 'PURCHASE'),
    allowNull: false,
    defaultValue: 'SALE'
  },
  reference_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'sale_id or purchase_id'
  },
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'customers',
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
  // Fixed field name to match database schema
  invoice_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  total_net: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  total_tax: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  total_gross: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'DRAFT'
  },
  pdf_path: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  qr_code: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'QR code data for Qatar compliance'
  },
  language: {
    type: DataTypes.ENUM('EN', 'AR', 'BOTH'),
    allowNull: false,
    defaultValue: 'BOTH',
    comment: 'Invoice language for bilingual support'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  admin_note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  client_note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  terms: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: true,
    defaultValue: 'QAR'
  },
  sale_agent: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  discount_type: {
    type: DataTypes.ENUM('none', 'percentage', 'fixed'),
    allowNull: true,
    defaultValue: 'none'
  },
  discount_value: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  total_discount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'invoices',
  timestamps: false,
  hooks: {
    beforeCreate: async (invoice) => {
      // Generate invoice number if not provided
      if (!invoice.invoice_number) {
        // Get the last invoice to determine the next number
        const lastInvoice = await Invoice.findOne({
          where: {
            invoice_number: {
              [Sequelize.Op.like]: 'INV-%'
            }
          },
          order: [['id', 'DESC']],
          attributes: ['invoice_number']
        });
        
        let nextNumber = 250001; // Default starting number
        
        if (lastInvoice) {
          const lastNumber = parseInt(lastInvoice.invoice_number.replace('INV-', ''));
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
        
        invoice.invoice_number = `INV-${nextNumber.toString().padStart(6, '0')}`;
      }
      
      // Calculate total_gross if not provided
      if (invoice.total_net !== null && invoice.total_tax !== null) {
        invoice.total_gross = parseFloat(invoice.total_net) + parseFloat(invoice.total_tax);
        if (invoice.discount) {
          invoice.total_gross -= parseFloat(invoice.discount);
        }
      }
    },
    beforeUpdate: (invoice) => {
      // Recalculate total_gross if components changed
      if (invoice.changed('total_net') || invoice.changed('total_tax') || invoice.changed('discount')) {
        invoice.total_gross = parseFloat(invoice.total_net) + parseFloat(invoice.total_tax);
        if (invoice.discount) {
          invoice.total_gross -= parseFloat(invoice.discount);
        }
      }
    }
  }
});

module.exports = Invoice;