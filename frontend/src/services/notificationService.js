import apiService from './api';

const notificationService = {
    // Get all notifications
    getAll: () => apiService.get('/notifications'),

    // Mark a single notification as read
    markAsRead: (id) => apiService.put(`/notifications/${id}/read`),

    // Mark all notifications as read
    markAllAsRead: () => apiService.put('/notifications/read-all'),
};

export default notificationService;
