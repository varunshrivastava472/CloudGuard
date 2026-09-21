const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// POST /api/auth/register - Register new user account
router.post('/register', register);

// POST /api/auth/login - Authenticate existing user
router.post('/login', login);

// GET /api/auth/me - Retrieve current authenticated profile
router.get('/me', protect, getMe);

module.exports = router;
