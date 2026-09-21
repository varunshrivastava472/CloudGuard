const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
const app = require('../src/server');

describe('Phase 4: Scan API & Rule Endpoints Tests', () => {
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

  test('GET /api/rules returns 200 OK with all registered rules', async () => {
    const res = await fetch(`${baseUrl}/api/rules`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.count, 5);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.some(r => r.ruleId === 'STORAGE-001'));
  });

  test('GET /api/rules/:ruleId returns rule details', async () => {
    const res = await fetch(`${baseUrl}/api/rules/NETWORK-001`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.ruleId, 'NETWORK-001');
    assert.strictEqual(body.data.severity, 'CRITICAL');
  });

  test('GET /api/rules/:ruleId returns 404 for nonexistent rule', async () => {
    const res = await fetch(`${baseUrl}/api/rules/UNKNOWN-999`);
    assert.strictEqual(res.status, 404);

    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  test('POST /api/scans with JSON body scans vulnerable.json', async () => {
    const rawContent = fs.readFileSync(path.join(sampleDir, 'vulnerable.json'), 'utf-8');

    const res = await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'vulnerable.json',
        fileType: 'json',
        content: rawContent
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.scan.fileName, 'vulnerable.json');
    assert.strictEqual(body.data.scan.status, 'COMPLETED');
    assert.ok(body.data.scan.securityScore < 50);
    assert.ok(body.data.findings.length >= 5);
    assert.ok(body.data.resources.length === 4);
  });

  test('POST /api/scans with YAML body scans mixed.yaml', async () => {
    const rawContent = fs.readFileSync(path.join(sampleDir, 'mixed.yaml'), 'utf-8');

    const res = await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'mixed.yaml',
        fileType: 'yaml',
        content: rawContent
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.scan.fileType, 'yaml');
    assert.ok(body.data.findings.length > 0);
  });

  test('POST /api/scans with multipart/form-data upload', async () => {
    const rawContent = fs.readFileSync(path.join(sampleDir, 'secure.json'), 'utf-8');
    const boundary = '----CloudGuardTestBoundary' + Date.now();

    const bodyParts = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="secure.json"',
      'Content-Type: application/json',
      '',
      rawContent,
      `--${boundary}--`
    ];
    const multipartBody = bodyParts.join('\r\n');

    const res = await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: multipartBody
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.scan.fileName, 'secure.json');
    assert.strictEqual(body.data.scan.securityScore, 100);
    assert.strictEqual(body.data.findings.length, 0);
  });

  test('POST /api/scans returns 400 on empty submission', async () => {
    const res = await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('No configuration provided'));
  });

  test('POST /api/scans returns 400 on malformed syntax', async () => {
    const res = await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'bad.json',
        fileType: 'json',
        content: '{ broken json }'
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('JSON Syntax Error') || body.error.includes('JSON'));
  });
});
