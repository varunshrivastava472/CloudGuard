/**
 * Severity penalties and Security Score calculation.
 * 
 * Label: "CloudGuard Security Score"
 * Formula: Math.max(0, 100 - totalPenalty)
 */

const SEVERITY_PENALTIES = {
  CRITICAL: 20,
  HIGH: 10,
  MEDIUM: 5,
  LOW: 2
};

const SEVERITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Calculates total penalty and summary breakdown from a list of findings.
 * @param {Array<Object>} findings 
 * @returns {Object} Score details and breakdown
 */
function calculateSecurityScore(findings = []) {
  let totalPenalty = 0;
  const breakdown = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    total: findings.length
  };

  for (const finding of findings) {
    const sev = String(finding.severity || 'LOW').toUpperCase();
    if (breakdown[sev] !== undefined) {
      breakdown[sev] += 1;
    }
    const penalty = SEVERITY_PENALTIES[sev] || 0;
    totalPenalty += penalty;
  }

  const score = Math.max(0, 100 - totalPenalty);

  return {
    score,
    totalPenalty,
    label: 'CloudGuard Security Score',
    description: 'Deterministic security score computed from rule penalties (Start: 100, Critical: -20, High: -10, Medium: -5, Low: -2).',
    breakdown
  };
}

module.exports = {
  SEVERITY_PENALTIES,
  SEVERITY_LEVELS,
  calculateSecurityScore
};
