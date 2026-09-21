const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { parseConfig } = require('../src/scanner/parser');
const { normalizeConfig } = require('../src/scanner/normalizer');

describe('Phase 2: Configuration Parser & Normalizer Tests', () => {
  const sampleDir = path.resolve(__dirname, '../../sample-configs');

  test('Parses valid JSON configuration', () => {
    const raw = fs.readFileSync(path.join(sampleDir, 'vulnerable.json'), 'utf-8');
    const parsed = parseConfig(raw, 'json');
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.format, 'json');
    assert.ok(Array.isArray(parsed.data.resources));
    assert.strictEqual(parsed.data.resources.length, 4);
  });

  test('Parses valid YAML configuration', () => {
    const raw = fs.readFileSync(path.join(sampleDir, 'mixed.yaml'), 'utf-8');
    const parsed = parseConfig(raw, 'yaml');
    assert.strictEqual(parsed.success, true);
    assert.ok(parsed.format.includes('yaml') || parsed.format.includes('yml'));
    assert.ok(Array.isArray(parsed.data.resources));
    assert.strictEqual(parsed.data.resources.length, 4);
  });

  test('Auto-detects JSON without explicit fileType', () => {
    const jsonStr = '{"provider": "demo-cloud", "resources": []}';
    const parsed = parseConfig(jsonStr);
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.format, 'json');
    assert.strictEqual(parsed.data.provider, 'demo-cloud');
  });

  test('Throws clean error on malformed JSON', () => {
    const badJson = '{"provider": "demo-cloud", resources: [}';
    assert.throws(() => {
      parseConfig(badJson, 'json');
    }, /JSON Syntax Error/i);
  });

  test('Throws clean error on malformed YAML', () => {
    const badYaml = 'provider: demo\nresources:\n  - name: test\n  bad: : :';
    assert.throws(() => {
      parseConfig(badYaml, 'yaml');
    }, /YAML Syntax Error/i);
  });

  test('Throws clean error on empty configuration', () => {
    assert.throws(() => {
      parseConfig('');
    }, /Configuration file is empty/i);

    assert.throws(() => {
      parseConfig(null);
    }, /Configuration content is required/i);
  });

  test('Normalizes vulnerable.json into standard schema', () => {
    const raw = fs.readFileSync(path.join(sampleDir, 'vulnerable.json'), 'utf-8');
    const { data } = parseConfig(raw, 'json');
    const normalized = normalizeConfig(data);

    assert.strictEqual(normalized.provider, 'demo-cloud');
    assert.strictEqual(normalized.metadata.totalResources, 4);
    assert.ok(Array.isArray(normalized.resources));

    const storageRes = normalized.resources.find(r => r.type === 'storage');
    assert.ok(storageRes);
    assert.strictEqual(storageRes.publicAccess, true);
    assert.strictEqual(storageRes.encryptionEnabled, false);

    const firewallRes = normalized.resources.find(r => r.type === 'firewall');
    assert.ok(firewallRes);
    assert.strictEqual(firewallRes.rules.length, 2);
    assert.strictEqual(firewallRes.rules[0].port, 22);
    assert.strictEqual(firewallRes.rules[0].source, '0.0.0.0/0');
    assert.strictEqual(firewallRes.rules[1].port, 5432);

    const iamRes = normalized.resources.find(r => r.type === 'iam');
    assert.ok(iamRes);
    assert.deepStrictEqual(iamRes.permissions, ['*']);
  });

  test('Normalizes secure.json into standard schema', () => {
    const raw = fs.readFileSync(path.join(sampleDir, 'secure.json'), 'utf-8');
    const { data } = parseConfig(raw, 'json');
    const normalized = normalizeConfig(data);

    assert.strictEqual(normalized.metadata.totalResources, 4);

    const storageRes = normalized.resources.find(r => r.type === 'storage');
    assert.ok(storageRes);
    assert.strictEqual(storageRes.publicAccess, false);
    assert.strictEqual(storageRes.encryptionEnabled, true);

    const firewallRes = normalized.resources.find(r => r.type === 'firewall');
    assert.ok(firewallRes);
    assert.strictEqual(firewallRes.rules[0].source, '10.0.1.0/24');

    const iamRes = normalized.resources.find(r => r.type === 'iam');
    assert.ok(iamRes);
    assert.ok(!iamRes.permissions.includes('*'));
  });

  test('Normalizes mixed.yaml into standard schema', () => {
    const raw = fs.readFileSync(path.join(sampleDir, 'mixed.yaml'), 'utf-8');
    const { data } = parseConfig(raw, 'yaml');
    const normalized = normalizeConfig(data);

    assert.strictEqual(normalized.metadata.totalResources, 4);
    const mongoFw = normalized.resources.find(r => r.type === 'firewall');
    assert.ok(mongoFw);
    const mongoRule = mongoFw.rules.find(r => r.port === 27017);
    assert.ok(mongoRule);
    assert.strictEqual(mongoRule.source, '0.0.0.0/0');
  });

  test('Normalizes alternate flexible formats and attributes', () => {
    const customConfig = {
      provider: 'custom-aws',
      buckets: [
        { name: 'my-bucket', isPublic: 'true', encrypted: 'false' }
      ],
      securityGroups: [
        { name: 'web-sec', ingress: [{ cidrIp: '0.0.0.0/0', toPort: '22', ipProtocol: 'tcp' }] }
      ]
    };

    const normalized = normalizeConfig(customConfig);
    assert.strictEqual(normalized.provider, 'custom-aws');
    assert.strictEqual(normalized.metadata.totalResources, 2);

    const bucket = normalized.resources.find(r => r.type === 'storage');
    assert.strictEqual(bucket.publicAccess, true);
    assert.strictEqual(bucket.encryptionEnabled, false);

    const sg = normalized.resources.find(r => r.type === 'firewall');
    assert.strictEqual(sg.rules[0].port, 22);
    assert.strictEqual(sg.rules[0].source, '0.0.0.0/0');
  });
});
