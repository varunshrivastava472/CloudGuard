const express = require('express');
const router = express.Router();
const { listRules, getRule } = require('../controllers/ruleController');

// GET /api/rules - List all registered security rules
router.get('/', listRules);

// GET /api/rules/:ruleId - Get rule by ID
router.get('/:ruleId', getRule);

module.exports = router;
