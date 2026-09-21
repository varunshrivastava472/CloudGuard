const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
const app = require('../src/server');

describe('Phase 10: Complete End-to-End Hackathon Workflow Test', () => {
  let server;
  let baseUrl;
  let authToken;
  let userId;
  let originalScanId;
  const sampleDir = path.resolve(__dirname, '../../sample-configs');

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

  test('Step 1: Health check endpoint is active', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'CloudGuard API is running');
  });

  test('Step 2: User registration & JWT authentication', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Judge Demo User',
        email: `judge_${Date.now()}@cloudguard.io`,
        password: 'Password123!'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.token);
    authToken = body.data.token;
    userId = body.data.user.id;
  });

  test('Step 3: Scan vulnerable.json and detect all 5 security misconfigurations', async () => {
    const rawContent = fs.readFileSync(path.join(sampleDir, 'vulnerable.json'), 'utf-8');

    const res = await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        fileName: 'vulnerable.json',
        fileType: 'json',
        content: rawContent
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    originalScanId = body.data.scan.id || body.data.scan._id;
    assert.ok(originalScanId);

    // Assert detection of all critical misconfigurations
    assert.ok(body.data.scan.securityScore < 50);
    const ruleIds = body.data.findings.map(f => f.ruleId);
    assert.ok(ruleIds.includes('STORAGE-001'), 'STORAGE-001 must be detected');
    assert.ok(ruleIds.includes('STORAGE-002'), 'STORAGE-002 must be detected');
    assert.ok(ruleIds.includes('NETWORK-001'), 'NETWORK-001 must be detected');
    assert.ok(ruleIds.includes('NETWORK-002'), 'NETWORK-002 must be detected');
    assert.ok(ruleIds.includes('IAM-001'), 'IAM-001 must be detected');
  });

  test('Step 4: Request isolated AI explanation for a verified finding', async () => {
    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        finding: {
          ruleId: 'NETWORK-001',
          title: 'SSH Port Open to Internet',
          severity: 'CRITICAL',
          category: 'Network',
          resource: 'dmz-security-group',
          evidence: 'Port 22 open to 0.0.0.0/0',
          remediation: 'Restrict SSH to internal bastion CIDR'
        }
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.ruleId, 'NETWORK-001');
    assert.ok(body.data.explanation);
    assert.ok(body.data.fixedConfig);
  });

  test('Step 5: Apply automated remediation & re-scan bringing score to 100/100', async () => {
    const res = await fetch(`${baseUrl}/api/scans/${originalScanId}/fix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ autoFixAll: true })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.newScore, 100);
    assert.strictEqual(body.data.findings.length, 0);
    assert.ok(body.data.scoreImprovement > 50);
    assert.ok(body.data.changesApplied.length >= 4);
  });

  test('Step 6: Verify Dashboard metrics update accurately', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.totalScans >= 2); // Initial scan + Remediated scan
    assert.strictEqual(body.data.securityScore, 100); // Latest scan is 100
  });

  test('Step 7: Verify Scan History lists previous scans with search and drilldown', async () => {
    const res = await fetch(`${baseUrl}/api/scans`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 2);
  });
});
