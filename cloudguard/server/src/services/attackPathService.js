/**
 * Attack Path Service
 * 
 * Generates defensive configuration-based attack path / security impact flows
 * for verified findings.
 * 
 * 4-Tier Defensive Flow:
 *  1. Internet / Source
 *  2. Network or IAM Control
 *  3. Affected Resource
 *  4. Potentially Affected Asset / Data
 * 
 * NOTE: This is purely a defensive configuration evidence visualization.
 * No real attacks or exploits are executed.
 */

/**
 * Extracts or derives the 4-tier attack path for a given finding and its resource.
 * 
 * @param {Object} finding - Verified finding object from deterministic rule engine.
 * @param {Object} [resource] - Optional resource object if available.
 * @returns {Object} Complete 4-tier attack path model with defensive cutoff details.
 */
function generateAttackPath(finding, resource = null) {
  if (!finding || !finding.ruleId) {
    throw new Error('Valid finding object with ruleId is required');
  }

  const ruleId = String(finding.ruleId).toUpperCase();
  const resourceName = finding.resource || (resource && resource.name) || 'unknown-resource';
  const resourceType = finding.resourceType || (resource && resource.type) || 'cloud-resource';
  const evidence = finding.evidence || '';

  let sourceNode = {
    tier: 1,
    tierName: 'Internet / Source',
    title: 'Public Internet (0.0.0.0/0)',
    type: 'source',
    icon: 'Globe',
    status: 'EXPOSED_INGRESS',
    badge: 'UNAUTHENTICATED INGRESS',
    description: 'Any external host or unauthorized client on the public internet.',
    evidence: '0.0.0.0/0 ingress route'
  };

  let controlNode = {
    tier: 2,
    tierName: 'Network or IAM Control',
    title: 'Network / IAM Control Gate',
    type: 'control',
    icon: 'ShieldAlert',
    status: 'PERMISSIVE',
    badge: 'MISCONFIGURED DEFENSIVE GATE',
    description: 'Defensive policy failed to restrict inbound access.',
    evidence: evidence,
    defensiveCutoff: 'Patching this control completely severs external reachability to downstream assets.'
  };

  let resourceNode = {
    tier: 3,
    tierName: 'Affected Resource',
    title: resourceName,
    type: 'resource',
    icon: 'Server',
    status: 'VULNERABLE',
    badge: `TARGET: ${resourceType.toUpperCase()}`,
    resourceType: resourceType,
    resourceId: finding.resourceId || resourceName,
    description: `Cloud resource '${resourceName}' directly bound to the permissive control.`,
    evidence: `Resource identifier: ${resourceName}`
  };

  let assetNode = {
    tier: 4,
    tierName: 'Potentially Affected Asset / Data',
    title: 'Sensitive Assets & Downstream Infrastructure',
    type: 'asset',
    icon: 'AlertTriangle',
    status: 'CRITICAL_RISK',
    badge: 'BLAST RADIUS',
    description: 'Data or services exposed if the misconfiguration is reached.',
    impactScope: finding.impact || 'Unauthorized access and data exfiltration risk.'
  };

  // Rule-specific deterministic configuration mappings
  switch (ruleId) {
    case 'NETWORK-001': // SSH Port Open
      sourceNode = {
        tier: 1,
        tierName: 'Internet / Source',
        title: 'Public Internet (0.0.0.0/0)',
        type: 'source',
        icon: 'Globe',
        status: 'EXPOSED_INGRESS',
        badge: 'UNAUTHENTICATED ACTOR',
        description: 'Automated internet scanners, threat actors, and brute-force botnets.',
        evidence: 'Source: 0.0.0.0/0 (Internet Any)'
      };
      controlNode = {
        tier: 2,
        tierName: 'Network or IAM Control',
        title: 'Security Group / Firewall Rule (Port 22 TCP)',
        type: 'control',
        icon: 'ShieldAlert',
        status: 'PERMISSIVE',
        badge: 'OPEN MANAGEMENT PORT',
        description: 'Firewall permits direct inbound SSH (port 22) connections from anywhere without VPN or IP restrictions.',
        evidence: evidence,
        defensiveCutoff: 'Restrict SSH source from 0.0.0.0/0 to internal bastion CIDR (10.0.1.0/24).'
      };
      resourceNode = {
        tier: 3,
        tierName: 'Affected Resource',
        title: resourceName,
        type: 'resource',
        icon: 'Server',
        status: 'VULNERABLE',
        badge: 'TARGET: FIREWALL / INSTANCE',
        resourceType: resourceType,
        resourceId: finding.resourceId || resourceName,
        description: `Network security group '${resourceName}' applied to compute instances.`,
        evidence: `Firewall configuration: ${resourceName}`
      };
      assetNode = {
        tier: 4,
        tierName: 'Potentially Affected Asset / Data',
        title: 'Compute Instance Host Shell & VPC Network',
        type: 'asset',
        icon: 'Terminal',
        status: 'CRITICAL_RISK',
        badge: 'REMOTE ACCESS & LATERAL PIVOT',
        description: 'Interactive root/user terminal sessions, host credentials, and internal private VPC network routing.',
        impactScope: 'Host compromise, credential scraping in memory, lateral movement across private subnets.'
      };
      break;

    case 'NETWORK-002': // Database Port Open
      sourceNode = {
        tier: 1,
        tierName: 'Internet / Source',
        title: 'Public Internet (0.0.0.0/0)',
        type: 'source',
        icon: 'Globe',
        status: 'EXPOSED_INGRESS',
        badge: 'EXTERNAL CALLER',
        description: 'Public internet traffic attempting direct database network handshakes.',
        evidence: 'Source: 0.0.0.0/0'
      };
      controlNode = {
        tier: 2,
        tierName: 'Network or IAM Control',
        title: 'Database Firewall Ingress / Public Gateway',
        type: 'control',
        icon: 'ShieldAlert',
        status: 'PERMISSIVE',
        badge: 'DATABASE PORT EXPOSED',
        description: 'Permits inbound connections on standard database ports (e.g. 3306, 5432, 27017) or publicAccess flag is true.',
        evidence: evidence,
        defensiveCutoff: 'Disable database public access and restrict ingress to application tier subnet (10.0.2.0/24).'
      };
      resourceNode = {
        tier: 3,
        tierName: 'Affected Resource',
        title: resourceName,
        type: 'resource',
        icon: 'Database',
        status: 'VULNERABLE',
        badge: 'TARGET: DATABASE INSTANCE',
        resourceType: resourceType,
        resourceId: finding.resourceId || resourceName,
        description: `Production database instance '${resourceName}'.`,
        evidence: `Database configuration: ${resourceName}`
      };
      assetNode = {
        tier: 4,
        tierName: 'Potentially Affected Asset / Data',
        title: 'Production Customer Records & Transaction Data',
        type: 'asset',
        icon: 'TableProperties',
        status: 'CRITICAL_RISK',
        badge: 'DATA EXFILTRATION & COMPLIANCE',
        description: 'Customer PII, password hashes, payment logs, and structured business records.',
        impactScope: 'Mass data exfiltration, database ransomware encryption, regulatory compliance penalties.'
      };
      break;

    case 'STORAGE-001': // Public Storage
      sourceNode = {
        tier: 1,
        tierName: 'Internet / Source',
        title: 'Anonymous Web User / Web Crawler',
        type: 'source',
        icon: 'Globe',
        status: 'EXPOSED_INGRESS',
        badge: 'UNAUTHENTICATED REQUESTS',
        description: 'Anyone with an HTTP/REST client without cloud authentication credentials.',
        evidence: 'Unauthenticated public read/write requests'
      };
      controlNode = {
        tier: 2,
        tierName: 'Network or IAM Control',
        title: 'Storage Bucket Access Control List (ACL / Policy)',
        type: 'control',
        icon: 'ShieldAlert',
        status: 'PERMISSIVE',
        badge: 'PUBLIC READ/WRITE ALLOWED',
        description: 'Bucket has publicAccess enabled, bypassing IAM identity authorization checks.',
        evidence: evidence,
        defensiveCutoff: 'Set publicAccess: false to enforce IAM role authentication on all object operations.'
      };
      resourceNode = {
        tier: 3,
        tierName: 'Affected Resource',
        title: resourceName,
        type: 'resource',
        icon: 'FolderLock',
        status: 'VULNERABLE',
        badge: 'TARGET: STORAGE BUCKET',
        resourceType: resourceType,
        resourceId: finding.resourceId || resourceName,
        description: `Storage container / object bucket '${resourceName}'.`,
        evidence: `Storage container: ${resourceName}`
      };
      assetNode = {
        tier: 4,
        tierName: 'Potentially Affected Asset / Data',
        title: 'Proprietary Documents, Backups & User Files',
        type: 'asset',
        icon: 'FileWarning',
        status: 'CRITICAL_RISK',
        badge: 'UNRESTRICTED DATA EXPOSURE',
        description: 'Raw files stored in the bucket, including customer identity docs, system backups, and API keys.',
        impactScope: 'Uncontrolled data download, bucket tampering, public leak of confidential corporate assets.'
      };
      break;

    case 'STORAGE-002': // Storage Encryption Disabled
      sourceNode = {
        tier: 1,
        tierName: 'Internet / Source',
        title: 'Unauthorized Media Access / Snapshot Exfiltration',
        type: 'source',
        icon: 'HardDrive',
        status: 'EXPOSED_INGRESS',
        badge: 'OFFLINE / DISK VECTOR',
        description: 'Adversary with snapshot read privileges, backup disc access, or decommissioned media forensics.',
        evidence: 'Unencrypted storage volume / bucket'
      };
      controlNode = {
        tier: 2,
        tierName: 'Network or IAM Control',
        title: 'Storage At-Rest Encryption Policy',
        type: 'control',
        icon: 'ShieldAlert',
        status: 'PERMISSIVE',
        badge: 'KMS ENCRYPTION DISABLED',
        description: 'Server-side encryption is disabled (encryptionEnabled: false), leaving stored bytes in plaintext.',
        evidence: evidence,
        defensiveCutoff: 'Enable AES-256 or KMS customer-managed encryption at rest (encryptionEnabled: true).'
      };
      resourceNode = {
        tier: 3,
        tierName: 'Affected Resource',
        title: resourceName,
        type: 'resource',
        icon: 'Archive',
        status: 'VULNERABLE',
        badge: 'TARGET: STORAGE VOLUME',
        resourceType: resourceType,
        resourceId: finding.resourceId || resourceName,
        description: `Unencrypted storage volume/bucket '${resourceName}'.`,
        evidence: `Storage volume: ${resourceName}`
      };
      assetNode = {
        tier: 4,
        tierName: 'Potentially Affected Asset / Data',
        title: 'Plaintext Stored Files & Regulatory Compliance',
        type: 'asset',
        icon: 'FileText',
        status: 'HIGH_RISK',
        badge: 'PLAINTEXT DISK EXPOSURE',
        description: 'All raw bytes stored on underlying physical disk media without cryptographic protection.',
        impactScope: 'Forensic extraction from raw snapshots, GDPR / HIPAA / PCI-DSS compliance audit failures.'
      };
      break;

    case 'IAM-001': // Wildcard IAM
      sourceNode = {
        tier: 1,
        tierName: 'Internet / Source',
        title: 'Compromised Identity / Leaked API Credential',
        type: 'source',
        icon: 'UserX',
        status: 'EXPOSED_INGRESS',
        badge: 'COMPROMISED CREDENTIAL',
        description: 'Attacker possessing valid API credentials or executing code within the overprivileged role.',
        evidence: 'Actor assumed role or hijacked token'
      };
      controlNode = {
        tier: 2,
        tierName: 'Network or IAM Control',
        title: 'IAM Policy Statement (Action: "*")',
        type: 'control',
        icon: 'ShieldAlert',
        status: 'PERMISSIVE',
        badge: 'WILDCARD PRIVILEGE GRANTED',
        description: 'Policy grants wildcard "*" permissions without scoping down to least privilege actions.',
        evidence: evidence,
        defensiveCutoff: 'Replace "*" with explicit granular verbs: [storage:GetObject, database:Query].'
      };
      resourceNode = {
        tier: 3,
        tierName: 'Affected Resource',
        title: resourceName,
        type: 'resource',
        icon: 'KeyRound',
        status: 'VULNERABLE',
        badge: 'TARGET: IAM ROLE / POLICY',
        resourceType: resourceType,
        resourceId: finding.resourceId || resourceName,
        description: `IAM entity '${resourceName}' with excessive permission grants.`,
        evidence: `IAM policy attachment: ${resourceName}`
      };
      assetNode = {
        tier: 4,
        tierName: 'Potentially Affected Asset / Data',
        title: 'Entire Cloud Infrastructure & Control Plane',
        type: 'asset',
        icon: 'ShieldX',
        status: 'CRITICAL_RISK',
        badge: 'FULL ACCOUNT TAKEOVER',
        description: 'Any cloud service, database, compute instance, security group, or user account across the tenant.',
        impactScope: 'Total cloud account compromise, resource deletion, privilege escalation, cryptomining deployment.'
      };
      break;

    default:
      break;
  }

  return {
    ruleId: finding.ruleId,
    title: finding.title,
    severity: finding.severity,
    resource: resourceName,
    evidence: evidence,
    status: finding.status || 'OPEN',
    path: [
      sourceNode,
      controlNode,
      resourceNode,
      assetNode
    ],
    defensiveCutoffSummary: controlNode.defensiveCutoff,
    methodology: 'Configuration-evidence based defensive path analysis (Zero active penetration testing)'
  };
}

module.exports = {
  generateAttackPath
};
