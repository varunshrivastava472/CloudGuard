const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
const app = require('../src/server');
const { generateAttackPath } = require('../src/services/attackPathService');
const storageService = require('../src/services/storageService');

describe('Feature 1: Security Impact / Attack-Path Visualizer Tests', () => {
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

  test('generateAttackPath generates exact 4-tier chain for NETWORK-001 (SSH open)', () => {
    const finding = {
      ruleId: 'NETWORK-001',
      title: 'SSH Port Open to Internet',
      severity: 'CRITICAL',
      category: 'Network',
      resource: 'dmz-security-group',
      evidence: 'Firewall rule allows port 22 from source 0.0.0.0/0'
    };

    const result = generateAttackPath(finding);
    assert.strictEqual(result.ruleId, 'NETWORK-001');
    assert.strictEqual(result.path.length, 4, 'Must have exactly 4 tiers');

    const [t1, t2, t3, t4] = result.path;

    // Tier 1: Internet / Source
    assert.strictEqual(t1.tier, 1);
    assert.strictEqual(t1.tierName, 'Internet / Source');
    assert.ok(t1.title.includes('0.0.0.0/0'));
    assert.strictEqual(t1.type, 'source');

    // Tier 2: Network or IAM Control
    assert.strictEqual(t2.tier, 2);
    assert.strictEqual(t2.tierName, 'Network or IAM Control');
    assert.ok(t2.title.includes('Port 22') || t2.title.includes('Security Group'));
    assert.strictEqual(t2.type, 'control');
    assert.ok(t2.defensiveCutoff, 'Must describe defensive cutoff point');

    // Tier 3: Affected Resource
    assert.strictEqual(t3.tier, 3);
    assert.strictEqual(t3.tierName, 'Affected Resource');
    assert.strictEqual(t3.title, 'dmz-security-group');
    assert.strictEqual(t3.type, 'resource');

    // Tier 4: Potentially Affected Asset / Data
    assert.strictEqual(t4.tier, 4);
    assert.strictEqual(t4.tierName, 'Potentially Affected Asset / Data');
    assert.strictEqual(t4.type, 'asset');
    assert.ok(t4.description.length > 0);
  });

  test('generateAttackPath generates valid 4-tier chain for all 5 core rules', () => {
    const rulesToTest = [
      { ruleId: 'NETWORK-001', resource: 'firewall-1' },
      { ruleId: 'NETWORK-002', resource: 'database-1' },
      { ruleId: 'STORAGE-001', resource: 's3-bucket-1' },
      { ruleId: 'STORAGE-002', resource: 's3-bucket-2' },
      { ruleId: 'IAM-001', resource: 'admin-role' }
    ];

    for (const item of rulesToTest) {
      const ap = generateAttackPath({
        ruleId: item.ruleId,
        title: `Test Title for ${item.ruleId}`,
        severity: 'HIGH',
        resource: item.resource,
        evidence: 'Sample configuration evidence'
      });

      assert.strictEqual(ap.path.length, 4);
      assert.strictEqual(ap.path[0].tier, 1);
      assert.strictEqual(ap.path[1].tier, 2);
      assert.strictEqual(ap.path[2].tier, 3);
      assert.strictEqual(ap.path[3].tier, 4);
      assert.ok(ap.defensiveCutoffSummary, `Defensive cutoff summary missing for ${item.ruleId}`);
    }
  });

  test('GET /api/findings/:id/attack-path returns defensive 4-tier flow over HTTP', async () => {
    // Create a finding in storage
    const saved = await storageService.saveScan({
      scan: {
        fileName: 'cloud-test.json',
        fileType: 'json',
        securityScore: 80
      },
      findings: [{
        ruleId: 'STORAGE-001',
        title: 'Publicly Accessible Storage',
        severity: 'CRITICAL',
        category: 'Storage',
        resource: 'customer-data-bucket',
        evidence: 'storage.publicAccess === true'
      }]
    });

    const findingId = saved.findings[0].id || saved.findings[0]._id;

    const res = await fetch(`${baseUrl}/api/findings/${findingId}/attack-path`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.ruleId, 'STORAGE-001');
    assert.strictEqual(body.data.path.length, 4);
    assert.strictEqual(body.data.path[0].tierName, 'Internet / Source');
    assert.strictEqual(body.data.path[1].tierName, 'Network or IAM Control');
    assert.strictEqual(body.data.path[2].tierName, 'Affected Resource');
    assert.strictEqual(body.data.path[3].tierName, 'Potentially Affected Asset / Data');
  });

  test('GET /api/findings/:id/attack-path returns 404 for non-existent finding', async () => {
    const res = await fetch(`${baseUrl}/api/findings/nonexistent-finding-9999/attack-path`);
    assert.strictEqual(res.status, 404);
  });
});
