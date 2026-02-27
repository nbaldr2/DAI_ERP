const { Notification, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Service to handle notification logic
 */
class NotificationService {
    /**
     * Create a notification for a specific user
     * @param {Object} data - Notification data
     * @param {number} userId - ID of the user to notify
     */
    async notifyUser(data, userId) {
        try {
            if (!userId) {
                console.error('NotificationService: userId is required');
                return null;
            }

            return await Notification.create({
                user_id: userId,
                type: data.type || 'INFO',
                title: data.title,
                message: data.message,
                reference_id: data.reference_id || null,
                reference_type: data.reference_type || null,
                is_read: false
            });
        } catch (error) {
            console.error('NotificationService: Error notifying user:', error);
            return null;
        }
    }

    /**
     * Create notifications for all users with a specific role
     * @param {Object} data - Notification data
     * @param {string|string[]} roles - Role(s) to notify (e.g., 'ADMIN', ['ADMIN', 'SALES'])
     */
    async notifyRole(data, roles) {
        try {
            const roleArray = Array.isArray(roles) ? roles : [roles];

            // Find all users with the specified roles
            const users = await User.findAll({
                where: {
                    role: { [Op.in]: roleArray }
                },
                attributes: ['id']
            });

            if (users.length === 0) {
                return [];
            }

            // Create notifications for each user
            const notifications = await Promise.all(
                users.map(user => this.notifyUser(data, user.id))
            );

            return notifications;
        } catch (error) {
            console.error('NotificationService: Error notifying role:', error);
            return [];
        }
    }

    /**
     * Create notifications for ALL users (broadcast)
     * @param {Object} data - Notification data
     */
    async broadcast(data) {
        try {
            const users = await User.findAll({ attributes: ['id'] });

            const notifications = await Promise.all(
                users.map(user => this.notifyUser(data, user.id))
            );

            return notifications;
        } catch (error) {
            console.error('NotificationService: Error broadcasting notification:', error);
            return [];
        }
    }
}

module.exports = new NotificationService();
