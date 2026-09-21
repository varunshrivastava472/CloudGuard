const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

process.env.NODE_ENV = 'test';
const app = require('../src/server');
const storageService = require('../src/services/storageService');
const { runScan } = require('../src/services/scanService');
const { explainFinding } = require('../src/services/aiService');

describe('Comprehensive QA & Release Verification Suite', () => {
  let server;
  let baseUrl;

  const criticalConfig = fs.readFileSync(path.resolve(__dirname, '../../test-configs/qa-critical.json'), 'utf-8');
  const secureConfig = fs.readFileSync(path.resolve(__dirname, '../../test-configs/qa-secure.json'), 'utf-8');
  const mixedConfig = fs.readFileSync(path.resolve(__dirname, '../../test-configs/qa-mixed.json'), 'utf-8');

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    storageService.clearMemoryStore();
  });

  // =========================================================================
  // 1. AUTHENTICATION & TEMPORARY QA ACCOUNT LIFECYCLE
  // =========================================================================
  describe('1. Authentication Complete Lifecycle & QA Account', () => {
    const qaEmail = 'cloudguard.qa.test@example.com';
    const qaPassword = 'CloudGuardQA@2026!';
    const qaName = 'CloudGuard QA';

    test('A. Register QA user with valid information', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: qaName, email: qaEmail, password: qaPassword })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.token);
      assert.strictEqual(data.data.user.email, qaEmail.toLowerCase());
      assert.strictEqual(data.data.user.name, qaName);
      assert.strictEqual(data.data.user.passwordHash, undefined, 'Password hash must never leak in response');

      // Verify in store that password is NOT plaintext
      const stored = await storageService.findUserByEmail(qaEmail);
      assert.ok(stored.passwordHash);
      assert.notStrictEqual(stored.passwordHash, qaPassword, 'Password must be hashed, not plaintext');
    });

    test('B. Duplicate registration is gracefully rejected', async () => {
      await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: qaName, email: qaEmail, password: qaPassword })
      });

      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: qaName, email: qaEmail, password: qaPassword })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('already exists'));
    });

    test('C. Login with correct credentials succeeds', async () => {
      await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: qaName, email: qaEmail, password: qaPassword })
      });

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: qaEmail, password: qaPassword })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.data.token);
      assert.strictEqual(data.data.user.email, qaEmail.toLowerCase());
    });

    test('D. Login with wrong password is safe and rejected', async () => {
      await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: qaName, email: qaEmail, password: qaPassword })
      });

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: qaEmail, password: 'WrongPassword999!' })
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, 'Invalid email or password');
    });

    test('E. Protected routes deny access without valid token', async () => {
      const resMe = await fetch(`${baseUrl}/api/auth/me`);
      assert.strictEqual(resMe.status, 401);

      const resBadToken = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': 'Bearer forged.malicious.token' }
      });
      assert.strictEqual(resBadToken.status, 401);
    });
  });

  // =========================================================================
  // 2. PRIMARY SECURITY SCANNER TEST (qa-critical.json)
  // =========================================================================
  describe('2. Primary Security Scanner Tests (qa-critical.json)', () => {
    test('Detects all 5 critical/high/medium security misconfigurations', async () => {
      const result = runScan({
        content: criticalConfig,
        fileName: 'qa-critical.json',
        fileType: 'json'
      });

      assert.strictEqual(result.findings.length, 5, 'Must detect exactly 5 misconfigurations in qa-critical.json');

      const ruleIds = result.findings.map(f => f.ruleId).sort();
      assert.deepStrictEqual(ruleIds, [
        'IAM-001',
        'NETWORK-001',
        'NETWORK-002',
        'STORAGE-001',
        'STORAGE-002'
      ]);

      // Verify finding structure & fields
      for (const finding of result.findings) {
        assert.ok(finding.ruleId, 'Must have ruleId');
        assert.ok(finding.title, 'Must have title');
        assert.ok(finding.severity, 'Must have severity');
        assert.ok(finding.category, 'Must have category');
        assert.ok(finding.resource, 'Must have affected resource');
        assert.ok(finding.evidence, 'Must have evidence');
        assert.ok(finding.description, 'Must have description');
        assert.ok(finding.remediation, 'Must have remediation');
        assert.strictEqual(finding.status, 'OPEN');
      }

      // Verify specific rule details
      const storagePublic = result.findings.find(f => f.ruleId === 'STORAGE-001');
      assert.strictEqual(storagePublic.severity, 'CRITICAL');
      assert.strictEqual(storagePublic.resource, 'customer-data');

      const storageUnenc = result.findings.find(f => f.ruleId === 'STORAGE-002');
      assert.strictEqual(storageUnenc.severity, 'HIGH');
      assert.strictEqual(storageUnenc.resource, 'customer-data');

      const netSSH = result.findings.find(f => f.ruleId === 'NETWORK-001');
      assert.strictEqual(netSSH.severity, 'CRITICAL');
      assert.strictEqual(netSSH.resource, 'production-db');

      const netDB = result.findings.find(f => f.ruleId === 'NETWORK-002');
      assert.strictEqual(netDB.severity, 'CRITICAL');
      assert.strictEqual(netDB.resource, 'production-db');

      const iamWildcard = result.findings.find(f => f.ruleId === 'IAM-001');
      assert.strictEqual(iamWildcard.severity, 'HIGH');
      assert.strictEqual(iamWildcard.resource, 'admin-role');

      // Verify deterministic score formula: 100 - (20 [STORAGE-001] + 10 [STORAGE-002] + 20 [NETWORK-001] + 20 [NETWORK-002] + 10 [IAM-001]) = 20
      assert.strictEqual(result.scan.securityScore, 20);
      assert.strictEqual(result.scan.totalPenalty, 80);
    });
  });

  // =========================================================================
  // 3. SECURE CONFIGURATION TEST (qa-secure.json)
  // =========================================================================
  describe('3. Secure Configuration Tests (qa-secure.json)', () => {
    test('Zero false positives and 100/100 security score', async () => {
      const result = runScan({
        content: secureConfig,
        fileName: 'qa-secure.json',
        fileType: 'json'
      });

      assert.strictEqual(result.findings.length, 0, 'Secure configuration must have 0 findings');
      assert.strictEqual(result.scan.securityScore, 100, 'Secure configuration must achieve 100 score');
      assert.strictEqual(result.scan.totalPenalty, 0);
    });
  });

  // =========================================================================
  // 4. MIXED CONFIGURATION TEST (qa-mixed.json)
  // =========================================================================
  describe('4. Mixed Configuration Tests (qa-mixed.json)', () => {
    test('Detects only insecure portions while ignoring secure resources', async () => {
      const result = runScan({
        content: mixedConfig,
        fileName: 'qa-mixed.json',
        fileType: 'json'
      });

      // Findings expected:
      // 1. STORAGE-001 on 'public-backup' (public: true)
      // 2. IAM-001 on 'overprivileged-role' (permissions: ['*'])
      // NOT flagged:
      // - 'secure-bucket' (public: false, encryption: true)
      // - 'web-server' (port 443 is permitted web traffic)
      // - 'ssh-server' (port 22 has private CIDR 10.0.0.0/24)
      // - 'limited-role' (restricted permissions)

      assert.strictEqual(result.findings.length, 2);

      const flaggedResources = result.findings.map(f => f.resource).sort();
      assert.deepStrictEqual(flaggedResources, ['overprivileged-role', 'public-backup']);

      const publicBackupFinding = result.findings.find(f => f.resource === 'public-backup');
      assert.strictEqual(publicBackupFinding.ruleId, 'STORAGE-001');

      const iamRoleFinding = result.findings.find(f => f.resource === 'overprivileged-role');
      assert.strictEqual(iamRoleFinding.ruleId, 'IAM-001');

      // Security score: 100 - (20 [STORAGE-001] + 10 [IAM-001]) = 70
      assert.strictEqual(result.scan.securityScore, 70);
    });
  });

  // =========================================================================
  // 5. PARSER & UPLOAD ERROR HANDLING TESTS
  // =========================================================================
  describe('5. Parser & Upload Edge Cases', () => {
    test('Rejects malformed JSON with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'broken.json',
          content: '{"storage": [{"name": "broken", invalid_syntax}'
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Syntax Error') || data.message.includes('Invalid'));
    });

    test('Rejects malformed YAML with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'broken.yaml',
          content: 'storage:\n  - name: test\n    public: [unbalanced'
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('Rejects empty submission with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      assert.strictEqual(res.status, 400);
    });
  });

  // =========================================================================
  // 6. QUICK FIX ON THREE DIFFERENT FINDING TYPES
  // =========================================================================
  describe('6. Quick Fix on Multiple Finding Types', () => {
    test('Quick Fix on Database Exposure (NETWORK-002)', async () => {
      // Create initial scan
      const scanRes = await fetch(`${baseUrl}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'db-test.json',
          content: criticalConfig
        })
      });
      const scanData = await scanRes.json();
      const scanId = scanData.data.scan.id;
      const dbFinding = scanData.data.findings.find(f => f.ruleId === 'NETWORK-002');

      // Fix NETWORK-002 only
      const fixRes = await fetch(`${baseUrl}/api/scans/${scanId}/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findingId: dbFinding.id })
      });

      assert.strictEqual(fixRes.status, 200);
      const fixData = await fixRes.json();
      assert.ok(fixData.data.newScore > fixData.data.originalScore);
      assert.ok(!fixData.data.findings.some(f => f.ruleId === 'NETWORK-002'));
    });

    test('Quick Fix on Wildcard IAM (IAM-001)', async () => {
      const scanRes = await fetch(`${baseUrl}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'iam-test.json',
          content: criticalConfig
        })
      });
      const scanData = await scanRes.json();
      const scanId = scanData.data.scan.id;
      const iamFinding = scanData.data.findings.find(f => f.ruleId === 'IAM-001');

      const fixRes = await fetch(`${baseUrl}/api/scans/${scanId}/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findingId: iamFinding.id })
      });

      assert.strictEqual(fixRes.status, 200);
      const fixData = await fixRes.json();
      assert.ok(fixData.data.newScore > fixData.data.originalScore);
      assert.ok(!fixData.data.findings.some(f => f.ruleId === 'IAM-001'));
    });

    test('Quick Fix on Public Storage (STORAGE-001)', async () => {
      const scanRes = await fetch(`${baseUrl}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'storage-test.json',
          content: criticalConfig
        })
      });
      const scanData = await scanRes.json();
      const scanId = scanData.data.scan.id;
      const storageFinding = scanData.data.findings.find(f => f.ruleId === 'STORAGE-001');

      const fixRes = await fetch(`${baseUrl}/api/scans/${scanId}/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findingId: storageFinding.id })
      });

      assert.strictEqual(fixRes.status, 200);
      const fixData = await fixRes.json();
      assert.ok(fixData.data.newScore > fixData.data.originalScore);
      assert.ok(!fixData.data.findings.some(f => f.ruleId === 'STORAGE-001'));
    });
  });

  // =========================================================================
  // 7. FULL REMEDIATION WORKFLOW (Score 10 -> Auto-Fix All -> Score 100)
  // =========================================================================
  describe('7. Full Remediation Workflow', () => {
    test('Remediates all findings, achieves perfect 100 score, and generates verified report', async () => {
      const scanRes = await fetch(`${baseUrl}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'qa-critical.json',
          content: criticalConfig
        })
      });
      const { data: initialData } = await scanRes.json();
      assert.strictEqual(initialData.scan.securityScore, 20);
      assert.strictEqual(initialData.findings.length, 5);

      // Auto-remediate all
      const fixRes = await fetch(`${baseUrl}/api/scans/${initialData.scan.id}/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoFixAll: true })
      });

      assert.strictEqual(fixRes.status, 200);
      const fixData = await fixRes.json();
      assert.strictEqual(fixData.data.newScore, 100);
      assert.strictEqual(fixData.data.findings.length, 0);
      assert.strictEqual(fixData.data.remediationReport.verificationStatus, 'DETERMINISTIC_RESCAN_VERIFIED');
      assert.strictEqual(fixData.data.remediationReport.findingsResolved.length, 5);
      assert.strictEqual(fixData.data.remediationReport.findingsRemaining.length, 0);
    });
  });

  // =========================================================================
  // 8. GEMINI AI RESILIENCE & FALLBACK TEST
  // =========================================================================
  describe('8. Gemini AI Architecture & Fallback Resilience', () => {
    test('Provides structured explanation even when Gemini API is unavailable/exhausted', async () => {
      const finding = {
        ruleId: 'NETWORK-001',
        title: 'SSH Port (22) Exposed to 0.0.0.0/0',
        severity: 'CRITICAL',
        category: 'Network Security',
        resource: 'production-db',
        evidence: 'port: 22, source: 0.0.0.0/0',
        remediation: 'Restrict SSH ingress to authorized bastion host'
      };

      const explanation = await explainFinding(finding);
      assert.ok(explanation.explanation, 'Must contain explanation');
      assert.ok(explanation.impact, 'Must contain impact');
      assert.ok(explanation.remediation, 'Must contain remediation guidance');
      assert.ok(explanation.fixedConfig, 'Must contain fixedConfig');

      // Verify AI never touches the deterministic finding severity
      assert.strictEqual(finding.severity, 'CRITICAL');
    });
  });

  // =========================================================================
  // 9. RULES CATALOG VERIFICATION
  // =========================================================================
  describe('9. Rules Catalog Verification', () => {
    test('GET /api/rules returns all 5 registered rules with valid metadata', async () => {
      const res = await fetch(`${baseUrl}/api/rules`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.length, 5);

      const rulesMap = Object.fromEntries(data.data.map(r => [r.ruleId, r]));
      assert.ok(rulesMap['STORAGE-001']);
      assert.ok(rulesMap['STORAGE-002']);
      assert.ok(rulesMap['NETWORK-001']);
      assert.ok(rulesMap['NETWORK-002']);
      assert.ok(rulesMap['IAM-001']);

      assert.strictEqual(rulesMap['NETWORK-001'].severity, 'CRITICAL');
      assert.strictEqual(rulesMap['STORAGE-001'].severity, 'CRITICAL');
      assert.strictEqual(rulesMap['STORAGE-002'].severity, 'HIGH');
    });
  });

  // =========================================================================
  // 10. DASHBOARD CONSISTENCY TEST
  // =========================================================================
  describe('10. Dashboard Consistency', () => {
    test('Dashboard reflects actual scan counts and security scores', async () => {
      // Submit one scan
      await fetch(`${baseUrl}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'dash-test.json',
          content: criticalConfig
        })
      });

      const dashRes = await fetch(`${baseUrl}/api/dashboard`);
      assert.strictEqual(dashRes.status, 200);
      const dashData = await dashRes.json();
      assert.strictEqual(dashData.success, true);
      assert.ok(dashData.data.totalScans >= 1);
      assert.ok(dashData.data.findingsSummary.total >= 5);
      assert.strictEqual(dashData.data.securityScore, 20);
    });
  });
});
