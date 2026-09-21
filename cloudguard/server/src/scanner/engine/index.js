const { getEnabledRules } = require('../rules');
const { calculateSecurityScore } = require('../severity');

/**
 * Runs the deterministic security rule engine against a normalized configuration.
 * 
 * @param {Object} normalizedConfig - Normalized configuration object with resources array.
 * @param {Array<Object>} [customRules] - Optional override list of rules.
 * @returns {Object} Complete scan results with findings, summary, and security score.
 */
function evaluateConfig(normalizedConfig, customRules = null) {
  if (!normalizedConfig || !Array.isArray(normalizedConfig.resources)) {
    throw new Error('Invalid normalized configuration: missing resources array');
  }

  const rules = customRules || getEnabledRules();
  const allFindings = [];

  for (const resource of normalizedConfig.resources) {
    for (const rule of rules) {
      if (typeof rule.evaluate === 'function') {
        try {
          const ruleFindings = rule.evaluate(resource, normalizedConfig.resources);
          if (Array.isArray(ruleFindings) && ruleFindings.length > 0) {
            allFindings.push(...ruleFindings);
          }
        } catch (err) {
          console.error(`Error evaluating rule ${rule.ruleId} on resource ${resource.id || resource.name}:`, err.message);
        }
      }
    }
  }

  const scoreResult = calculateSecurityScore(allFindings);

  return {
    provider: normalizedConfig.provider || 'demo-cloud',
    scannedAt: new Date().toISOString(),
    securityScore: scoreResult.score,
    scoreLabel: scoreResult.label,
    totalPenalty: scoreResult.totalPenalty,
    summary: {
      totalResources: normalizedConfig.resources.length,
      totalFindings: allFindings.length,
      critical: scoreResult.breakdown.CRITICAL,
      high: scoreResult.breakdown.HIGH,
      medium: scoreResult.breakdown.MEDIUM,
      low: scoreResult.breakdown.LOW
    },
    findings: allFindings
  };
}

module.exports = {
  evaluateConfig
};
