const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

process.env.NODE_ENV = 'test';
const app = require('../src/server');
const storageService = require('../src/services/storageService');
const { verifyToken } = require('../src/services/authService');

describe('Phase 6: Authentication & JWT Security Tests', () => {
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

  beforeEach(() => {
    storageService.clearMemoryStore();
  });

  test('POST /api/auth/register creates user and returns valid JWT', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'SecOps Engineer',
        email: 'engineer@cloudguard.io',
        password: 'Password123!'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.token);
    assert.strictEqual(body.data.user.name, 'SecOps Engineer');
    assert.strictEqual(body.data.user.email, 'engineer@cloudguard.io');
    assert.strictEqual(body.data.user.role, 'user');
    assert.strictEqual(body.data.user.passwordHash, undefined); // Password hash must NEVER leak

    // Verify token validity
    const decoded = verifyToken(body.data.token);
    assert.strictEqual(decoded.email, 'engineer@cloudguard.io');
    assert.strictEqual(decoded.name, 'SecOps Engineer');
  });

  test('POST /api/auth/register rejects duplicate email address', async () => {
    // First registration
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User One',
        email: 'duplicate@cloudguard.io',
        password: 'Password123!'
      })
    });

    // Second registration with same email
    const duplicateRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User Two',
        email: 'duplicate@cloudguard.io',
        password: 'DifferentPassword123!'
      })
    });

    assert.strictEqual(duplicateRes.status, 400);
    const body = await duplicateRes.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('already exists'));
  });

  test('POST /api/auth/register rejects short password (< 6 chars)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User Short',
        email: 'short@cloudguard.io',
        password: '123'
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('at least 6 characters'));
  });

  test('POST /api/auth/login succeeds with correct credentials', async () => {
    // Register
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Login User',
        email: 'login@cloudguard.io',
        password: 'SecretPassword99!'
      })
    });

    // Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'login@cloudguard.io',
        password: 'SecretPassword99!'
      })
    });

    assert.strictEqual(loginRes.status, 200);
    const body = await loginRes.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.token);
    assert.strictEqual(body.data.user.email, 'login@cloudguard.io');
  });

  test('POST /api/auth/login rejects wrong password', async () => {
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Wrong Pwd User',
        email: 'wrongpwd@cloudguard.io',
        password: 'CorrectPassword123!'
      })
    });

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrongpwd@cloudguard.io',
        password: 'IncorrectPassword'
      })
    });

    assert.strictEqual(loginRes.status, 401);
    const body = await loginRes.json();
    assert.strictEqual(body.success, false);
  });

  test('GET /api/auth/me returns current user profile with valid Bearer token', async () => {
    // Register
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Auth Profile User',
        email: 'profile@cloudguard.io',
        password: 'SecretPassword123!'
      })
    });
    const regData = await regRes.json();
    const token = regData.data.token;

    // Call /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    assert.strictEqual(meRes.status, 200);
    const meBody = await meRes.json();
    assert.strictEqual(meBody.success, true);
    assert.strictEqual(meBody.data.name, 'Auth Profile User');
    assert.strictEqual(meBody.data.email, 'profile@cloudguard.io');
  });

  test('GET /api/auth/me returns 401 when token is missing or invalid', async () => {
    const noTokenRes = await fetch(`${baseUrl}/api/auth/me`);
    assert.strictEqual(noTokenRes.status, 401);

    const badTokenRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': 'Bearer invalid.fake.token' }
    });
    assert.strictEqual(badTokenRes.status, 401);
  });

  test('Authenticated user scan links userId to the saved scan', async () => {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Scanner Owner',
        email: 'scanner@cloudguard.io',
        password: 'Password123!'
      })
    });
    const { data } = await regRes.json();
    const token = data.token;
    const userId = data.user.id;

    // Execute scan with token
    const scanRes = await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fileName: 'owner-config.json',
        content: '{"provider": "demo-cloud", "resources": []}'
      })
    });

    assert.strictEqual(scanRes.status, 201);
    const scanBody = await scanRes.json();
    assert.strictEqual(String(scanBody.data.scan.userId), String(userId));
  });

  test('POST /api/auth/login rejects nonexistent email safely', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ghost.user@cloudguard.io',
        password: 'AnyPassword123!'
      })
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, 'Invalid email or password');
  });

  test('POST /api/auth/login rejects empty fields', async () => {
    const resEmpty = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' })
    });
    assert.strictEqual(resEmpty.status, 401);

    const resNoEmail = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'Password123!' })
    });
    assert.strictEqual(resNoEmail.status, 401);
  });

  test('POST /api/auth/register rejects missing fields', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: '', password: '' })
    });
    assert.strictEqual(res.status, 400);
  });

  test('User Isolation / IDOR: User B cannot access, read, simulate, or remediate User A private scan data', async () => {
    // 1. Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User A',
        email: 'usera@cloudguard.io',
        password: 'PasswordUserA1!'
      })
    });
    const { data: dataA } = await resA.json();
    const tokenA = dataA.token;

    // 2. User A creates private scan with findings
    const scanResA = await fetch(`${baseUrl}/api/scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        fileName: 'usera-infra.json',
        content: JSON.stringify({
          storage: [{ name: 'usera-bucket', public: true, encryption: false }]
        })
      })
    });
    assert.strictEqual(scanResA.status, 201);
    const scanDataA = await scanResA.json();
    const scanIdA = scanDataA.data.scan.id;
    const findingIdA = scanDataA.data.findings[0].id;

    // 3. Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User B',
        email: 'userb@cloudguard.io',
        password: 'PasswordUserB2!'
      })
    });
    const { data: dataB } = await resB.json();
    const tokenB = dataB.token;

    // 4. User B attempts to access User A's scan details -> 403 Forbidden
    const getScanRes = await fetch(`${baseUrl}/api/scans/${scanIdA}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(getScanRes.status, 403);

    // 5. User B attempts to access User A's scan findings -> 403 Forbidden
    const getFindingsRes = await fetch(`${baseUrl}/api/scans/${scanIdA}/findings`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(getFindingsRes.status, 403);

    // 6. User B attempts to trigger remediation on User A's scan -> 403 Forbidden
    const fixRes = await fetch(`${baseUrl}/api/scans/${scanIdA}/fix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ autoFixAll: true })
    });
    assert.strictEqual(fixRes.status, 403);

    // 7. User B attempts to simulate fixes on User A's scan -> 403 Forbidden
    const simRes = await fetch(`${baseUrl}/api/scans/${scanIdA}/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ autoFixAll: true })
    });
    assert.strictEqual(simRes.status, 403);

    // 8. User B attempts to get remediation report of User A's scan -> 403 Forbidden
    const reportRes = await fetch(`${baseUrl}/api/scans/${scanIdA}/remediation-report`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(reportRes.status, 403);

    // 9. User B attempts to access User A's finding directly -> 403 Forbidden
    const findingRes = await fetch(`${baseUrl}/api/findings/${findingIdA}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(findingRes.status, 403);

    // 10. User B attempts to update status of User A's finding -> 403 Forbidden
    const patchRes = await fetch(`${baseUrl}/api/findings/${findingIdA}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ status: 'RESOLVED' })
    });
    assert.strictEqual(patchRes.status, 403);

    // 11. User B lists scans -> Must NOT contain User A's scan
    const listResB = await fetch(`${baseUrl}/api/scans`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(listResB.status, 200);
    const listDataB = await listResB.json();
    assert.strictEqual(listDataB.data.some(s => String(s.id) === String(scanIdA)), false);

    // 12. Unauthenticated user lists scans -> Must NOT contain User A's scan
    const listResAnon = await fetch(`${baseUrl}/api/scans`);
    assert.strictEqual(listResAnon.status, 200);
    const listDataAnon = await listResAnon.json();
    assert.strictEqual(listDataAnon.data.some(s => String(s.id) === String(scanIdA)), false);

    // 13. Unauthenticated user attempts to get User A's scan -> 401 Unauthorized
    const unauthRes = await fetch(`${baseUrl}/api/scans/${scanIdA}`);
    assert.strictEqual(unauthRes.status, 401);
  });
});
