const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { parseConfig } = require('../src/scanner/parser');
const { normalizeConfig } = require('../src/scanner/normalizer');
const { evaluateConfig } = require('../src/scanner/engine');
const { getAllRules, getRuleById } = require('../src/scanner/rules');
const { calculateSecurityScore } = require('../src/scanner/severity');

const storage001 = require('../src/scanner/rules/storage001');
const storage002 = require('../src/scanner/rules/storage002');
const network001 = require('../src/scanner/rules/network001');
const network002 = require('../src/scanner/rules/network002');
const iam001 = require('../src/scanner/rules/iam001');

describe('Phase 3: Security Rule Engine & Severity Tests', () => {
  const sampleDir = path.resolve(__dirname, '../../sample-configs');

  test('Rules registry exports all 5 core rules', () => {
    const rules = getAllRules();
    assert.strictEqual(rules.length, 5);
    const ruleIds = rules.map(r => r.ruleId);
    assert.ok(ruleIds.includes('STORAGE-001'));
    assert.ok(ruleIds.includes('STORAGE-002'));
    assert.ok(ruleIds.includes('NETWORK-001'));
    assert.ok(ruleIds.includes('NETWORK-002'));
    assert.ok(ruleIds.includes('IAM-001'));

    const rule = getRuleById('STORAGE-001');
    assert.ok(rule);
    assert.strictEqual(rule.name, 'Publicly Accessible Storage');
  });

  test('STORAGE-001 detects public storage and ignores private storage', () => {
    const badRes = { type: 'storage', name: 'public-bucket', publicAccess: true };
    const goodRes = { type: 'storage', name: 'private-bucket', publicAccess: false };

    const badFindings = storage001.evaluate(badRes);
    assert.ok(badFindings);
    assert.strictEqual(badFindings.length, 1);
    assert.strictEqual(badFindings[0].ruleId, 'STORAGE-001');
    assert.strictEqual(badFindings[0].severity, 'CRITICAL');

    const goodFindings = storage001.evaluate(goodRes);
    assert.strictEqual(goodFindings, null);
  });

  test('STORAGE-002 detects unencrypted storage', () => {
    const badRes = { type: 'storage', name: 'unencrypted-bucket', encryptionEnabled: false };
    const goodRes = { type: 'storage', name: 'encrypted-bucket', encryptionEnabled: true };

    const badFindings = storage002.evaluate(badRes);
    assert.ok(badFindings);
    assert.strictEqual(badFindings.length, 1);
    assert.strictEqual(badFindings[0].ruleId, 'STORAGE-002');
    assert.strictEqual(badFindings[0].severity, 'HIGH');

    const goodFindings = storage002.evaluate(goodRes);
    assert.strictEqual(goodFindings, null);
  });

  test('NETWORK-001 detects SSH port 22 open to 0.0.0.0/0', () => {
    const badFw = {
      type: 'firewall',
      name: 'open-ssh-sg',
      rules: [{ port: 22, source: '0.0.0.0/0', action: 'allow' }]
    };
    const goodFw = {
      type: 'firewall',
      name: 'restricted-ssh-sg',
      rules: [{ port: 22, source: '192.168.1.0/24', action: 'allow' }]
    };

    const badFindings = network001.evaluate(badFw);
    assert.ok(badFindings);
    assert.strictEqual(badFindings.length, 1);
    assert.strictEqual(badFindings[0].ruleId, 'NETWORK-001');
    assert.strictEqual(badFindings[0].severity, 'CRITICAL');

    const goodFindings = network001.evaluate(goodFw);
    assert.strictEqual(goodFindings, null);
  });

  test('NETWORK-002 detects database ports (5432, 3306, 27017) open to 0.0.0.0/0', () => {
    const badDbFw = {
      type: 'firewall',
      name: 'open-db-sg',
      rules: [
        { port: 5432, source: '0.0.0.0/0', action: 'allow' },
        { port: 3306, source: '0.0.0.0/0', action: 'allow' }
      ]
    };
    const goodDbFw = {
      type: 'firewall',
      name: 'internal-db-sg',
      rules: [{ port: 5432, source: '10.0.2.0/24', action: 'allow' }]
    };

    const badFindings = network002.evaluate(badDbFw);
    assert.ok(badFindings);
    assert.strictEqual(badFindings.length, 2);
    assert.strictEqual(badFindings[0].ruleId, 'NETWORK-002');

    const goodFindings = network002.evaluate(goodDbFw);
    assert.strictEqual(goodFindings, null);
  });

  test('IAM-001 detects wildcard permission *', () => {
    const badIam = { type: 'iam', name: 'admin-role', permissions: ['*'] };
    const goodIam = { type: 'iam', name: 'read-only', permissions: ['storage:GetObject'] };

    const badFindings = iam001.evaluate(badIam);
    assert.ok(badFindings);
    assert.strictEqual(badFindings.length, 1);
    assert.strictEqual(badFindings[0].ruleId, 'IAM-001');
    assert.strictEqual(badFindings[0].severity, 'HIGH');

    const goodFindings = iam001.evaluate(goodIam);
    assert.strictEqual(goodFindings, null);
  });

  test('Security Score formula computes transparent penalties accurately', () => {
    const findings = [
      { severity: 'CRITICAL' }, // 20
      { severity: 'CRITICAL' }, // 20
      { severity: 'HIGH' },     // 10
      { severity: 'MEDIUM' },   // 5
      { severity: 'LOW' }       // 2
    ];
    // Total penalty: 20 + 20 + 10 + 5 + 2 = 57. Score: 100 - 57 = 43
    const result = calculateSecurityScore(findings);
    assert.strictEqual(result.totalPenalty, 57);
    assert.strictEqual(result.score, 43);
    assert.strictEqual(result.label, 'CloudGuard Security Score');
    assert.strictEqual(result.breakdown.CRITICAL, 2);
    assert.strictEqual(result.breakdown.HIGH, 1);
    assert.strictEqual(result.breakdown.MEDIUM, 1);
    assert.strictEqual(result.breakdown.LOW, 1);

    // Floor at 0
    const massiveFindings = Array(10).fill({ severity: 'CRITICAL' }); // 200 penalty
    const zeroResult = calculateSecurityScore(massiveFindings);
    assert.strictEqual(zeroResult.score, 0);
  });

  test('Evaluates vulnerable.json with full rule engine', () => {
    const raw = fs.readFileSync(path.join(sampleDir, 'vulnerable.json'), 'utf-8');
    const { data } = parseConfig(raw, 'json');
    const normalized = normalizeConfig(data);
    const result = evaluateConfig(normalized);

    assert.ok(result.findings.length >= 5);
    assert.strictEqual(result.summary.critical >= 3, true);
    assert.strictEqual(result.summary.high >= 2, true);
    assert.strictEqual(result.scoreLabel, 'CloudGuard Security Score');
    assert.ok(result.securityScore < 50);
  });

  test('Evaluates secure.json with perfect 100 security score', () => {
    const raw = fs.readFileSync(path.join(sampleDir, 'secure.json'), 'utf-8');
    const { data } = parseConfig(raw, 'json');
    const normalized = normalizeConfig(data);
    const result = evaluateConfig(normalized);

    assert.strictEqual(result.findings.length, 0);
    assert.strictEqual(result.securityScore, 100);
    assert.strictEqual(result.summary.critical, 0);
    assert.strictEqual(result.summary.high, 0);
  });

  test('Evaluates mixed.yaml correctly', () => {
    const raw = fs.readFileSync(path.join(sampleDir, 'mixed.yaml'), 'utf-8');
    const { data } = parseConfig(raw, 'yaml');
    const normalized = normalizeConfig(data);
    const result = evaluateConfig(normalized);

    assert.ok(result.findings.length > 0);
    // Public assets storage (STORAGE-001), Unencrypted audit logs (STORAGE-002), Exposed Mongo 27017 (NETWORK-002)
    const ruleIds = result.findings.map(f => f.ruleId);
    assert.ok(ruleIds.includes('STORAGE-001'));
    assert.ok(ruleIds.includes('STORAGE-002'));
    assert.ok(ruleIds.includes('NETWORK-002'));
    assert.ok(result.securityScore > 0 && result.securityScore < 100);
  });
});
