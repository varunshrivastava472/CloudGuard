const { runScan } = require('../services/scanService');
const storageService = require('../services/storageService');
const { applyRemediation } = require('../services/remediationService');
const path = require('path');

/**
 * Handles scan submission (POST /api/scans).
 */
async function createScan(req, res) {
  try {
    let content = '';
    let fileName = 'custom-config.json';
    let fileType = '';

    // Check if multipart file upload
    if (req.file) {
      content = req.file.buffer.toString('utf-8');
      fileName = req.file.originalname;
      fileType = path.extname(fileName).replace(/^\./, '').toLowerCase();
    } else if (req.body && (req.body.content || req.body.config || req.body.rawConfig)) {
      content = req.body.content || req.body.config || req.body.rawConfig;
      fileName = req.body.fileName || 'custom-config.json';
      fileType = req.body.fileType || path.extname(fileName).replace(/^\./, '').toLowerCase();
    } else {
      return res.status(400).json({
        success: false,
        message: 'No configuration provided. Upload a file or provide "content" in the JSON body.'
      });
    }

    // Run deterministic scanner
    const result = runScan({ content, fileName, fileType });

    // Persist scan & findings
    const userId = req.user ? req.user.id || req.user._id : null;
    const saved = await storageService.saveScan({
      scan: result.scan,
      findings: result.findings,
      resources: result.resources,
      userId,
      rawConfig: content
    });

    return res.status(201).json({
      success: true,
      message: 'Scan completed and saved successfully',
      data: {
        scan: saved.scan,
        findings: saved.findings,
        resources: result.resources
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to process configuration scan',
      error: err.message
    });
  }
}

/**
 * Lists previous scans (GET /api/scans).
 */
async function getScans(req, res) {
  try {
    const userId = req.user ? req.user.id || req.user._id : null;
    const { limit = 50, skip = 0 } = req.query;

    const scans = await storageService.getScans({ userId, limit, skip });

    return res.status(200).json({
      success: true,
      count: scans.length,
      data: scans
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve scan history',
      error: err.message
    });
  }
}

/**
 * Verifies if the requesting user is authorized to access the given scan.
 * Returns { allowed: true } or { allowed: false, status: number, message: string }
 */
function verifyScanAccess(scan, user) {
  if (!scan || !scan.userId) {
    return { allowed: true };
  }

  const currentUserId = user ? user.id || user._id : null;
  if (!currentUserId) {
    return {
      allowed: false,
      status: 401,
      message: 'Access denied: Authentication required to access this scan'
    };
  }

  if (user.role !== 'admin' && String(scan.userId) !== String(currentUserId)) {
    return {
      allowed: false,
      status: 403,
      message: 'Access denied: You do not have permission to access this scan'
    };
  }

  return { allowed: true };
}

/**
 * Gets scan details by ID (GET /api/scans/:id).
 */
async function getScanById(req, res) {
  try {
    const scan = await storageService.getScanById(req.params.id);
    if (!scan) {
      return res.status(404).json({
        success: false,
        message: `Scan ${req.params.id} not found`
      });
    }

    const access = verifyScanAccess(scan, req.user);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    const findings = await storageService.getFindingsByScanId(req.params.id);

    return res.status(200).json({
      success: true,
      data: {
        scan,
        findings,
        resources: scan.resources || []
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve scan details',
      error: err.message
    });
  }
}

/**
 * Gets findings for a specific scan (GET /api/scans/:id/findings).
 */
async function getScanFindings(req, res) {
  try {
    const scan = await storageService.getScanById(req.params.id);
    if (!scan) {
      return res.status(404).json({
        success: false,
        message: `Scan ${req.params.id} not found`
      });
    }

    const access = verifyScanAccess(scan, req.user);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    const { severity, category, status } = req.query;
    const findings = await storageService.getFindingsByScanId(req.params.id, { severity, category, status });

    return res.status(200).json({
      success: true,
      count: findings.length,
      data: findings
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve scan findings',
      error: err.message
    });
  }
}

/**
 * Re-scans an existing scan configuration (POST /api/scans/:id/rescan).
 */
async function rescan(req, res) {
  try {
    const existing = await storageService.getScanById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Scan ${req.params.id} not found`
      });
    }

    const access = verifyScanAccess(existing, req.user);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    const content = req.body.content || existing.rawConfig;
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'No configuration content available for rescan. Provide updated content in body.'
      });
    }

    const result = runScan({
      content,
      fileName: existing.fileName,
      fileType: existing.fileType
    });

    const userId = req.user ? req.user.id || req.user._id : existing.userId;
    const saved = await storageService.saveScan({
      scan: { ...result.scan, fileName: `Rescan - ${existing.fileName}` },
      findings: result.findings,
      resources: result.resources,
      userId,
      rawConfig: content
    });

    return res.status(201).json({
      success: true,
      message: 'Rescan completed successfully',
      data: {
        scan: saved.scan,
        findings: saved.findings,
        resources: result.resources
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Rescan failed',
      error: err.message
    });
  }
}

/**
 * Automatically applies security remediation to scan configuration and executes a re-scan.
 * POST /api/scans/:id/fix
 */
async function applyFix(req, res) {
  try {
    const existing = await storageService.getScanById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Scan ${req.params.id} not found`
      });
    }

    const access = verifyScanAccess(existing, req.user);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    const { findingId, ruleId, autoFixAll = false } = req.body;
    let targetFindings = [];

    const allFindings = await storageService.getFindingsByScanId(req.params.id);

    if (autoFixAll) {
      targetFindings = allFindings;
    } else if (findingId) {
      const singleFinding = allFindings.find(f => (f.id === findingId || f._id === findingId));
      if (singleFinding) targetFindings.push(singleFinding);
    } else if (ruleId) {
      targetFindings = allFindings.filter(f => f.ruleId === ruleId);
    } else {
      targetFindings = allFindings;
    }

    const { remediatedConfig, changesApplied } = applyRemediation(existing.rawConfig, targetFindings, { autoFixAll });

    // Run rescan with remediated configuration
    const rescanResult = runScan({
      content: remediatedConfig,
      fileName: `Remediated - ${existing.fileName}`,
      fileType: existing.fileType
    });

    // Determine findings resolved vs findings remaining
    const resolvedFindings = allFindings.filter(orig => {
      return !rescanResult.findings.some(sim => sim.ruleId === orig.ruleId && (sim.resource === orig.resource || sim.resourceId === orig.resourceId));
    });
    const remainingFindings = allFindings.filter(orig => {
      return rescanResult.findings.some(sim => sim.ruleId === orig.ruleId && (sim.resource === orig.resource || sim.resourceId === orig.resourceId));
    });

    const remediationReport = {
      initialScore: existing.securityScore ?? 100,
      finalScore: rescanResult.scan.securityScore,
      scoreImprovement: Math.max(0, rescanResult.scan.securityScore - (existing.securityScore ?? 100)),
      findingsBefore: allFindings,
      findingsResolved: resolvedFindings,
      findingsRemaining: remainingFindings,
      remediationSummary: changesApplied,
      verificationStatus: 'DETERMINISTIC_RESCAN_VERIFIED',
      timestamp: new Date().toISOString(),
      fileName: existing.fileName,
      scanId: existing.id || req.params.id
    };

    const userId = req.user ? req.user.id || req.user._id : existing.userId;
    const saved = await storageService.saveScan({
      scan: rescanResult.scan,
      findings: rescanResult.findings,
      resources: rescanResult.resources,
      userId,
      rawConfig: remediatedConfig,
      parentScanId: existing.id || req.params.id,
      remediationReport
    });

    return res.status(200).json({
      success: true,
      message: 'Remediation applied and re-scan completed successfully',
      data: {
        originalScore: existing.securityScore,
        newScore: rescanResult.scan.securityScore,
        scoreImprovement: Math.max(0, rescanResult.scan.securityScore - existing.securityScore),
        changesApplied,
        remediatedConfig,
        scan: saved.scan,
        findings: saved.findings,
        resources: rescanResult.resources,
        remediationReport
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to apply remediation',
      error: err.message
    });
  }
}

