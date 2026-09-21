/**
 * Rule: NETWORK-002
 * Name: Database Port Open to Internet
 * Severity: CRITICAL
 * Category: Network
 */

const DB_PORTS = [3306, 5432, 27017, 1433, 1521, 6379, 9200];

module.exports = {
  ruleId: 'NETWORK-002',
  name: 'Database Port Open to Internet',
  category: 'Network',
  severity: 'CRITICAL',
  description: 'Standard database management port (e.g. MySQL 3306, PostgreSQL 5432, MongoDB 27017) is exposed directly to the public internet.',
  impact: 'Exposes backend databases to unauthorized direct network connection attempts, brute-force authentication attacks, and remote data exfiltration.',
  remediation: 'Place databases in private subnets with no public IP and restrict database firewall rules exclusively to the application tier or internal VPC subnets.',
  enabled: true,

  /**
   * Evaluates a normalized resource.
   * @param {Object} resource 
   * @returns {Array<Object>|null}
   */
  evaluate(resource) {
    const findings = [];

    // Check firewall / security group rules
    if (resource.rules && Array.isArray(resource.rules)) {
      for (const rule of resource.rules) {
        const port = Number(rule.port);
        const isDbPort = DB_PORTS.includes(port);
        const isPublicSource = rule.source === '0.0.0.0/0' || rule.source === '::/0' || rule.source === 'any' || rule.source === '*';
        const isAllow = !rule.action || rule.action.toLowerCase() === 'allow';

        if (isDbPort && isPublicSource && isAllow) {
          findings.push({
            ruleId: this.ruleId,
            title: this.name,
            severity: this.severity,
            category: this.category,
            resource: resource.name,
            resourceId: resource.id,
            resourceType: resource.type,
            evidence: `Database port ${port} is open to source '${rule.source}' on '${resource.name}'`,
            description: this.description,
            impact: this.impact,
            remediation: this.remediation,
            status: 'OPEN'
          });
        }
      }
    }

    // Also check direct database resource if it is marked publicAccess
    if (resource.type === 'database' && resource.publicAccess === true && findings.length === 0) {
      findings.push({
        ruleId: this.ruleId,
        title: this.name,
        severity: this.severity,
        category: this.category,
        resource: resource.name,
        resourceId: resource.id,
        resourceType: resource.type,
        evidence: `database.publicAccess === true on resource '${resource.name}'`,
        description: this.description,
        impact: this.impact,
        remediation: this.remediation,
        status: 'OPEN'
      });
    }

    return findings.length > 0 ? findings : null;
  }
};
