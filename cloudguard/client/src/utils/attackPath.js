/**
 * Client-side Attack Path Derivation Utility
 * 
 * Generates the defensive 4-tier configuration flow for findings:
 *  1. Internet / Source
 *  2. Network or IAM Control
 *  3. Affected Resource
 *  4. Potentially Affected Asset / Data
 * 
 * Purely defensive visualization based on configuration evidence.
 */

export function deriveAttackPath(finding) {
  if (!finding) return null;

  const ruleId = String(finding.ruleId || '').toUpperCase();
  const resourceName = finding.resource || finding.resourceId || 'cloud-resource';
  const resourceType = finding.resourceType || 'resource';
  const evidence = finding.evidence || '';

  let sourceNode = {
    tier: 1,
    tierName: 'Internet / Source',
    title: 'Public Internet (0.0.0.0/0)',
    type: 'source',
    icon: 'Globe',
    badge: 'UNAUTHENTICATED INGRESS',
    description: 'Any unauthenticated client or external network actor on the public internet.',
    evidence: '0.0.0.0/0 ingress route'
  };

  let controlNode = {
    tier: 2,
    tierName: 'Network or IAM Control',
    title: 'Network / IAM Control Gate',
    type: 'control',
    icon: 'ShieldAlert',
    badge: 'MISCONFIGURED DEFENSIVE GATE',
    description: 'Permissive policy configuration failed to enforce least-privilege boundary.',
    evidence: evidence,
    defensiveCutoff: 'Applying deterministic fix severs external reachability to downstream assets.'
  };

  let resourceNode = {
    tier: 3,
    tierName: 'Affected Resource',
    title: resourceName,
    type: 'resource',
    icon: 'Server',
    badge: `TARGET: ${resourceType.toUpperCase()}`,
    resourceType: resourceType,
    resourceId: finding.resourceId || resourceName,
    description: `Target cloud resource '${resourceName}' directly attached to the permissive policy.`,
    evidence: `Target entity: ${resourceName}`
  };

  let assetNode = {
    tier: 4,
    tierName: 'Potentially Affected Asset / Data',
    title: 'Downstream Infrastructure & Sensitive Data',
    type: 'asset',
    icon: 'AlertTriangle',
    badge: 'BLAST RADIUS',
    description: 'Data or services exposed if the configuration flaw is reached.',
    impactScope: finding.impact || 'Unauthorized access and data exfiltration risk.'
  };

  switch (ruleId) {
    case 'NETWORK-001':
      sourceNode = {
        tier: 1,
        tierName: 'Internet / Source',
        title: 'Public Internet (0.0.0.0/0)',
        type: 'source',
        icon: 'Globe',
        badge: 'UNAUTHENTICATED ACTOR',
        description: 'Automated scanners, credential brute-forcers, and unauthorized internet clients.',
        evidence: 'Source CIDR: 0.0.0.0/0'
      };
      controlNode = {
        tier: 2,
        tierName: 'Network or IAM Control',
        title: 'Firewall Ingress Rule (Port 22 TCP)',
        type: 'control',
        icon: 'ShieldAlert',
        badge: 'OPEN MANAGEMENT PORT',
        description: 'Firewall permits direct inbound SSH (port 22) connections from 0.0.0.0/0 without VPN or IP restrictions.',
        evidence: evidence,
        defensiveCutoff: 'Restrict SSH source from 0.0.0.0/0 to internal bastion CIDR (10.0.1.0/24).'
      };
      resourceNode = {
        tier: 3,
        tierName: 'Affected Resource',
        title: resourceName,
        type: 'resource',
        icon: 'Server',
        badge: 'TARGET: SECURITY GROUP',
        resourceType: resourceType,
        resourceId: finding.resourceId || resourceName,
        description: `Security group '${resourceName}' filtering traffic to compute instances.`,
        evidence: `Firewall: ${resourceName}`
      };
      assetNode = {
        tier: 4,
        tierName: 'Potentially Affected Asset / Data',
        title: 'Compute Host Shell & Private VPC Subnet',
        type: 'asset',
        icon: 'Terminal',
        badge: 'REMOTE CODE & LATERAL PIVOT',
        description: 'Interactive root/user terminal sessions, host credentials, and internal private VPC network routing.',
        impactScope: 'Interactive shell access, host credential scraping, lateral pivot to internal services.'
      };
      break;

    case 'NETWORK-002':
      sourceNode = {
        tier: 1,
        tierName: 'Internet / Source',
        title: 'Public Internet (0.0.0.0/0)',
        type: 'source',
        icon: 'Globe',
        badge: 'EXTERNAL CALLER',
        description: 'Public internet traffic attempting direct TCP handshake with database listeners.',
        evidence: 'Source: 0.0.0.0/0'
      };
      controlNode = {
        tier: 2,
        tierName: 'Network or IAM Control',
        title: 'Database Firewall Ingress / Public Gateway',
        type: 'control',
        icon: 'ShieldAlert',
        badge: 'DATABASE PORT EXPOSED',
        description: 'Permits inbound traffic on database port (3306/5432/27017) or publicAccess is enabled.',
        evidence: evidence,
        defensiveCutoff: 'Disable database public access and scope ingress to application tier subnet (10.0.2.0/24).'
      };
      resourceNode = {
        tier: 3,
        tierName: 'Affected Resource',
        title: resourceName,
        type: 'resource',
        icon: 'Database',
        badge: 'TARGET: DATABASE INSTANCE',
        resourceType: resourceType,
        resourceId: finding.resourceId || resourceName,
        description: `Production database resource '${resourceName}'.`,
        evidence: `Database: ${resourceName}`
      };
      assetNode = {
        tier: 4,
        tierName: 'Potentially Affected Asset / Data',
        title: 'Customer Records & Database Schemas',
        type: 'asset',
        icon: 'TableProperties',
        badge: 'MASS DATA EXFILTRATION',
        description: 'Relational tables, authentication records, customer PII, and financial transaction logs.',
        impactScope: 'Remote authentication brute force, direct SQL injection, database snapshot tampering.'
      };
      break;

    case 'STORAGE-001':
      sourceNode = {
        tier: 1,
        tierName: 'Internet / Source',
        title: 'Anonymous Public Internet Caller',
        type: 'source',
        icon: 'Globe',
        badge: 'UNAUTHENTICATED CLIENT',
        description: 'Any external party requesting object URIs without IAM identity credentials.',
        evidence: 'Unauthenticated public read/write requests'
      };
      controlNode = {
        tier: 2,
        tierName: 'Network or IAM Control',
        title: 'Storage Bucket Access Policy / Public ACL',
        type: 'control',
        icon: 'ShieldAlert',
        badge: 'PUBLIC ACCESS ALLOWED',
        description: 'Bucket has publicAccess enabled, bypassing IAM identity authorization checks.',
        evidence: evidence,
        defensiveCutoff: 'Set publicAccess: false to enforce authenticated IAM role access on all object operations.'
      };
      resourceNode = {
        tier: 3,
        tierName: 'Affected Resource',
        title: resourceName,
        type: 'resource',
        icon: 'FolderLock',
        badge: 'TARGET: STORAGE BUCKET',
        resourceType: resourceType,
        resourceId: finding.resourceId || resourceName,
        description: `Storage container / object bucket '${resourceName}'.`,
        evidence: `Bucket: ${resourceName}`
      };
      assetNode = {
        tier: 4,
        tierName: 'Potentially Affected Asset / Data',
        title: 'Customer Identity Files, Backups & Blobs',
        type: 'asset',
        icon: 'FileWarning',
        badge: 'PROPRIETARY DATA LEAK',
        description: 'Raw documents, customer identity verification records, application backups, and keys.',
        impactScope: 'Bulk object exfiltration, unauthorized file deletion, compliance violation.'
      };
      break;

    case 'STORAGE-002':
      sourceNode = {
        tier: 1,
        tierName: 'Internet / Source',
        title: 'Unauthorized Media Access / Snapshot Exfiltration',
        type: 'source',
        icon: 'HardDrive',
        badge: 'OFFLINE / DISK VECTOR',
        description: 'Adversary with disk snapshot access, backup disc access, or decommissioned media forensics.',
        evidence: 'Unencrypted storage volume'
      };
      controlNode = {
        tier: 2,
        tierName: 'Network or IAM Control',
        title: 'Storage At-Rest Encryption Policy',
        type: 'control',
        icon: 'ShieldAlert',
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
        badge: 'TARGET: STORAGE VOLUME',
        resourceType: resourceType,
        resourceId: finding.resourceId || resourceName,
        description: `Unencrypted storage bucket/volume '${resourceName}'.`,
        evidence: `Volume: ${resourceName}`
      };
      assetNode = {
        tier: 4,
        tierName: 'Potentially Affected Asset / Data',
        title: 'Plaintext Stored Files & Regulatory Compliance',
        type: 'asset',
        icon: 'FileText',
        badge: 'PLAINTEXT DISK EXPOSURE',
        description: 'All raw bytes stored on underlying physical disk media without cryptographic protection.',
        impactScope: 'Forensic extraction from raw snapshots, GDPR / HIPAA / PCI-DSS compliance audit failures.'
      };
      break;

    case 'IAM-001':
      sourceNode = {
        tier: 1,
        tierName: 'Internet / Source',
        title: 'Compromised Identity / Leaked API Credential',
        type: 'source',
        icon: 'UserX',
        badge: 'COMPROMISED CREDENTIAL',
        description: 'Adversary possessing valid API keys or executing code inside the overprivileged role.',
        evidence: 'Actor assumed role or hijacked token'
      };
      controlNode = {
        tier: 2,
        tierName: 'Network or IAM Control',
        title: 'IAM Policy Statement (Action: "*")',
        type: 'control',
        icon: 'ShieldAlert',
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
        badge: 'TARGET: IAM ROLE / POLICY',
        resourceType: resourceType,
        resourceId: finding.resourceId || resourceName,
        description: `IAM identity '${resourceName}' with excessive permission grants.`,
        evidence: `Policy: ${resourceName}`
      };
      assetNode = {
        tier: 4,
        tierName: 'Potentially Affected Asset / Data',
        title: 'Full Cloud Account Control & Tenant Plane',
        type: 'asset',
        icon: 'ShieldX',
        badge: 'ACCOUNT TAKEOVER',
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
    path: [sourceNode, controlNode, resourceNode, assetNode],
    defensiveCutoffSummary: controlNode.defensiveCutoff
  };
}
