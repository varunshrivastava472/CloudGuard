const { GoogleGenAI } = require('@google/genai');

const SYSTEM_INSTRUCTION = `You are a cloud security remediation assistant for verified static analysis findings.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. Do NOT determine whether the vulnerability exists (it has already been verified deterministically by security rules).
2. Do NOT determine, change, or invent the severity.
3. Do NOT determine, change, or invent the rule ID.
4. Do NOT claim that a resource is secure unless the provided evidence explicitly supports it.

YOUR RESPONSIBILITY IS STRICTLY LIMITED TO:
1. Explanation: What this specific misconfiguration means in cloud infrastructure.
2. Impact: The security threat vector, exploitation risk, and consequences.
3. Remediation Guidance: Step-by-step developer remediation steps and an example corrected configuration snippet.

Keep explanations clear, concise, and developer-friendly.`;

/**
 * Deterministic fallback generator when Gemini API is unavailable or unconfigured.
 */
function getFallbackRemediation(finding) {
  const ruleId = finding.ruleId || 'SECURITY-RULE';
  const resource = finding.resource || 'cloud-resource';
  const evidence = finding.evidence || '';

  let fixedConfig = '';
  if (ruleId === 'STORAGE-001') {
    fixedConfig = JSON.stringify({
      id: resource,
      type: 'storage',
      name: resource,
      publicAccess: false,
      encryptionEnabled: true
    }, null, 2);
  } else if (ruleId === 'STORAGE-002') {
    fixedConfig = JSON.stringify({
      id: resource,
      type: 'storage',
      name: resource,
      encryptionEnabled: true,
      encryptionType: 'KMS-Managed-AES256'
    }, null, 2);
  } else if (ruleId === 'NETWORK-001') {
    fixedConfig = JSON.stringify({
      id: resource,
      type: 'firewall',
      name: resource,
      rules: [
        {
          port: 22,
          protocol: 'tcp',
          source: '10.0.1.0/24',
          action: 'allow',
          description: 'Restricted SSH access via secure internal bastion CIDR'
        }
      ]
    }, null, 2);
  } else if (ruleId === 'NETWORK-002') {
    fixedConfig = JSON.stringify({
      id: resource,
      type: 'firewall',
      name: resource,
      rules: [
        {
          port: 5432,
          protocol: 'tcp',
          source: '10.0.2.0/24',
          action: 'allow',
          description: 'Restricted database access only from application tier'
        }
      ]
    }, null, 2);
  } else if (ruleId === 'IAM-001') {
    fixedConfig = JSON.stringify({
      id: resource,
      type: 'iam',
      name: resource,
      permissions: [
        'storage:GetObject',
        'storage:ListBucket'
      ]
    }, null, 2);
  } else {
    fixedConfig = JSON.stringify({
      id: resource,
      remediated: true,
      notes: 'Applied least-privilege configuration and restricted networking'
    }, null, 2);
  }

  return {
    ruleId: finding.ruleId,
    title: finding.title,
    severity: finding.severity,
    category: finding.category || 'Security',
    resource: finding.resource || resource,
    source: 'rule-engine-fallback',
    explanation: `Verified finding ${finding.ruleId} detected on '${resource}'. ${finding.description || ''}\n\nEvidence: ${evidence}`,
    impact: finding.impact || 'Potential unauthorized access or data exposure.',
    remediation: finding.remediation || 'Apply least privilege and restricted network policies.',
    fixGuidance: finding.remediation || 'Apply least privilege and restricted network policies.',
    fixedConfig
  };
}

/**
 * Aggressively sanitizes any sensitive API keys or auth tokens from log strings.
 */
