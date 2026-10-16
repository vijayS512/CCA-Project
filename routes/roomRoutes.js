const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { isAuthenticated, authorizeRoles } = require('../middleware/authMiddleware');

// Public room catalog & details
router.get('/', roomController.getAllRooms);
router.get('/new', isAuthenticated, authorizeRoles('admin'), roomController.getCreateRoom);
router.post('/new', isAuthenticated, authorizeRoles('admin'), roomController.postCreateRoom);

router.get('/:id', roomController.getRoomDetails);

// Admin edit/delete routes
router.get('/:id/edit', isAuthenticated, authorizeRoles('admin'), roomController.getEditRoom);
router.post('/:id/edit', isAuthenticated, authorizeRoles('admin'), roomController.postEditRoom);
router.post('/:id/delete', isAuthenticated, authorizeRoles('admin'), roomController.deleteRoom);

module.exports = router;
