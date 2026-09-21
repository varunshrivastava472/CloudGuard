const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
const app = require('../src/server');
const storageService = require('../src/services/storageService');

describe('Feature 2: Security What-If Simulator Tests', () => {
  let server;
  let baseUrl;
  let sampleScanId;
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

  beforeEach(async () => {
    storageService.clearMemoryStore();
    const rawContent = fs.readFileSync(path.join(sampleDir, 'vulnerable.json'), 'utf-8');
    const res = await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'vulnerable-cloud.json',
        fileType: 'json',
        content: rawContent
      })
    });
    const body = await res.json();
    sampleScanId = body.data.scan.id || body.data.scan._id;
  });

  test('POST /api/scans/:id/simulate accurately predicts score improvement without mutating scan', async () => {
    // 1. Get current scan state before simulation
    const initialScan = await storageService.getScanById(sampleScanId);
    const initialScore = initialScan.securityScore;
    const initialFindings = await storageService.getFindingsByScanId(sampleScanId);
    assert.ok(initialScore < 50);

    // Pick 2 findings to simulate fixing: STORAGE-001 (CRITICAL, -20 pts) and NETWORK-001 (CRITICAL, -20 pts)
    const targetFindings = initialFindings.filter(f => f.ruleId === 'STORAGE-001' || f.ruleId === 'NETWORK-001');
    assert.strictEqual(targetFindings.length, 2);
    const targetIds = targetFindings.map(f => f.id || f._id);

    // 2. Run simulation
    const simRes = await fetch(`${baseUrl}/api/scans/${sampleScanId}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedFindingIds: targetIds
      })
    });

    assert.strictEqual(simRes.status, 200);
    const simData = await simRes.json();
    assert.strictEqual(simData.success, true);
    assert.strictEqual(simData.data.currentScore, initialScore);

    // Predicted score must be exactly initialScore + 40 (recovered 2 CRITICAL penalties of 20 pts each)
    assert.strictEqual(simData.data.predictedScore, initialScore + 40);
    assert.strictEqual(simData.data.scoreDelta, 40);

    // Verify disappeared findings
    assert.strictEqual(simData.data.disappearedCount, 2);
    const disappearedRuleIds = simData.data.findingsDisappeared.map(f => f.ruleId);
    assert.ok(disappearedRuleIds.includes('STORAGE-001'));
    assert.ok(disappearedRuleIds.includes('NETWORK-001'));

    // Verify remaining findings
    assert.strictEqual(simData.data.remainingCount, initialFindings.length - 2);

    // 3. CRITICAL GUARANTEE: Original scan in database MUST NOT BE MUTATED
    const postSimScan = await storageService.getScanById(sampleScanId);
    assert.strictEqual(postSimScan.securityScore, initialScore, 'Original scan score must remain untouched');
    const postSimFindings = await storageService.getFindingsByScanId(sampleScanId);
    assert.strictEqual(postSimFindings.length, initialFindings.length, 'Original findings count must remain untouched');
  });

  test('Simulate All Fixes predicts perfect 100 score and 0 remaining findings', async () => {
    const simRes = await fetch(`${baseUrl}/api/scans/${sampleScanId}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoFixAll: true })
    });

    assert.strictEqual(simRes.status, 200);
    const simData = await simRes.json();
    assert.strictEqual(simData.data.predictedScore, 100);
    assert.strictEqual(simData.data.remainingCount, 0);
    assert.ok(simData.data.disappearedCount >= 5);
    assert.strictEqual(simData.data.afterBreakdown.critical, 0);
    assert.strictEqual(simData.data.afterBreakdown.high, 0);
  });

  test('POST /api/scans/:id/simulate returns 404 for unknown scanId', async () => {
    const res = await fetch(`${baseUrl}/api/scans/nonexistent-id-9999/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoFixAll: true })
    });
    assert.strictEqual(res.status, 404);
  });
});
