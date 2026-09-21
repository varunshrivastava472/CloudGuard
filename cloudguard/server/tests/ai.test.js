const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

process.env.NODE_ENV = 'test';
const app = require('../src/server');
const { getFallbackRemediation } = require('../src/services/aiService');

describe('Phase 8: AI Remediation & Isolation Tests', () => {
  let server;
  let baseUrl;

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

  test('POST /api/ai/explain explains verified finding with remediation and fixed config', async () => {
    const finding = {
      ruleId: 'STORAGE-001',
      title: 'Publicly Accessible Storage',
      severity: 'CRITICAL',
      category: 'Storage',
      resource: 'customer-data-bucket',
      evidence: 'storage.publicAccess === true',
      description: 'Storage resource allows unrestricted public access.',
      impact: 'Sensitive data exposure on public internet.',
      remediation: 'Disable public access and enforce private ACLs.'
    };

    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finding })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.ruleId, 'STORAGE-001');
    assert.strictEqual(body.data.severity, 'CRITICAL');
    assert.ok(body.data.explanation);
    assert.ok(body.data.fixedConfig);
    assert.ok(body.data.fixedConfig.includes('publicAccess'));
  });

  test('POST /api/ai/explain provides correct remediation for all core rules in fallback mode', () => {
    const rules = ['STORAGE-001', 'STORAGE-002', 'NETWORK-001', 'NETWORK-002', 'IAM-001'];
    for (const r of rules) {
      const fallback = getFallbackRemediation({
        ruleId: r,
        title: `Rule ${r}`,
        severity: 'HIGH',
        resource: 'test-resource',
        evidence: 'test evidence'
      });
      assert.strictEqual(fallback.ruleId, r);
      assert.ok(fallback.fixedConfig);
    }
  });

  test('POST /api/ai/explain rejects empty finding with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  test('POST /api/ai/remediation responds to guidance prompt', async () => {
    const res = await fetch(`${baseUrl}/api/ai/remediation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'How do I secure an open SSH firewall rule?'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.explanation);
  });

  test('POST /api/ai/explain accepts a findingId and retrieves verified finding from storage', async () => {
    const storageService = require('../src/services/storageService');
    const saved = await storageService.saveScan({
      scan: {
        fileName: 'test-scan.json',
        fileType: 'json',
        provider: 'aws',
        status: 'COMPLETED',
        securityScore: 80
      },
      findings: [{
        ruleId: 'NETWORK-002',
        title: 'Database Port Open to Public Internet',
        severity: 'HIGH',
        category: 'Network',
        resource: 'db-security-group',
        evidence: 'port 5432 open to 0.0.0.0/0',
        description: 'PostgreSQL port open to public',
        impact: 'Direct brute-force and remote database exploitation',
        remediation: 'Restrict access to trusted application CIDR'
      }]
    });

    const createdFinding = saved.findings[0];
    const findingId = createdFinding.id || createdFinding._id.toString();

    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findingId })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.ruleId, 'NETWORK-002');
    assert.strictEqual(body.data.severity, 'HIGH');
    assert.strictEqual(body.data.resource, 'db-security-group');
    assert.ok(body.data.explanation);
    assert.ok(body.data.impact);
    assert.ok(body.data.remediation || body.data.fixGuidance);
  });

  test('POST /api/ai/explain returns 404 for unknown findingId', async () => {
    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findingId: 'nonexistent-finding-99999' })
    });

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  test('Architectural isolation: AI does not mutate finding severity or invent findings', async () => {
    const originalSeverity = 'CRITICAL';
    const finding = {
      ruleId: 'NETWORK-001',
      title: 'SSH Port Open to Internet',
      severity: originalSeverity,
      resource: 'dmz-sg',
      evidence: 'port 22 open to 0.0.0.0/0'
    };

    const res = await fetch(`${baseUrl}/api/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finding })
    });

    const body = await res.json();
    assert.strictEqual(body.data.severity, originalSeverity);
    assert.strictEqual(body.data.ruleId, 'NETWORK-001');
  });
});
