const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// Set test environment
process.env.NODE_ENV = 'test';
const app = require('../src/server');

describe('API Health Verification', () => {
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

  test('GET /api/health returns 200 OK with correct payload', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.deepStrictEqual(body, {
      success: true,
      message: 'CloudGuard API is running'
    });
  });

  test('GET /api/unknown-route returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/unknown-route`);
    assert.strictEqual(res.status, 404);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, 'Route /api/unknown-route not found');
  });
});
