/**
 * Normalizes any parsed configuration into CloudGuard's provider-neutral schema.
 * 
 * Standard Normalized Schema:
 * {
 *   provider: string,
 *   metadata: { totalResources: number, parsedAt: string },
 *   resources: [
 *     {
 *       id: string,
 *       name: string,
 *       type: 'storage' | 'firewall' | 'iam' | 'database' | 'compute' | 'other',
 *       provider: string,
 *       publicAccess?: boolean,
 *       encryptionEnabled?: boolean,
 *       rules?: Array<{ port: number|string, protocol?: string, source: string, action?: string }>,
 *       permissions?: Array<string>,
 *       tags?: Record<string, string>,
 *       raw: Object
 *     }
 *   ]
 * }
 */

function normalizeType(typeStr = '') {
  const type = String(typeStr).toLowerCase();
  if (type.includes('storage') || type.includes('bucket') || type.includes('s3') || type.includes('blob')) {
    return 'storage';
  }
  if (type.includes('firewall') || type.includes('security_group') || type.includes('securitygroup') || type.includes('network') || type.includes('nsg')) {
    return 'firewall';
  }
  if (type.includes('iam') || type.includes('role') || type.includes('policy') || type.includes('permission') || type.includes('user')) {
    return 'iam';
  }
  if (type.includes('database') || type.includes('db') || type.includes('rds') || type.includes('sql') || type.includes('mongo')) {
    return 'database';
  }
  if (type.includes('compute') || type.includes('instance') || type.includes('ec2') || type.includes('vm')) {
    return 'compute';
  }
  return type || 'other';
}

function normalizeBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === 'yes' || lower === 'enabled' || lower === '1') return true;
    if (lower === 'false' || lower === 'no' || lower === 'disabled' || lower === '0') return false;
  }
  return Boolean(value);
}

function normalizeRules(rules = []) {
  if (!Array.isArray(rules)) {
    if (typeof rules === 'object' && rules !== null) {
      rules = [rules];
    } else {
      return [];
    }
  }

  return rules.map((r, idx) => {
    let port = r.port ?? r.toPort ?? r.fromPort ?? r.destinationPort ?? null;
    if (typeof port === 'string' && !isNaN(Number(port))) {
      port = Number(port);
    }

    const source = r.source ?? r.cidr ?? r.cidrIp ?? r.cidrBlock ?? r.sourceIp ?? r.sourceAddressPrefix ?? '0.0.0.0/0';
    const protocol = r.protocol ?? r.ipProtocol ?? 'tcp';
    const action = r.action ?? (r.allow ? 'allow' : 'allow');

    return {
      id: r.id || `rule-${idx + 1}`,
      port,
      protocol: String(protocol).toLowerCase(),
      source: String(source),
      action: String(action).toLowerCase(),
      description: r.description || ''
    };
  });
}

function normalizePermissions(perms = []) {
  if (!Array.isArray(perms)) {
    if (typeof perms === 'string') {
      perms = [perms];
    } else if (typeof perms === 'object' && perms !== null) {
      perms = Object.values(perms);
    } else {
      return [];
    }
  }

  return perms.map((p) => {
    if (typeof p === 'string') return p;
    if (typeof p === 'object' && p !== null) {
      return p.action || p.permission || p.name || JSON.stringify(p);
    }
    return String(p);
  });
}

function normalizeResource(rawRes, index, defaultProvider) {
  if (!rawRes || typeof rawRes !== 'object') {
    return null;
  }

  const name = rawRes.name || rawRes.resourceName || rawRes.id || `resource-${index + 1}`;
  const type = normalizeType(rawRes.type || rawRes.resourceType || 'other');
  const id = rawRes.id || `${type}-${name}`.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();

  // Public access normalization
  let publicAccess = undefined;
  if ('publicAccess' in rawRes) {
    publicAccess = normalizeBoolean(rawRes.publicAccess);
  } else if ('isPublic' in rawRes) {
    publicAccess = normalizeBoolean(rawRes.isPublic);
  } else if ('public' in rawRes) {
    publicAccess = normalizeBoolean(rawRes.public);
  } else if (rawRes.accessControl === 'public-read' || rawRes.acl === 'public-read') {
    publicAccess = true;
  }

  // Encryption normalization
  let encryptionEnabled = undefined;
  if ('encryptionEnabled' in rawRes) {
    encryptionEnabled = normalizeBoolean(rawRes.encryptionEnabled);
  } else if ('encrypted' in rawRes) {
    encryptionEnabled = normalizeBoolean(rawRes.encrypted);
  } else if (rawRes.encryption && typeof rawRes.encryption === 'object') {
    encryptionEnabled = normalizeBoolean(rawRes.encryption.enabled ?? true);
  } else if ('encryption' in rawRes) {
    encryptionEnabled = normalizeBoolean(rawRes.encryption);
  }

  // Firewall / network rules normalization
  let rawRules = rawRes.rules || rawRes.firewallRules || rawRes.ingress || rawRes.securityRules;
  if (!rawRules && (rawRes.port !== undefined || rawRes.source !== undefined)) {
    rawRules = [rawRes];
  }
  const rules = normalizeRules(rawRules || []);

  // IAM / permission normalization
  const rawPerms = rawRes.permissions || rawRes.actions || rawRes.policyDocument?.Statement?.flatMap(s => s.Action) || [];
  const permissions = normalizePermissions(rawPerms);

  return {
    id,
    name,
    type,
    provider: rawRes.provider || defaultProvider,
    publicAccess,
    encryptionEnabled,
    rules,
    permissions,
    tags: rawRes.tags || {},
    raw: rawRes
  };
}

/**
 * Main normalization function.
 * 
 * @param {Object|Array} parsedData - Output from parser.
 * @returns {Object} Standardized normalized configuration.
 */
function normalizeConfig(parsedData) {
  if (!parsedData || typeof parsedData !== 'object') {
    throw new Error('Invalid input: Parsed configuration must be an object or array');
  }

  let defaultProvider = 'demo-cloud';
  let rawList = [];

  if (Array.isArray(parsedData)) {
    rawList = parsedData;
  } else if (Array.isArray(parsedData.resources)) {
    defaultProvider = parsedData.provider || defaultProvider;
    rawList = parsedData.resources;
  } else {
    defaultProvider = parsedData.provider || defaultProvider;

    // Check for resource collections (e.g. { storage: [...], firewalls: [...], firewall: [...] })
    const candidateKeys = [
      'storage', 'buckets', 'bucket',
      'firewalls', 'firewall', 'security_groups', 'securityGroups', 'security_group',
      'iam', 'roles', 'role', 'policies', 'policy',
      'databases', 'database', 'dbs', 'db',
      'compute', 'instances', 'instance'
    ];
    for (const key of candidateKeys) {
      if (Array.isArray(parsedData[key])) {
        const typeHint = normalizeType(key);
        parsedData[key].forEach(item => {
          if (item && typeof item === 'object') {
            rawList.push({ type: typeHint, ...item });
          }
        });
      }
    }

    // If still empty, check if top-level itself describes a single resource
    if (rawList.length === 0 && (parsedData.type || parsedData.name)) {
      rawList.push(parsedData);
    }
  }

  const normalizedResources = rawList
    .map((res, idx) => normalizeResource(res, idx, defaultProvider))
    .filter(Boolean);

  return {
    provider: defaultProvider,
    metadata: {
      totalResources: normalizedResources.length,
      normalizedAt: new Date().toISOString()
    },
    resources: normalizedResources
  };
}

module.exports = {
  normalizeConfig,
  normalizeType,
  normalizeRules,
  normalizePermissions
};
