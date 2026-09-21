const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
const app = require('../src/server');
const storageService = require('../src/services/storageService');

describe('Feature 3: Verified Remediation Report Tests', () => {
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
        fileName: 'vulnerable-audit.json',
        fileType: 'json',
        content: rawContent
      })
    });
    const body = await res.json();
    sampleScanId = body.data.scan.id || body.data.scan._id;
  });

  test('POST /api/scans/:id/fix includes complete verified remediation report in response', async () => {
    const fixRes = await fetch(`${baseUrl}/api/scans/${sampleScanId}/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoFixAll: true })
    });

    assert.strictEqual(fixRes.status, 200);
    const fixData = await fixRes.json();
    assert.strictEqual(fixData.success, true);
    assert.ok(fixData.data.remediationReport, 'Must contain remediationReport object');

    const report = fixData.data.remediationReport;

    // Verify required report attributes
    assert.ok(typeof report.initialScore === 'number');
    assert.ok(report.initialScore < 50);
    assert.strictEqual(report.finalScore, 100);
    assert.ok(report.scoreImprovement > 50);
    assert.ok(Array.isArray(report.findingsBefore));
    assert.ok(report.findingsBefore.length >= 5);
    assert.ok(Array.isArray(report.findingsResolved));
    assert.ok(report.findingsResolved.length >= 5);
    assert.strictEqual(report.findingsRemaining.length, 0);
    assert.ok(Array.isArray(report.remediationSummary));
    assert.ok(report.remediationSummary.length > 0);
    assert.strictEqual(report.verificationStatus, 'DETERMINISTIC_RESCAN_VERIFIED');
    assert.ok(report.timestamp);
  });

  test('GET /api/scans/:id/remediation-report returns verified report from remediated scan', async () => {
    // First apply fix
    const fixRes = await fetch(`${baseUrl}/api/scans/${sampleScanId}/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoFixAll: true })
    });
    const fixData = await fixRes.json();
    const remediatedScanId = fixData.data.scan.id || fixData.data.scan._id;

    // Fetch remediation report on the remediated scan
    const reportRes = await fetch(`${baseUrl}/api/scans/${remediatedScanId}/remediation-report`);
    assert.strictEqual(reportRes.status, 200);
    const reportData = await reportRes.json();
    assert.strictEqual(reportData.success, true);
    assert.strictEqual(reportData.data.finalScore, 100);
    assert.strictEqual(reportData.data.verificationStatus, 'DETERMINISTIC_RESCAN_VERIFIED');

    // Also fetch remediation report on parent scan (should link to child report)
    const parentReportRes = await fetch(`${baseUrl}/api/scans/${sampleScanId}/remediation-report`);
    assert.strictEqual(parentReportRes.status, 200);
    const parentReportData = await parentReportRes.json();
    assert.strictEqual(parentReportData.data.finalScore, 100);
  });

  test('GET /api/scans/:id/remediation-report returns baseline report for un-remediated scan', async () => {
    const reportRes = await fetch(`${baseUrl}/api/scans/${sampleScanId}/remediation-report`);
    assert.strictEqual(reportRes.status, 200);
    const reportData = await reportRes.json();
    assert.strictEqual(reportData.success, true);
    assert.strictEqual(reportData.data.verificationStatus, 'DETERMINISTIC_BASELINE');
    assert.ok(reportData.data.findingsRemaining.length >= 5);
  });
});
