const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

// Rate limit applied to API endpoints
router.use(apiLimiter);

// System health (public for healthchecks)
router.get('/health', apiController.getHealthStatus);

// Real-time slot availability check
router.get('/rooms/:id/availability', apiController.checkRoomAvailability);

// Notifications
router.get('/notifications', isAuthenticated, apiController.getUserNotifications);
router.post('/notifications/:id/read', isAuthenticated, apiController.markNotificationRead);
router.post('/notifications/read-all', isAuthenticated, apiController.markAllNotificationsRead);

module.exports = router;
