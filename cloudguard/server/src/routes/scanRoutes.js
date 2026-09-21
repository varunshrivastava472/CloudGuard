const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  createScan,
  getScans,
  getScanById,
  getScanFindings,
  rescan,
  applyFix,
  simulateFixes,
  getRemediationReport
} = require('../controllers/scanController');

// POST /api/scans - Upload file or send JSON/YAML body to scan
router.post('/', upload.single('file'), createScan);

// GET /api/scans - List all past scans
router.get('/', getScans);

// GET /api/scans/:id - Get specific scan details
router.get('/:id', getScanById);

// GET /api/scans/:id/findings - Get findings for a specific scan
router.get('/:id/findings', getScanFindings);

// POST /api/scans/:id/rescan - Re-scan an existing scan configuration
router.post('/:id/rescan', rescan);

// POST /api/scans/:id/fix - Apply auto-remediation and re-scan
router.post('/:id/fix', applyFix);

// POST /api/scans/:id/simulate - What-If simulator (pure prediction, no mutation)
router.post('/:id/simulate', simulateFixes);

// GET /api/scans/:id/remediation-report - Verified remediation report
router.get('/:id/remediation-report', getRemediationReport);

module.exports = router;
