const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
const app = require('../src/server');
const { applyRemediation } = require('../src/services/remediationService');
const { parseConfig } = require('../src/scanner/parser');
const { normalizeConfig } = require('../src/scanner/normalizer');
const { evaluateConfig } = require('../src/scanner/engine');

describe('Phase 9: Fix Preview & Re-scan Tests', () => {
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

  test('applyRemediation hardens individual findings in configuration', () => {
    const raw = fs.readFileSync(path.join(sampleDir, 'vulnerable.json'), 'utf-8');

    // Fix STORAGE-001
    const res1 = applyRemediation(raw, [{ ruleId: 'STORAGE-001', resource: 'customer-sensitive-data' }]);
    assert.ok(res1.remediatedConfig.includes('"publicAccess": false'));
    assert.ok(res1.changesApplied.length > 0);

    // Fix NETWORK-001
    const res2 = applyRemediation(raw, [{ ruleId: 'NETWORK-001', resource: 'dmz-security-group' }]);
    assert.ok(res2.remediatedConfig.includes('10.0.1.0/24'));

    // Fix IAM-001
    const res3 = applyRemediation(raw, [{ ruleId: 'IAM-001', resource: 'developer-overprivileged-role' }]);
    assert.ok(!res3.remediatedConfig.includes('"*"'));
  });

  test('Auto-remediate all brings vulnerable.json from low score to perfect 100 on re-scan', () => {
    const raw = fs.readFileSync(path.join(sampleDir, 'vulnerable.json'), 'utf-8');

    // Initial scan
    const initialParsed = parseConfig(raw, 'json');
    const initialNormalized = normalizeConfig(initialParsed.data);
    const initialResult = evaluateConfig(initialNormalized);
    assert.ok(initialResult.securityScore < 50);
    assert.ok(initialResult.findings.length >= 5);

    // Apply all fixes
    const { remediatedConfig, changesApplied } = applyRemediation(raw, initialResult.findings);
    assert.ok(changesApplied.length >= 4);

    // Re-scan remediated config
    const remediatedParsed = parseConfig(remediatedConfig, 'json');
    const remediatedNormalized = normalizeConfig(remediatedParsed.data);
    const remediatedResult = evaluateConfig(remediatedNormalized);

    assert.strictEqual(remediatedResult.securityScore, 100);
    assert.strictEqual(remediatedResult.findings.length, 0);
    assert.strictEqual(remediatedResult.summary.critical, 0);
    assert.strictEqual(remediatedResult.summary.high, 0);
  });

  test('POST /api/scans/:id/fix endpoint applies remediation and re-scans live', async () => {
    const raw = fs.readFileSync(path.join(sampleDir, 'vulnerable.json'), 'utf-8');

    // Step 1: Create initial scan
    const createRes = await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'vulnerable-cloud.json',
        content: raw
      })
    });
    const createData = await createRes.json();
    const scanId = createData.data.scan.id || createData.data.scan._id;
    const initialScore = createData.data.scan.securityScore;
    assert.ok(initialScore < 50);

    // Step 2: Auto-remediate and re-scan
    const fixRes = await fetch(`${baseUrl}/api/scans/${scanId}/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoFixAll: true })
    });

    assert.strictEqual(fixRes.status, 200);
    const fixData = await fixRes.json();
    assert.strictEqual(fixData.success, true);
    assert.strictEqual(fixData.data.originalScore, initialScore);
    assert.strictEqual(fixData.data.newScore, 100);
    assert.ok(fixData.data.scoreImprovement > 50);
    assert.strictEqual(fixData.data.findings.length, 0);
    assert.ok(fixData.data.changesApplied.length > 0);
  });
});
