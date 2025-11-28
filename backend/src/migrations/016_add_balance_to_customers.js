const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addColumn('customers', 'balance', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('customers', 'balance');
  }
};