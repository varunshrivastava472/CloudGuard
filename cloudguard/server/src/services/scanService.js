const { parseConfig } = require('../scanner/parser');
const { normalizeConfig } = require('../scanner/normalizer');
const { evaluateConfig } = require('../scanner/engine');

/**
 * Executes the complete scan pipeline:
 * Raw content -> Parser -> Normalizer -> Deterministic Rule Engine
 * 
 * @param {Object} options
 * @param {string|Buffer} options.content - File text or buffer
 * @param {string} [options.fileName] - Name of uploaded file
 * @param {string} [options.fileType] - Extension or format ('json' | 'yaml')
 * @returns {Object} Full scan report
 */
function runScan({ content, fileName = 'custom-config.json', fileType = '' }) {
  if (!content) {
    throw new Error('No configuration content provided to scan');
  }

  // 1. Parse raw text
  const parsed = parseConfig(content, fileType);

  // 2. Normalize to provider-neutral schema
  const normalized = normalizeConfig(parsed.data);

  // 3. Run deterministic security rules
  const engineResult = evaluateConfig(normalized);

  return {
    scan: {
      fileName,
      fileType: parsed.format,
      provider: engineResult.provider,
      status: 'COMPLETED',
      securityScore: engineResult.securityScore,
      scoreLabel: engineResult.scoreLabel,
      totalPenalty: engineResult.totalPenalty,
      summary: engineResult.summary,
      createdAt: engineResult.scannedAt
    },
    findings: engineResult.findings,
    resources: normalized.resources
  };
}

module.exports = {
  runScan
};
