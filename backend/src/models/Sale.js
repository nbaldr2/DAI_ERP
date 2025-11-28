const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stock_entry_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'stock_entries',
      key: 'id'
    }
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  sold_weight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  sale_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
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
  }
}, {
  tableName: 'sales',
  timestamps: false,
  hooks: {
    beforeCreate: (sale) => {
      // Calculate total_amount if not provided
      if (!sale.total_amount && sale.sold_weight && sale.unit_price) {
        sale.total_amount = sale.sold_weight * sale.unit_price;
      }
    },
    beforeUpdate: (sale) => {
      // Recalculate total_amount if sold_weight or unit_price changed
      if (sale.changed('sold_weight') || sale.changed('unit_price')) {
        sale.total_amount = sale.sold_weight * sale.unit_price;
      }
    }
  }
});

module.exports = Sale;
