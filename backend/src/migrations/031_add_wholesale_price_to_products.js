'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('products', 'wholesale_price', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            after: 'price_per_unit'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('products', 'wholesale_price');
    }
};
