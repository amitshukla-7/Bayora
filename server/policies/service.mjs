import { z } from 'zod';
import { getDb } from '../db.mjs';
import { computeCanonicalPolicyFingerprint } from '../attestation.mjs';
import {
  evaluatePol001,
  evaluatePol002,
  evaluatePol003,
  evaluatePol004,
  evaluatePol005
} from './engine.mjs';

// Cache policy configurations in-memory with TTL for maximum performance
let cachedConfigs = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5000; // 5 seconds

export function invalidatePolicyCache() {
  cachedConfigs = null;
  cacheTimestamp = 0;
}

export const PolicyModeSchema = z.enum(['OFF', 'MONITOR', 'ENFORCE']);

export const UpdatePolicyConfigSchema = z.object({
  mode: PolicyModeSchema.optional(),
  rules: z.record(z.string(), z.any()).optional(),
  reason: z.string().optional(),
  actor: z.string().optional()
});

/**
 * Retrieve all active policy configurations from database (with cache)
 */
export function getAllPolicyConfigs(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedConfigs && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedConfigs;
  }

  const db = getDb();
  const rows = db.prepare(`
    SELECT pc.*, p.description, p.effect, p.tool
    FROM policy_configs pc
    LEFT JOIN policies p ON pc.id = p.id
    ORDER BY pc.id ASC
  `).all();

  const configs = rows.map(r => {
    let parsedRules = {};
    try {
      parsedRules = typeof r.rules_json === 'string' ? JSON.parse(r.rules_json || '{}') : r.rules_json;
    } catch {
      parsedRules = {};
    }

    return {
      id: r.id,
      name: r.name,
      category: r.category,
      severity: r.severity,
      mode: r.mode,
      is_enabled: r.mode === 'OFF' ? 0 : 1,
      rules: parsedRules,
      version: r.version,
      updated_at: r.updated_at,
      updated_by: r.updated_by,
      description: r.description || '',
      effect: r.effect || 'DENY',
      tool: r.tool || '*'
    };
  });

  cachedConfigs = configs;
  cacheTimestamp = now;
  return configs;
}

/**
 * Retrieve a specific policy configuration by ID
 */
export function getPolicyConfigById(id) {
  const configs = getAllPolicyConfigs();
  const found = configs.find(c => c.id === id);
  if (!found) {
    const error = new Error(`Policy not found: "${id}"`);
    error.statusCode = 404;
    throw error;
  }
  return found;
}

/**
 * Update policy mode or rules with audit logging and RFC 8785 fingerprinting
 */
