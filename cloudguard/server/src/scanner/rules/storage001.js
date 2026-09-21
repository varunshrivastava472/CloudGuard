/**
 * Rule: STORAGE-001
 * Name: Publicly Accessible Storage
 * Severity: CRITICAL
 * Category: Storage
 */

module.exports = {
  ruleId: 'STORAGE-001',
  name: 'Publicly Accessible Storage',
  category: 'Storage',
  severity: 'CRITICAL',
  description: 'Storage resource is configured to allow unrestricted public read/write access from the internet.',
  impact: 'Exposes sensitive company and customer data directly to unauthorized internet users, leading to data breaches and compliance violations.',
  remediation: 'Disable public access on the storage resource and enforce private access policies or authenticated role-based access.',
  enabled: true,

  /**
   * Evaluates a normalized resource.
   * @param {Object} resource 
   * @returns {Array<Object>|null}
   */
  evaluate(resource) {
    if (resource.type !== 'storage') {
      return null;
    }

    if (resource.publicAccess === true) {
      return [{
        ruleId: this.ruleId,
        title: this.name,
        severity: this.severity,
        category: this.category,
        resource: resource.name,
        resourceId: resource.id,
        resourceType: resource.type,
        evidence: `storage.publicAccess === true on resource '${resource.name}'`,
        description: this.description,
        impact: this.impact,
        remediation: this.remediation,
        status: 'OPEN'
      }];
    }

    return null;
  }
};