function sanitizeLogMessage(message, apiKey) {
  if (!message) return 'Unknown error';
  let safe = String(message);
  if (apiKey && apiKey.length > 5) {
    safe = safe.replaceAll(apiKey, '[REDACTED_API_KEY]');
  }
  // Sanitize Google API keys (AIza...)
  safe = safe.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_AIZA_KEY]');
  // Sanitize Vertex/Bearer keys (AQ.Ab8...)
  safe = safe.replace(/AQ\.[A-Za-z0-9_\-]{20,}/g, '[REDACTED_TOKEN]');
  // Sanitize URL query parameters (key=..., token=..., api_key=...)
  safe = safe.replace(/([?&](?:key|api_key|token|auth)=)[^&\s]+/gi, '$1[REDACTED]');
  // Strip out any query strings from Google API endpoints
  safe = safe.replace(/(https?:\/\/generativelanguage\.googleapis\.com[^\s?]+)\?[^\s]*/gi, '$1?[REDACTED_QUERY]');
  return safe;
}

/**
 * Explains a verified security finding.
 * 
 * @param {Object} finding
 * @returns {Promise<Object>}
 */
async function explainFinding(finding) {
  if (!finding || !finding.ruleId) {
    throw new Error('Finding data with ruleId is required');
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    return getFallbackRemediation(finding);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    const prompt = `Explain the following verified cloud security finding:
Rule ID: ${finding.ruleId}
Title: ${finding.title}
Severity: ${finding.severity}
Category: ${finding.category}
Resource: ${finding.resource}
Evidence: ${finding.evidence}
Description: ${finding.description}
Impact: ${finding.impact}
Recommended Fix: ${finding.remediation}

Provide your response in JSON format with keys:
"explanation", "impact", "remediation", "fixedConfig"`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    const text = response.text || '';

    // Parse JSON response if possible
    let parsed = null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback to text
      }
    }

    if (parsed && parsed.explanation) {
      return {
        ruleId: finding.ruleId,
        title: finding.title,
        severity: finding.severity,
        source: 'gemini',
        explanation: parsed.explanation,
        impact: parsed.impact || finding.impact,
        remediation: parsed.remediation || parsed.fixGuidance || finding.remediation,
        fixGuidance: parsed.remediation || parsed.fixGuidance || finding.remediation,
        fixedConfig: parsed.fixedConfig || getFallbackRemediation(finding).fixedConfig
      };
    }

    return {
      ruleId: finding.ruleId,
      title: finding.title,
      severity: finding.severity,
      source: 'gemini',
      explanation: text,
      impact: finding.impact,
      remediation: finding.remediation,
      fixGuidance: finding.remediation,
      fixedConfig: getFallbackRemediation(finding).fixedConfig
    };
  } catch (err) {
    const safeError = sanitizeLogMessage(err.message, apiKey);
    console.warn(`Gemini API request note: (${safeError}). Proceeding with deterministic rule remediation.`);
    const fallback = getFallbackRemediation(finding);
    fallback.note = `AI service operating in offline mode.`;
    return fallback;
  }
}

/**
 * Generates custom remediation guidance from user prompt.
 */
async function generateRemediationGuidance(promptText) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    return {
      source: 'rule-engine-fallback',
      explanation: `CloudGuard AI Guidance:\nFor ${promptText}, always follow least privilege access principles, restrict CIDR ranges to internal bastions (no 0.0.0.0/0 on sensitive ports), and ensure server-side encryption is enforced across all storage resources.`,
      fixedConfig: JSON.stringify({
        recommendation: "Ensure publicAccess is false, encryptionEnabled is true, and firewall rules restrict SSH/DB to trusted CIDR subnets."
      }, null, 2)
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    const text = response.text || '';

    return {
      source: 'gemini',
      explanation: text,
      fixedConfig: null
    };
  } catch (err) {
    return {
      source: 'rule-engine-fallback',
      explanation: `CloudGuard AI Guidance (Offline Fallback):\nFor ${promptText}, prioritize closing open SSH (port 22) and database ports (3306, 5432, 27017) to 0.0.0.0/0, enabling storage encryption at rest, and removing wildcard (*) IAM permissions.`,
      fixedConfig: null
    };
  }
}

module.exports = {
  explainFinding,
  generateRemediationGuidance,
  getFallbackRemediation
};
