const yaml = require('js-yaml');

/**
 * Parses raw configuration text in JSON or YAML format.
 * 
 * @param {string|Buffer} content - Raw file content string or buffer.
 * @param {string} [fileType] - Optional hint: 'json', 'yaml', 'yml'.
 * @returns {{ success: boolean, data: Object, format: string }} Parsed object and format.
 * @throws {Error} Detailed syntax or parsing error.
 */
function parseConfig(content, fileType = '') {
  if (content === null || content === undefined) {
    throw new Error('Configuration content is required');
  }

  const rawString = typeof content === 'string' ? content : content.toString('utf-8');
  const trimmed = rawString.trim();

  if (!trimmed) {
    throw new Error('Configuration file is empty');
  }

  const normalizedType = fileType ? fileType.toLowerCase().replace(/^\./, '') : '';

  // Determine format
  let isJson = normalizedType === 'json' || (normalizedType === '' && (trimmed.startsWith('{') || trimmed.startsWith('[')));

  if (isJson) {
    try {
      const data = JSON.parse(trimmed);
      return {
        success: true,
        data,
        format: 'json'
      };
    } catch (jsonErr) {
      // If explicit json type was given, fail immediately with JSON syntax error
      if (normalizedType === 'json') {
        throw new Error(`JSON Syntax Error: ${jsonErr.message}`);
      }
      // If auto-detecting, try YAML as fallback
      try {
        const yamlData = yaml.load(trimmed);
        if (typeof yamlData === 'object' && yamlData !== null) {
          return {
            success: true,
            data: yamlData,
            format: 'yaml'
          };
        }
      } catch {
        // Fall back to original JSON error
      }
      throw new Error(`Invalid JSON syntax: ${jsonErr.message}`);
    }
  }

  // Parse as YAML
  try {
    const data = yaml.load(trimmed);
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('YAML content did not parse into a valid configuration object or array');
    }
    return {
      success: true,
      data,
      format: normalizedType.includes('yml') || normalizedType.includes('yaml') ? normalizedType : 'yaml'
    };
  } catch (yamlErr) {
    throw new Error(`YAML Syntax Error: ${yamlErr.message}`);
  }
}

module.exports = {
  parseConfig
};
