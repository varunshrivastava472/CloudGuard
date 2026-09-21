const storageService = require('../services/storageService');

/**
 * Returns dashboard metrics (GET /api/dashboard).
 */
async function getDashboard(req, res) {
  try {
    const userId = req.user ? req.user.id || req.user._id : null;
    const stats = await storageService.getDashboardStats(userId);

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard metrics',
      error: err.message
    });
  }
}

module.exports = {
  getDashboard
};
