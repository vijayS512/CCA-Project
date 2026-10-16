const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.get('/login', authController.getLogin);
router.post('/login', authLimiter, authController.postLogin);

router.get('/register', authController.getRegister);
router.post('/register', authLimiter, authController.postRegister);

router.get('/logout', authController.logout);

router.get('/profile', isAuthenticated, authController.getProfile);
router.post('/profile', isAuthenticated, authController.updateProfile);

module.exports = router;
