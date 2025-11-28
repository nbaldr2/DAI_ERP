const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 100]
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  role: {
    type: DataTypes.ENUM('ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTANT', 'VIEWER'),
    allowNull: false,
    defaultValue: 'VIEWER'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: false,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    }
  }
});

// Instance method to validate password
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password_hash);
};

// Instance method to get safe user data (without password)
User.prototype.toSafeObject = function() {
  const { password_hash, ...safeUser } = this.toJSON();
  return safeUser;
};

module.exports = User;
