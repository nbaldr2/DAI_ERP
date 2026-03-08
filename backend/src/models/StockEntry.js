const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockEntry = sequelize.define('StockEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  purchase_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'purchases',
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'suppliers',
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
  pallets: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  pallet_weight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  total_weight: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  received_weight: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  accepted_weight: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  date_in: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isAfterDateIn(value) {
        if (this.date_in && new Date(value) < new Date(this.date_in)) {
          throw new Error('Expiry date must be after date_in');
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'RECEIVED', 'INSPECTED', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
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
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'stock_entries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
  hooks: {
    beforeCreate: (stockEntry) => {
      // Calculate total_weight if not provided
      if (!stockEntry.total_weight && stockEntry.pallets && stockEntry.pallet_weight) {
        stockEntry.total_weight = stockEntry.pallets * stockEntry.pallet_weight;
      }
    },
    beforeUpdate: (stockEntry) => {
      // Update total_weight if pallets or pallet_weight changed
      if (stockEntry.changed('pallets') || stockEntry.changed('pallet_weight')) {
        stockEntry.total_weight = stockEntry.pallets * stockEntry.pallet_weight;
      }
    }
  }
});

// Instance method to check if near expiry
StockEntry.prototype.isNearExpiry = function (days = 7) {
  const expiryDate = new Date(this.expiry_date);
  const today = new Date();
  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days && diffDays >= 0;
};

// Instance method to check if expired
StockEntry.prototype.isExpired = function () {
  const expiryDate = new Date(this.expiry_date);
  const today = new Date();
  return expiryDate < today;
};

module.exports = StockEntry;
