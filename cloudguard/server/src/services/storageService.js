const mongoose = require('mongoose');
const { isConnected } = require('../config/db');
const { Scan, Finding, Rule, User } = require('../models');

// In-Memory fallback store for tests / offline environments
const memoryStore = {
  scans: [],
  findings: [],
  users: [],
  rules: []
};

/**
 * Generates an ID (MongoDB ObjectId or fallback hex string)
 */
function generateId() {
  return new mongoose.Types.ObjectId().toString();
}

/**
 * Saves a completed scan and its findings.
 */
async function saveScan({ scan, findings = [], resources = [], userId = null, rawConfig = null, parentScanId = null, remediationReport = null }) {
  const scanId = generateId();

  const scanDoc = {
    _id: scanId,
    id: scanId,
    userId: userId || null,
    fileName: scan.fileName || 'configuration.json',
    fileType: scan.fileType || 'json',
    provider: scan.provider || 'demo-cloud',
    status: scan.status || 'COMPLETED',
    securityScore: scan.securityScore ?? 100,
    scoreLabel: scan.scoreLabel || 'CloudGuard Security Score',
    totalPenalty: scan.totalPenalty || 0,
    summary: scan.summary || {
      totalResources: resources.length,
      totalFindings: findings.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    resources: resources || [],
    rawConfig: rawConfig || null,
    parentScanId: parentScanId || scan.parentScanId || null,
    remediationReport: remediationReport || scan.remediationReport || null,
    createdAt: scan.createdAt ? new Date(scan.createdAt) : new Date()
  };

  const findingDocs = findings.map((f) => {
    const findingId = generateId();
    return {
      _id: findingId,
      id: findingId,
      scanId: scanId,
      ruleId: f.ruleId,
      title: f.title,
      severity: f.severity,
      category: f.category,
      resource: f.resource,
      resourceId: f.resourceId || '',
      resourceType: f.resourceType || '',
      evidence: f.evidence || '',
      description: f.description || '',
      impact: f.impact || '',
      remediation: f.remediation || '',
      status: f.status || 'OPEN',
      createdAt: f.createdAt ? new Date(f.createdAt) : new Date()
    };
  });

  if (isConnected()) {
    try {
      const savedScan = await Scan.create(scanDoc);
      let savedFindings = [];
      if (findingDocs.length > 0) {
        savedFindings = await Finding.insertMany(findingDocs);
      }
      return {
        scan: savedScan.toObject ? savedScan.toObject() : savedScan,
        findings: savedFindings.map(f => f.toObject ? f.toObject() : f)
      };
    } catch (err) {
      console.warn('MongoDB save error, falling back to memory store:', err.message);
    }
  }

  // Memory store fallback
  memoryStore.scans.unshift(scanDoc);
  findingDocs.forEach(f => memoryStore.findings.push(f));

  return {
    scan: scanDoc,
    findings: findingDocs
  };
}

/**
 * Retrieves scans list with optional filtering and pagination.
 */
async function getScans({ userId = null, limit = 50, skip = 0 } = {}) {
  if (isConnected()) {
    try {
      const query = userId ? { userId } : { $or: [{ userId: null }, { userId: { $exists: false } }] };
      const scans = await Scan.find(query)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean();
      return scans.map(s => ({ ...s, id: s._id.toString() }));
    } catch (err) {
      console.warn('MongoDB fetch error, falling back to memory store:', err.message);
    }
  }

  let results = [...memoryStore.scans];
  if (userId) {
    results = results.filter(s => String(s.userId) === String(userId));
  } else {
    results = results.filter(s => !s.userId);
  }
  return results.slice(skip, skip + limit);
}

/**
 * Retrieves a single scan by ID.
 */
async function getScanById(id) {
  if (isConnected()) {
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        const scan = await Scan.findById(id).lean();
        if (scan) return { ...scan, id: scan._id.toString() };
      }
    } catch (err) {
      console.warn('MongoDB fetch error, falling back to memory store:', err.message);
    }
  }

  return memoryStore.scans.find(s => String(s._id) === String(id) || String(s.id) === String(id)) || null;
}

/**
 * Retrieves findings for a given scan ID.
 */
async function getFindingsByScanId(scanId, { severity = null, category = null, status = null } = {}) {
  if (isConnected()) {
    try {
      const query = { scanId };
      if (severity) query.severity = severity.toUpperCase();
      if (category) query.category = category;
      if (status) query.status = status.toUpperCase();

      const findings = await Finding.find(query).sort({ createdAt: -1 }).lean();
      return findings.map(f => ({ ...f, id: f._id.toString() }));
    } catch (err) {
      console.warn('MongoDB fetch error, falling back to memory store:', err.message);
    }
  }

  return memoryStore.findings.filter(f => {
    if (String(f.scanId) !== String(scanId)) return false;
    if (severity && f.severity !== severity.toUpperCase()) return false;
    if (category && f.category.toLowerCase() !== category.toLowerCase()) return false;
    if (status && f.status !== status.toUpperCase()) return false;
    return true;
  });
}

