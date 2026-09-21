/**
 * Rule: IAM-001
 * Name: Wildcard IAM Permission
 * Severity: HIGH
 * Category: IAM
 */

module.exports = {
  ruleId: 'IAM-001',
  name: 'Wildcard IAM Permission',
  category: 'IAM',
  severity: 'HIGH',
  description: 'IAM role or policy grants unrestricted wildcard permissions ("*") allowing all actions across resources.',
  impact: 'Violates the principle of least privilege, enabling excessive privilege escalation, accidental resource destruction, or lateral movement during an account compromise.',
  remediation: 'Scope IAM policies to explicit, granular actions (e.g. storage:GetObject, database:Query) and specify exact resource ARNs/IDs.',
  enabled: true,

  /**
   * Evaluates a normalized resource.
   * @param {Object} resource 
   * @returns {Array<Object>|null}
   */
  evaluate(resource) {
    if (!resource.permissions || !Array.isArray(resource.permissions)) {
      return null;
    }

    const hasWildcard = resource.permissions.some(perm => {
      const trimmed = String(perm).trim();
      return trimmed === '*' || trimmed === '*:*' || trimmed.endsWith(':*') && trimmed.startsWith('*');
    });

    if (hasWildcard) {
      return [{
        ruleId: this.ruleId,
        title: this.name,
        severity: this.severity,
        category: this.category,
        resource: resource.name,
        resourceId: resource.id,
        resourceType: resource.type,
        evidence: `IAM permissions contain wildcard '*' on resource '${resource.name}'`,
        description: this.description,
        impact: this.impact,
        remediation: this.remediation,
        status: 'OPEN'
      }];
    }

    return null;
  }
};
