const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated, authorizeRoles } = require('../middleware/authMiddleware');

// Main dashboard router - redirects to role specific dashboard
router.get('/', isAuthenticated, dashboardController.getDashboard);

// Direct explicit routes
router.get('/admin', isAuthenticated, authorizeRoles('admin'), dashboardController.getAdminDashboard);
router.get('/faculty', isAuthenticated, authorizeRoles('faculty'), dashboardController.getFacultyDashboard);
router.get('/student', isAuthenticated, authorizeRoles('student'), dashboardController.getStudentDashboard);

module.exports = router;
