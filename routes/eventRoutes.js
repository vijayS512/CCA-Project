const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { isAuthenticated, authorizeRoles } = require('../middleware/authMiddleware');

// Public event catalog
router.get('/', eventController.getAllEvents);

// Create event (Faculty & Admin only)
router.get('/new', isAuthenticated, authorizeRoles('faculty', 'admin'), eventController.getCreateEvent);
router.post('/new', isAuthenticated, authorizeRoles('faculty', 'admin'), eventController.postCreateEvent);

// User event passes/tickets
router.get('/my-tickets', isAuthenticated, eventController.getMyTickets);

// Event Details
router.get('/:id', eventController.getEventDetails);

// RSVP / Register for event
router.post('/:id/register', isAuthenticated, eventController.registerForEvent);

// View attendee list (Organizer & Admin)
router.get('/:id/attendees', isAuthenticated, authorizeRoles('faculty', 'admin'), eventController.getEventAttendees);
router.post('/attendees/:registrationId/checkin', isAuthenticated, authorizeRoles('faculty', 'admin'), eventController.checkInAttendee);

module.exports = router;