/**
 * Simulates security remediation without modifying the stored configuration.
 * Uses the same deterministic rule engine for prediction.
 * POST /api/scans/:id/simulate
 */
async function simulateFixes(req, res) {
  try {
    const existing = await storageService.getScanById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Scan ${req.params.id} not found`
      });
    }

    const access = verifyScanAccess(existing, req.user);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    if (!existing.rawConfig) {
      return res.status(400).json({
        success: false,
        message: 'Configuration content is not available for simulation'
      });
    }

    const allFindings = await storageService.getFindingsByScanId(req.params.id);
    const { selectedFindingIds = [], selectedRuleIds = [], autoFixAll = false } = req.body;

    let targetFindings = [];
    if (autoFixAll) {
      targetFindings = allFindings;
    } else if (Array.isArray(selectedFindingIds) && selectedFindingIds.length > 0) {
      targetFindings = allFindings.filter(f => selectedFindingIds.includes(f.id) || selectedFindingIds.includes(f._id));
    } else if (Array.isArray(selectedRuleIds) && selectedRuleIds.length > 0) {
      targetFindings = allFindings.filter(f => selectedRuleIds.includes(f.ruleId));
    } else {
      targetFindings = allFindings;
    }

    // Pure in-memory simulation — DO NOT PERSIST OR MODIFY
    const { remediatedConfig, changesApplied } = applyRemediation(existing.rawConfig, targetFindings, { autoFixAll });
    const simulationScan = runScan({
      content: remediatedConfig,
      fileName: existing.fileName,
      fileType: existing.fileType
    });

    const currentScore = existing.securityScore ?? 100;
    const predictedScore = simulationScan.scan.securityScore;
    const scoreDelta = Math.max(0, predictedScore - currentScore);

    // Differentiate disappeared findings from remaining findings
    const simulatedFindings = simulationScan.findings;
    const disappearedFindings = allFindings.filter(orig => {
      return !simulatedFindings.some(sim => sim.ruleId === orig.ruleId && (sim.resource === orig.resource || sim.resourceId === orig.resourceId));
    });
    const remainingFindings = allFindings.filter(orig => {
      return simulatedFindings.some(sim => sim.ruleId === orig.ruleId && (sim.resource === orig.resource || sim.resourceId === orig.resourceId));
    });

    return res.status(200).json({
      success: true,
      message: 'Simulation computed deterministically',
      data: {
        currentScore,
        predictedScore,
        scoreDelta,
        disappearedCount: disappearedFindings.length,
        remainingCount: remainingFindings.length,
        findingsDisappeared: disappearedFindings,
        findingsRemaining: remainingFindings,
        simulatedFindings: simulatedFindings,
        beforeBreakdown: existing.summary || { critical: 0, high: 0, medium: 0, low: 0 },
        afterBreakdown: simulationScan.scan.summary || { critical: 0, high: 0, medium: 0, low: 0 },
        changesApplied,
        simulatedConfig: remediatedConfig
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Simulation failed',
      error: err.message
    });
  }
}

/**
 * Gets verified remediation report for a scan (GET /api/scans/:id/remediation-report).
 */
async function getRemediationReport(req, res) {
  try {
    const scan = await storageService.getScanById(req.params.id);
    if (!scan) {
      return res.status(404).json({
        success: false,
        message: `Scan ${req.params.id} not found`
      });
    }

    const access = verifyScanAccess(scan, req.user);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    if (scan.remediationReport) {
      return res.status(200).json({
        success: true,
        data: scan.remediationReport
      });
    }

    // Check if any child scan was created as a remediation of this scan
    const allScans = await storageService.getScans({ userId: scan.userId, limit: 100 });
    const childScan = allScans.find(s => s.parentScanId === String(req.params.id) && s.remediationReport);
    if (childScan && childScan.remediationReport) {
      return res.status(200).json({
        success: true,
        data: childScan.remediationReport
      });
    }

    // Default baseline report if not yet remediated
    const currentFindings = await storageService.getFindingsByScanId(req.params.id);
    return res.status(200).json({
      success: true,
      data: {
        initialScore: scan.securityScore ?? 100,
        finalScore: scan.securityScore ?? 100,
        scoreImprovement: 0,
        findingsBefore: currentFindings,
        findingsResolved: [],
        findingsRemaining: currentFindings,
        remediationSummary: ['No automated remediation applied yet.'],
        verificationStatus: 'DETERMINISTIC_BASELINE',
        timestamp: scan.createdAt,
        fileName: scan.fileName,
        scanId: scan.id || scan._id
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve remediation report',
      error: err.message
    });
  }
}

module.exports = {
  createScan,
  getScans,
  getScanById,
  getScanFindings,
  rescan,
  applyFix,
  simulateFixes,
  getRemediationReport,
  verifyScanAccess
};
