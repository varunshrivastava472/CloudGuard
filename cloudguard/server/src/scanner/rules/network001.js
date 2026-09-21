/**
 * Rule: NETWORK-001
 * Name: SSH Port Open to Internet
 * Severity: CRITICAL
 * Category: Network
 */

module.exports = {
  ruleId: 'NETWORK-001',
  name: 'SSH Port Open to Internet',
  category: 'Network',
  severity: 'CRITICAL',
  description: 'Security group / firewall permits direct SSH (port 22) connections from the public internet (0.0.0.0/0).',
  impact: 'Allows remote attackers to perform automated brute-force, dictionary attacks, and exploit SSH service vulnerabilities directly from the public internet.',
  remediation: 'Restrict SSH access to trusted corporate IP ranges, a secure VPN, or use a managed bastion host / session manager instead of 0.0.0.0/0.',
  enabled: true,

  /**
   * Evaluates a normalized resource.
   * @param {Object} resource 
   * @returns {Array<Object>|null}
   */
  evaluate(resource) {
    if (!resource.rules || !Array.isArray(resource.rules)) {
      return null;
    }

    const findings = [];

    for (const rule of resource.rules) {
      const port = Number(rule.port);
      const isPort22 = port === 22;
      const isPublicSource = rule.source === '0.0.0.0/0' || rule.source === '::/0' || rule.source === 'any' || rule.source === '*';
      const isAllow = !rule.action || rule.action.toLowerCase() === 'allow';

      if (isPort22 && isPublicSource && isAllow) {
        findings.push({
          ruleId: this.ruleId,
          title: this.name,
          severity: this.severity,
          category: this.category,
          resource: resource.name,
          resourceId: resource.id,
          resourceType: resource.type,
          evidence: `Firewall rule allows port ${rule.port} from source '${rule.source}' on '${resource.name}'`,
          description: this.description,
          impact: this.impact,
          remediation: this.remediation,
          status: 'OPEN'
        });
      }
    }

    return findings.length > 0 ? findings : null;
  }
};
