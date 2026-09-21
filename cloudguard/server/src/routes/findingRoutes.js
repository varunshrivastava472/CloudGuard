const express = require('express');
const router = express.Router();
const { getFindingById, updateFindingStatus, getFindingAttackPath } = require('../controllers/findingController');

// GET /api/findings/:id - Get finding details by ID
router.get('/:id', getFindingById);

// GET /api/findings/:id/attack-path - Get defensive attack path visualization data
router.get('/:id/attack-path', getFindingAttackPath);

// PATCH /api/findings/:id/status - Update finding status (OPEN, RESOLVED, MUTED)
router.patch('/:id/status', updateFindingStatus);

module.exports = router;