export async function updatePolicyConfig(id, payload) {
  const parsed = UpdatePolicyConfigSchema.safeParse(payload);
  if (!parsed.success) {
    const error = new Error(`Validation failed: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    error.statusCode = 400;
    throw error;
  }

  const current = getPolicyConfigById(id);
  const newMode = parsed.data.mode !== undefined ? parsed.data.mode : current.mode;
  const newRules = parsed.data.rules !== undefined ? parsed.data.rules : current.rules;
  const actor = parsed.data.actor || 'operator';
  const reason = (parsed.data.reason || '').trim();

  // Enforce CRITICAL GUARDRAIL check: Disabling POL-001 or POL-002 requires a typed justification
  const isCritical = current.severity === 'Critical' || id === 'POL-001' || id === 'POL-002';
  if (isCritical && newMode === 'OFF' && current.mode !== 'OFF') {
    if (!reason || reason.length < 5) {
      const error = new Error(
        `Disabling Critical Guardrail ${id} requires a mandatory typed operational reason (minimum 5 characters).`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Compute RFC 8785 fingerprint before modification
  const fingerprintBefore = await computeCanonicalPolicyFingerprint();

  const db = getDb();
  const now = new Date().toISOString();
  const newVersion = (current.version || 1) + 1;
  const rulesJsonStr = JSON.stringify(newRules);

  const diff = {
    previousMode: current.mode,
    newMode,
    rulesChanged: JSON.stringify(current.rules) !== rulesJsonStr
  };

  db.exec('BEGIN IMMEDIATE');
  try {
    // 1. Update policy_configs table
    db.prepare(`
      UPDATE policy_configs
      SET mode = ?, rules_json = ?, version = ?, updated_at = ?, updated_by = ?
      WHERE id = ?
    `).run(newMode, rulesJsonStr, newVersion, now, actor, id);

    // 2. Synchronize policies table
    db.prepare(`
      UPDATE policies
      SET mode = ?, is_enabled = ?, rules = ?, version = ?, updated_at = ?
      WHERE id = ?
    `).run(newMode, newMode === 'OFF' ? 0 : 1, rulesJsonStr, newVersion, now, id);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  // Invalidate cache immediately so new policy takes effect
  invalidatePolicyCache();

  // Compute RFC 8785 fingerprint after modification
  const fingerprintAfter = await computeCanonicalPolicyFingerprint();

  // 3. Record in policy_config_history
  db.prepare(`
    INSERT INTO policy_config_history (
      policy_id, previous_mode, new_mode, diff_json, reason, actor,
      fingerprint_before, fingerprint_after, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    current.mode,
    newMode,
    JSON.stringify(diff),
    reason || null,
    actor,
    fingerprintBefore,
    fingerprintAfter,
    now
  );

  return {
    id,
    mode: newMode,
    rules: newRules,
    version: newVersion,
    updated_at: now,
    updated_by: actor,
    fingerprintBefore,
    fingerprintAfter
  };
}

/**
 * Fetch version history for a specific policy
 */
export function getPolicyHistory(policyId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM policy_config_history
    WHERE policy_id = ?
    ORDER BY id DESC
  `).all(policyId);
}

/**
 * Check if any critical guardrail is disabled (returns banner warning info)
 */
export function getCriticalGuardrailStatus() {
  const configs = getAllPolicyConfigs();
  const disabledCritical = configs.filter(
    c => (c.severity === 'Critical' || c.id === 'POL-001' || c.id === 'POL-002') && c.mode === 'OFF'
  );

  if (disabledCritical.length === 0) {
    return { anyDisabled: false, disabled: [] };
  }

  const db = getDb();
  const disabledDetails = disabledCritical.map(c => {
    const lastHistory = db.prepare(`
      SELECT * FROM policy_config_history
      WHERE policy_id = ? AND new_mode = 'OFF'
      ORDER BY id DESC LIMIT 1
    `).get(c.id);

    return {
      policyId: c.id,
      policyName: c.name,
      disabledAt: lastHistory?.created_at || c.updated_at,
      disabledBy: lastHistory?.actor || c.updated_by,
      reason: lastHistory?.reason || 'No reason provided.'
    };
  });

  return {
    anyDisabled: true,
    disabled: disabledDetails
  };
}

/**
 * Interactive Policy Playground Tester ("Test this policy" box)
 * Evaluates arbitrary sample prompt or response text, returning highlighted spans.
 */
export function testPolicyInteractively({ policyId, prompt = '', response = '', toolCalls = [] }) {
  const config = getPolicyConfigById(policyId);
  const matchedSpans = [];

  let evaluationResult = null;
  let verdict = 'ALLOW';
  let score = 0;
  let explanation = 'No policy violations detected.';

  switch (policyId) {
    case 'POL-001': {
      evaluationResult = evaluatePol001(response || prompt);
      if (evaluationResult.violated) {
        verdict = config.mode === 'ENFORCE' ? 'DENY' : config.mode === 'MONITOR' ? 'MONITOR' : 'ALLOW';
        score = 95;
        explanation = `Secret or PII token detected: ${evaluationResult.matches.join('; ')}`;

        // Find spans in test string
        const text = response || prompt;
        for (const match of evaluationResult.matches) {
          const rawMatch = match.split(': ')[1]?.replace('...', '') || '';
          if (rawMatch) {
            let idx = text.indexOf(rawMatch);
            while (idx !== -1) {
              matchedSpans.push({
                start: idx,
                end: idx + rawMatch.length,
                text: rawMatch,
                rule: match.split(':')[0]
              });
              idx = text.indexOf(rawMatch, idx + 1);
            }
          }
        }
      }
      break;
    }

    case 'POL-002': {
      evaluationResult = evaluatePol002(prompt, response);
      if (evaluationResult.violated) {
        verdict = config.mode === 'ENFORCE' ? 'DENY' : config.mode === 'MONITOR' ? 'MONITOR' : 'ALLOW';
        score = 90;
        explanation = `Prompt injection or override pattern matched: ${evaluationResult.matchedPatterns.join('; ')}`;
      }
      break;
    }

    case 'POL-003': {
      evaluationResult = evaluatePol003(toolCalls);
      if (evaluationResult.violated) {
        verdict = config.mode === 'ENFORCE' ? 'DENY' : config.mode === 'MONITOR' ? 'MONITOR' : 'ALLOW';
        score = 92;
        explanation = `Disallowed tool execution attempt: ${evaluationResult.violations.join('; ')}`;
      }
      break;
    }

    case 'POL-004': {
      evaluationResult = evaluatePol004(response || prompt);
      score = evaluationResult.score;
      if (evaluationResult.violated) {
        verdict = config.mode === 'ENFORCE' ? 'DENY' : config.mode === 'MONITOR' ? 'MONITOR' : 'ALLOW';
        explanation = `Toxicity score ${evaluationResult.score} exceeds threshold ${evaluationResult.ceiling}`;
      }
      break;
    }

    case 'POL-005': {
      evaluationResult = evaluatePol005(response || prompt);
      if (evaluationResult.violated) {
        verdict = config.mode === 'ENFORCE' ? 'DENY' : config.mode === 'MONITOR' ? 'MONITOR' : 'ALLOW';
        score = 50;
        explanation = `Compliance drift or fabricated citations detected: ${evaluationResult.reasons.join('; ')}`;
      }
      break;
    }

    default:
      throw new Error(`Unsupported policy ID for interactive test: "${policyId}"`);
  }

  return {
    policyId,
    policyName: config.name,
    mode: config.mode,
    effectiveVerdict: verdict,
    score,
    explanation,
    matchedSpans,
    rawEvaluation: evaluationResult
  };
}
