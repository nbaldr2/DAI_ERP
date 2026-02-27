const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/stats', dashboardController.getStats);
router.get('/activity', dashboardController.getRecentActivity);
router.get('/charts', dashboardController.getChartData);
router.get('/expiring-stock', dashboardController.getExpiringStock);
router.get('/alerts', dashboardController.getAlerts);

module.exports = router;
