const storageService = require('../services/storageService');
const { verifyScanAccess } = require('./scanController');

/**
 * Helper to check parent scan access for a finding.
 */
async function checkFindingAccess(finding, user) {
  if (!finding || !finding.scanId) return { allowed: true };
  const scan = await storageService.getScanById(finding.scanId);
  if (scan) {
    return verifyScanAccess(scan, user);
  }
  return { allowed: true };
}

/**
 * Gets finding details by ID (GET /api/findings/:id).
 */
async function getFindingById(req, res) {
  try {
    const finding = await storageService.getFindingById(req.params.id);
    if (!finding) {
      return res.status(404).json({
        success: false,
        message: `Finding ${req.params.id} not found`
      });
    }

    const access = await checkFindingAccess(finding, req.user);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    return res.status(200).json({
      success: true,
      data: finding
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve finding details',
      error: err.message
    });
  }
}

/**
 * Updates finding status (PATCH /api/findings/:id/status).
 */
async function updateFindingStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status field is required (OPEN, RESOLVED, MUTED)'
      });
    }

    const normalizedStatus = String(status).toUpperCase();
    if (!['OPEN', 'RESOLVED', 'MUTED'].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Permitted values: OPEN, RESOLVED, MUTED'
      });
    }

    const existing = await storageService.getFindingById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Finding ${req.params.id} not found`
      });
    }

    const access = await checkFindingAccess(existing, req.user);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    const updated = await storageService.updateFindingStatus(req.params.id, status);

    return res.status(200).json({
      success: true,
      message: `Finding status updated to ${status.toUpperCase()}`,
      data: updated
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update finding status',
      error: err.message
    });
  }
}

/**
 * Gets deterministic defensive attack path for finding (GET /api/findings/:id/attack-path).
 */
async function getFindingAttackPath(req, res) {
  try {
    const finding = await storageService.getFindingById(req.params.id);
    if (!finding) {
      return res.status(404).json({
        success: false,
        message: `Finding ${req.params.id} not found`
      });
    }

    const access = await checkFindingAccess(finding, req.user);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    const { generateAttackPath } = require('../services/attackPathService');
    const attackPath = generateAttackPath(finding);
    return res.status(200).json({
      success: true,
      data: attackPath
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate attack path',
      error: err.message
    });
  }
}

module.exports = {
  getFindingById,
  updateFindingStatus,
  getFindingAttackPath
};
