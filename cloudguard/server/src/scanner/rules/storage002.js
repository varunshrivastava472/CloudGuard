/**
 * Rule: STORAGE-002
 * Name: Storage Encryption Disabled
 * Severity: HIGH
 * Category: Storage
 */

module.exports = {
  ruleId: 'STORAGE-002',
  name: 'Storage Encryption Disabled',
  category: 'Storage',
  severity: 'HIGH',
  description: 'Storage resource does not have server-side or at-rest encryption enabled.',
  impact: 'Unencrypted data at rest can be exposed in plaintext if underlying physical media or snapshots are accessed or mishandled.',
  remediation: 'Enable server-side encryption at rest using provider-managed or customer-managed KMS encryption keys.',
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

    if (resource.encryptionEnabled === false) {
      return [{
        ruleId: this.ruleId,
        title: this.name,
        severity: this.severity,
        category: this.category,
        resource: resource.name,
        resourceId: resource.id,
        resourceType: resource.type,
        evidence: `storage.encryptionEnabled === false on resource '${resource.name}'`,
        description: this.description,
        impact: this.impact,
        remediation: this.remediation,
        status: 'OPEN'
      }];
    }

    return null;
  }
};
