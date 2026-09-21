const { getAllRules, getRuleById } = require('../scanner/rules');

/**
 * Lists all registered security rules (GET /api/rules).
 */
function listRules(req, res) {
  const rules = getAllRules().map(r => ({
    ruleId: r.ruleId,
    name: r.name,
    category: r.category,
    severity: r.severity,
    description: r.description,
    impact: r.impact,
    remediation: r.remediation,
    enabled: r.enabled !== false
  }));

  return res.status(200).json({
    success: true,
    count: rules.length,
    data: rules
  });
}

/**
 * Gets rule details by ID (GET /api/rules/:ruleId).
 */
function getRule(req, res) {
  const rule = getRuleById(req.params.ruleId);
  if (!rule) {
    return res.status(404).json({
      success: false,
      message: `Rule ${req.params.ruleId} not found`
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      ruleId: rule.ruleId,
      name: rule.name,
      category: rule.category,
      severity: rule.severity,
      description: rule.description,
      impact: rule.impact,
      remediation: rule.remediation,
      enabled: rule.enabled !== false
    }
  });
}

module.exports = {
  listRules,
  getRule
};
