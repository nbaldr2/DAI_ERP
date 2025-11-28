module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('system_settings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      company_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      pobox: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      cr_number: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      logo_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      language: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'en'
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'QAR'
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('system_settings');
  }
};