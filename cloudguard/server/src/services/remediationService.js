const yaml = require('js-yaml');
const { parseConfig } = require('../scanner/parser');

const DB_PORTS = [3306, 5432, 27017, 1433, 1521, 6379, 9200];

/**
 * Applies security fix for a specific rule to a resource object in-place.
 */
function fixResourceByRule(resource, ruleId) {
  const changes = [];

  switch (ruleId) {
    case 'STORAGE-001':
      if (resource.publicAccess === true || resource.isPublic === true || resource.public === true) {
        resource.publicAccess = false;
        if ('isPublic' in resource) resource.isPublic = false;
        if ('public' in resource) resource.public = false;
        changes.push(`Disabled public access on '${resource.name || resource.id}'`);
      }
      break;

    case 'STORAGE-002':
      if (resource.encryptionEnabled === false || resource.encrypted === false || resource.encryption === false) {
        resource.encryptionEnabled = true;
        if ('encrypted' in resource) resource.encrypted = true;
        if ('encryption' in resource) resource.encryption = true;
        changes.push(`Enabled server-side encryption at rest on '${resource.name || resource.id}'`);
      }
      break;

    case 'NETWORK-001':
      if (resource.rules && Array.isArray(resource.rules)) {
        resource.rules.forEach((r) => {
          if (Number(r.port) === 22 && (r.source === '0.0.0.0/0' || r.source === 'any' || r.source === '*')) {
            r.source = '10.0.1.0/24';
            r.description = 'Restricted SSH access via internal bastion host';
            changes.push(`Restricted SSH port 22 source from 0.0.0.0/0 to 10.0.1.0/24 on '${resource.name || resource.id}'`);
          }
        });
      }
      if (Number(resource.port) === 22 && (resource.source === '0.0.0.0/0' || resource.source === 'any' || resource.source === '*')) {
        resource.source = '10.0.1.0/24';
        changes.push(`Restricted SSH port 22 source from 0.0.0.0/0 to 10.0.1.0/24 on '${resource.name || resource.id}'`);
      }
      break;

    case 'NETWORK-002':
      if (resource.rules && Array.isArray(resource.rules)) {
        resource.rules.forEach((r) => {
          const port = Number(r.port);
          if (DB_PORTS.includes(port) && (r.source === '0.0.0.0/0' || r.source === 'any' || r.source === '*')) {
            r.source = '10.0.2.0/24';
            r.description = 'Restricted database access to internal app tier subnet';
            changes.push(`Restricted database port ${port} source from 0.0.0.0/0 to 10.0.2.0/24 on '${resource.name || resource.id}'`);
          }
        });
      }
      if (DB_PORTS.includes(Number(resource.port)) && (resource.source === '0.0.0.0/0' || resource.source === 'any' || resource.source === '*')) {
        resource.source = '10.0.2.0/24';
        changes.push(`Restricted database port ${resource.port} source from 0.0.0.0/0 to 10.0.2.0/24 on '${resource.name || resource.id}'`);
      }
      if (resource.type === 'database' && resource.publicAccess === true) {
        resource.publicAccess = false;
        changes.push(`Disabled public access on database '${resource.name || resource.id}'`);
      }
      break;

    case 'IAM-001':
      if (resource.permissions && Array.isArray(resource.permissions)) {
        const hasWildcard = resource.permissions.some(p => String(p).trim() === '*' || String(p).trim() === '*:*');
        if (hasWildcard) {
          resource.permissions = [
            'storage:GetObject',
            'storage:ListBucket',
            'database:Query'
          ];
          changes.push(`Replaced wildcard '*' permissions with least-privilege actions on '${resource.name || resource.id}'`);
        }
      }
      break;

    default:
      break;
  }

  return changes;
}

/**
 * Applies fixes to raw configuration text (JSON or YAML).
 * 
 * @param {string} rawConfig - Original configuration string.
 * @param {Array<Object>|Object} findings - Finding(s) to remediate.
 * @returns {{ remediatedConfig: string, changesApplied: Array<string> }}
 */
function applyRemediation(rawConfig, findings, options = {}) {
  if (!rawConfig) {
    throw new Error('Raw configuration is required for remediation');
  }

  const { data, format } = parseConfig(rawConfig);
  const targetFindings = Array.isArray(findings) ? findings : [findings];
  const allChanges = [];

  // Deep clone data
  const clonedData = JSON.parse(JSON.stringify(data));

  // Determine resources list in parsed config
  let resources = [];
  if (Array.isArray(clonedData)) {
    resources = clonedData;
  } else if (Array.isArray(clonedData.resources)) {
    resources = clonedData.resources;
  } else {
    const candidateKeys = [
      'storage', 'buckets', 'bucket',
      'firewalls', 'firewall', 'security_groups', 'securityGroups', 'security_group',
      'iam', 'roles', 'role', 'policies', 'policy',
      'databases', 'database', 'dbs', 'db',
      'compute', 'instances', 'instance'
    ];
    for (const key of candidateKeys) {
      if (Array.isArray(clonedData[key])) {
        resources.push(...clonedData[key]);
      }
    }
  }

  const isAutoFixAll = options.autoFixAll === true || (options.autoFixAll === undefined && targetFindings.length >= 4);

  if (isAutoFixAll) {
    for (const res of resources) {
      ['STORAGE-001', 'STORAGE-002', 'NETWORK-001', 'NETWORK-002', 'IAM-001'].forEach(ruleId => {
        const changes = fixResourceByRule(res, ruleId);
        allChanges.push(...changes);
      });
    }
  } else {
    for (const finding of targetFindings) {
      const ruleId = finding.ruleId;
      const resourceName = finding.resource || finding.resourceId;

      for (const res of resources) {
        if (
          res.name === resourceName ||
          res.id === resourceName ||
          res.name === finding.resource ||
          res.id === finding.resourceId
        ) {
          // If resource has port, only match appropriate network rule
          if (finding.ruleId === 'NETWORK-001' && res.port !== undefined && Number(res.port) !== 22) continue;
          if (finding.ruleId === 'NETWORK-002' && res.port !== undefined && !DB_PORTS.includes(Number(res.port))) continue;

          const changes = fixResourceByRule(res, ruleId);
          allChanges.push(...changes);
        }
      }
    }
  }

  const uniqueChanges = [...new Set(allChanges)];

  // Serialize back to original format
  let remediatedConfig = '';
  if (format === 'yaml' || format === 'yml') {
    remediatedConfig = yaml.dump(clonedData, { indent: 2 });
  } else {
    remediatedConfig = JSON.stringify(clonedData, null, 2);
  }

  return {
    remediatedConfig,
    changesApplied: uniqueChanges
  };
}

module.exports = {
  applyRemediation,
  fixResourceByRule
};
