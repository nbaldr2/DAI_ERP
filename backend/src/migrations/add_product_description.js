'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('products', 'description', {
            type: Sequelize.TEXT,
            allowNull: true,
            after: 'origin'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('products', 'description');
    }
};
