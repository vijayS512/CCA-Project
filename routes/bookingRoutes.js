const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { isAuthenticated, authorizeRoles } = require('../middleware/authMiddleware');

// User views own bookings
router.get('/my-bookings', isAuthenticated, bookingController.getMyBookings);

// Submit booking request
router.post('/book', isAuthenticated, bookingController.postBookRoom);

// Cancel booking
router.post('/:id/cancel', isAuthenticated, bookingController.cancelBooking);

// Admin & Faculty manage and approve/reject bookings
router.get('/manage', isAuthenticated, authorizeRoles('admin', 'faculty'), bookingController.getManageBookings);
router.post('/:id/status', isAuthenticated, authorizeRoles('admin', 'faculty'), bookingController.updateBookingStatus);

module.exports = router;
