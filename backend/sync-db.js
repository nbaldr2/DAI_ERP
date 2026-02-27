const { sequelize } = require('./src/config/database');
const Notification = require('./src/models/Notification');
const Document = require('./src/models/Document');

async function syncModels() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync Notification model (alter table to add missing columns)
        await Notification.sync({ alter: true });
        console.log('Notification model synced successfully.');

        await Document.sync({ alter: true });
        console.log('Document model synced successfully.');

        process.exit(0);
    } catch (error) {
        console.error('Error syncing models:', error);
        process.exit(1);
    }
}

syncModels();
