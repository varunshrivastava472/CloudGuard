const storage001 = require('./storage001');
const storage002 = require('./storage002');
const network001 = require('./network001');
const network002 = require('./network002');
const iam001 = require('./iam001');

const allRules = [
  storage001,
  storage002,
  network001,
  network002,
  iam001
];

/**
 * Returns all registered rules.
 * @returns {Array<Object>}
 */
function getAllRules() {
  return [...allRules];
}

/**
 * Returns all currently enabled rules.
 * @returns {Array<Object>}
 */
function getEnabledRules() {
  return allRules.filter(r => r.enabled !== false);
}

/**
 * Finds a rule by its ruleId (e.g. 'STORAGE-001').
 * @param {string} ruleId 
 * @returns {Object|undefined}
 */
function getRuleById(ruleId) {
  return allRules.find(r => r.ruleId.toUpperCase() === String(ruleId).toUpperCase());
}

module.exports = {
  allRules,
  getAllRules,
  getEnabledRules,
  getRuleById
};
