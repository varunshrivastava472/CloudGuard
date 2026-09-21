const authService = require('../services/authService');
const storageService = require('../services/storageService');

/**
 * Registers a new user (POST /api/auth/register).
 */
async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    const result = await authService.register({ name, email, password, role });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Registration failed'
    });
  }
}

/**
 * Logs in an existing user (POST /api/auth/login).
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: result
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.message || 'Authentication failed'
    });
  }
}

/**
 * Returns current authenticated user (GET /api/auth/me).
 */
async function getMe(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const user = await storageService.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: err.message
    });
  }
}

module.exports = {
  register,
  login,
  getMe
};
