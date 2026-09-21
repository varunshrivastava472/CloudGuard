const express = require('express');
const router = express.Router();
const { explain, remediation } = require('../controllers/aiController');

// POST /api/ai/explain - Generate explanation for a verified finding
router.post('/explain', explain);

// POST /api/ai/remediation - Generate developer remediation guidance
router.post('/remediation', remediation);

module.exports = router;
