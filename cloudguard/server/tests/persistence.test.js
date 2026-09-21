const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
const app = require('../src/server');
const storageService = require('../src/services/storageService');
const { User, Scan, Finding, Rule } = require('../src/models');

describe('Phase 5: Persistence, Models, and Lifecycle API Tests', () => {
  let server;
  let baseUrl;
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

  beforeEach(() => {
    storageService.clearMemoryStore();
  });

  test('Mongoose models are registered with schemas', () => {
    assert.ok(User);
    assert.ok(Scan);
    assert.ok(Finding);
    assert.ok(Rule);
    assert.strictEqual(User.modelName, 'User');
    assert.strictEqual(Scan.modelName, 'Scan');
    assert.strictEqual(Finding.modelName, 'Finding');
    assert.strictEqual(Rule.modelName, 'Rule');
  });

  test('Full persistence lifecycle: create scan -> get scan -> list scans -> filter findings -> update status', async () => {
    const rawContent = fs.readFileSync(path.join(sampleDir, 'vulnerable.json'), 'utf-8');

    // 1. Create Scan
    const createRes = await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'vulnerable.json',
        fileType: 'json',
        content: rawContent
      })
    });
    assert.strictEqual(createRes.status, 201);
    const createdData = await createRes.json();
    const scanId = createdData.data.scan.id || createdData.data.scan._id;
    assert.ok(scanId);
    assert.ok(createdData.data.findings.length >= 5);

    // 2. Get Scan by ID
    const getScanRes = await fetch(`${baseUrl}/api/scans/${scanId}`);
    assert.strictEqual(getScanRes.status, 200);
    const scanDetail = await getScanRes.json();
    assert.strictEqual(scanDetail.success, true);
    assert.strictEqual(scanDetail.data.scan.fileName, 'vulnerable.json');
    assert.ok(Array.isArray(scanDetail.data.findings));

    // 3. List Scans
    const listScansRes = await fetch(`${baseUrl}/api/scans`);
    assert.strictEqual(listScansRes.status, 200);
    const scanList = await listScansRes.json();
    assert.strictEqual(scanList.success, true);
    assert.strictEqual(scanList.count, 1);

    // 4. Query Scan Findings with severity filter
    const critFindingsRes = await fetch(`${baseUrl}/api/scans/${scanId}/findings?severity=CRITICAL`);
    assert.strictEqual(critFindingsRes.status, 200);
    const critFindings = await critFindingsRes.json();
    assert.ok(critFindings.data.length >= 3);
    assert.ok(critFindings.data.every(f => f.severity === 'CRITICAL'));

    // 5. Update individual finding status
    const firstFinding = createdData.data.findings[0];
    const findingId = firstFinding.id || firstFinding._id;

    const patchRes = await fetch(`${baseUrl}/api/findings/${findingId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RESOLVED' })
    });
    assert.strictEqual(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.strictEqual(patchBody.data.status, 'RESOLVED');

    // Verify finding by ID
    const getFindingRes = await fetch(`${baseUrl}/api/findings/${findingId}`);
    assert.strictEqual(getFindingRes.status, 200);
    const findingDetail = await getFindingRes.json();
    assert.strictEqual(findingDetail.data.status, 'RESOLVED');
  });

  test('Dashboard metrics endpoint aggregates stats across multiple scans', async () => {
    const vulnContent = fs.readFileSync(path.join(sampleDir, 'vulnerable.json'), 'utf-8');
    const secureContent = fs.readFileSync(path.join(sampleDir, 'secure.json'), 'utf-8');

    // Create 2 scans
    await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'vulnerable.json', content: vulnContent })
    });

    await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'secure.json', content: secureContent })
    });

    // Check Dashboard API
    const dashRes = await fetch(`${baseUrl}/api/dashboard`);
    assert.strictEqual(dashRes.status, 200);
    const dashBody = await dashRes.json();
    assert.strictEqual(dashBody.success, true);
    assert.strictEqual(dashBody.data.totalScans, 2);
    assert.ok(dashBody.data.findingsSummary.critical >= 3);
    assert.ok(dashBody.data.recentScans.length === 2);
  });

  test('Rescan endpoint re-evaluates updated configuration', async () => {
    const vulnContent = fs.readFileSync(path.join(sampleDir, 'vulnerable.json'), 'utf-8');
    const secureContent = fs.readFileSync(path.join(sampleDir, 'secure.json'), 'utf-8');

    // Create initial vulnerable scan
    const createRes = await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'infra.json', content: vulnContent })
    });
    const { data } = await createRes.json();
    const scanId = data.scan.id || data.scan._id;

    // Rescan with fixed/secure configuration
    const rescanRes = await fetch(`${baseUrl}/api/scans/${scanId}/rescan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: secureContent })
    });

    assert.strictEqual(rescanRes.status, 201);
    const rescanData = await rescanRes.json();
    assert.strictEqual(rescanData.data.scan.securityScore, 100);
    assert.strictEqual(rescanData.data.findings.length, 0);
  });

  test('Rejects invalid status update with 400 Bad Request', async () => {
    const patchRes = await fetch(`${baseUrl}/api/findings/nonexistent-id/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INVALID_STATUS' })
    });

    assert.strictEqual(patchRes.status, 400);
  });
});
