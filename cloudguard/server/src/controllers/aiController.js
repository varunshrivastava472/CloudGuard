const storageService = require('../services/storageService');
const { explainFinding, generateRemediationGuidance } = require('../services/aiService');

/**
 * Handles finding explanation requests (POST /api/ai/explain).
 * Accepts:
 *  - { findingId: "..." } (retrieves verified finding from MongoDB)
 *  - or { finding: { ... } } (backward compatibility)
 */
async function explain(req, res) {
  try {
    const findingId = req.body.findingId || req.query.findingId;
    let finding = null;

    if (findingId) {
      finding = await storageService.getFindingById(findingId);
      if (!finding) {
        return res.status(404).json({
          success: false,
          message: `Finding with ID '${findingId}' not found in database`
        });
      }

      if (finding.scanId) {
        const scan = await storageService.getScanById(finding.scanId);
        if (scan) {
          const { verifyScanAccess } = require('./scanController');
          const access = verifyScanAccess(scan, req.user);
          if (!access.allowed) {
            return res.status(access.status).json({
              success: false,
              message: access.message
            });
          }
        }
      }
    } else if (req.body.finding && (req.body.finding.ruleId || req.body.finding._id)) {
      finding = req.body.finding;
    } else if (req.body.ruleId) {
      finding = req.body;
    } else {
      return res.status(400).json({
        success: false,
        message: 'findingId is required'
      });
    }

    const result = await explainFinding(finding);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to generate explanation',
      error: err.message
    });
  }
}

/**
 * Handles general remediation guidance requests (POST /api/ai/remediation).
 */
async function remediation(req, res) {
  try {
    const { prompt, finding } = req.body;

    if (finding && finding.ruleId) {
      const result = await explainFinding(finding);
      return res.status(200).json({
        success: true,
        data: result
      });
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt or finding object is required'
      });
    }

    const result = await generateRemediationGuidance(prompt);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to generate remediation',
      error: err.message
    });
  }
}

module.exports = {
  explain,
  remediation
};
