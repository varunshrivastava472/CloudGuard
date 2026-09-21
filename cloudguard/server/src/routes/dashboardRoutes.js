const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/dashboardController');

// GET /api/dashboard - Summary stats and recent scans
router.get('/', getDashboard);

module.exports = router;