/**
 * Retrieves a single finding by ID.
 */
async function getFindingById(id) {
  if (isConnected()) {
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        const finding = await Finding.findById(id).lean();
        if (finding) return { ...finding, id: finding._id.toString() };
      }
    } catch (err) {
      console.warn('MongoDB fetch error, falling back to memory store:', err.message);
    }
  }

  return memoryStore.findings.find(f => String(f._id) === String(id) || String(f.id) === String(id)) || null;
}

/**
 * Updates a finding's status (OPEN, RESOLVED, MUTED).
 */
async function updateFindingStatus(id, newStatus) {
  const normalizedStatus = String(newStatus).toUpperCase();
  if (!['OPEN', 'RESOLVED', 'MUTED'].includes(normalizedStatus)) {
    throw new Error('Invalid status. Permitted values: OPEN, RESOLVED, MUTED');
  }

  if (isConnected()) {
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        const updated = await Finding.findByIdAndUpdate(
          id,
          { status: normalizedStatus },
          { new: true }
        ).lean();
        if (updated) return { ...updated, id: updated._id.toString() };
      }
    } catch (err) {
      console.warn('MongoDB update error, falling back to memory store:', err.message);
    }
  }

  const finding = memoryStore.findings.find(f => String(f._id) === String(id) || String(f.id) === String(id));
  if (finding) {
    finding.status = normalizedStatus;
    return { ...finding };
  }
  return null;
}

/**
 * Creates a new user in the persistent store.
 */
async function createUser({ name, email, passwordHash, role = 'user' }) {
  const userId = generateId();
  const userDoc = {
    _id: userId,
    id: userId,
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    createdAt: new Date()
  };

  if (isConnected()) {
    try {
      const savedUser = await User.create(userDoc);
      return savedUser.toObject ? savedUser.toObject() : savedUser;
    } catch (err) {
      console.warn('MongoDB user create error, falling back to memory store:', err.message);
    }
  }

  memoryStore.users.push(userDoc);
  return userDoc;
}

/**
 * Finds user by email address.
 */
async function findUserByEmail(email) {
  const normalizedEmail = String(email).toLowerCase().trim();

  if (isConnected()) {
    try {
      const user = await User.findOne({ email: normalizedEmail }).lean();
      if (user) return { ...user, id: user._id.toString() };
    } catch (err) {
      console.warn('MongoDB findUserByEmail error, falling back to memory store:', err.message);
    }
  }

  return memoryStore.users.find(u => u.email === normalizedEmail) || null;
}

/**
 * Finds user by ID.
 */
async function findUserById(id) {
  if (isConnected()) {
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        const user = await User.findById(id).lean();
        if (user) return { ...user, id: user._id.toString() };
      }
    } catch (err) {
      console.warn('MongoDB findUserById error, falling back to memory store:', err.message);
    }
  }

  return memoryStore.users.find(u => String(u._id) === String(id) || String(u.id) === String(id)) || null;
}

/**
 * Aggregates dashboard metrics.
 */
async function getDashboardStats(userId = null) {
  const scans = await getScans({ userId, limit: 10 });
  const allScans = await getScans({ userId, limit: 1000 });

  let totalCritical = 0;
  let totalHigh = 0;
  let totalMedium = 0;
  let totalLow = 0;
  let totalScoreSum = 0;

  allScans.forEach(s => {
    if (s.summary) {
      totalCritical += s.summary.critical || 0;
      totalHigh += s.summary.high || 0;
      totalMedium += s.summary.medium || 0;
      totalLow += s.summary.low || 0;
    }
    totalScoreSum += (s.securityScore ?? 100);
  });

  const totalScans = allScans.length;
  const avgSecurityScore = totalScans > 0 ? Math.round(totalScoreSum / totalScans) : 100;
  const latestScore = scans.length > 0 ? scans[0].securityScore : 100;

  return {
    totalScans,
    securityScore: latestScore,
    averageSecurityScore: avgSecurityScore,
    findingsSummary: {
      critical: totalCritical,
      high: totalHigh,
      medium: totalMedium,
      low: totalLow,
      total: totalCritical + totalHigh + totalMedium + totalLow
    },
    recentScans: scans.slice(0, 5)
  };
}

/**
 * Clears memory store (used in test cleanups)
 */
function clearMemoryStore() {
  memoryStore.scans = [];
  memoryStore.findings = [];
  memoryStore.users = [];
  memoryStore.rules = [];
}

module.exports = {
  saveScan,
  getScans,
  getScanById,
  getFindingsByScanId,
  getFindingById,
  updateFindingStatus,
  createUser,
  findUserByEmail,
  findUserById,
  getDashboardStats,
  clearMemoryStore,
  generateId
};
