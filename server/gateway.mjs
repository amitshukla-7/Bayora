import { canonicalJson, sha256Hex } from './canonical.mjs';
import { getAllPolicies, getPolicyById } from './db.mjs';
import {
  executeReadDocument,
  executeSearchDocuments,
  executeWriteReport,
  executeMockSendEmail,
} from './tools.mjs';
import { appendLedgerEvent } from './ledger.mjs';

/**
 * Computes the canonical policy configuration fingerprint.
 */
export async function getPolicyFingerprint() {
  const policies = getAllPolicies();
  const securityRelevant = policies.map((p) => ({
    id: p.id,
    effect: p.effect,
    tool: p.tool,
    is_enabled: p.is_enabled,
    rule_config: p.rule_config,
    version: p.version,
  }));
  return await sha256Hex(canonicalJson(securityRelevant));
}

/**
 * SentinelFlow Deterministic Policy Evaluator
 * Evaluates a proposed tool call strictly against active policies.
 * Fails closed by default.
 */
export function evaluatePolicy(toolName, params) {
  const policies = getAllPolicies();
  const enabledPolicies = policies.filter((p) => p.is_enabled);

  // 1. Tool-Specific Policy Evaluation
  switch (toolName) {
    case 'read_document': {
      const filename = params?.filename || '';

      // Check for path traversal attempts immediately
      if (filename.includes('..') || filename.startsWith('/') || filename.startsWith('\\')) {
        return {
          decision: 'DENIED',
          policyId: 'GATEWAY-TRAVERSAL-GUARD',
          policyName: 'Gateway Filesystem Traversal Guard',
          reason: 'Path traversal attempt detected. Relative path escalation prohibited.',
          riskLevel: 'CRITICAL',
        };
      }

      // Check POL-002: Deny Reading Restricted Secrets and Payroll Stores
      const pol002 = enabledPolicies.find((p) => p.id === 'POL-002');
      if (pol002) {
        const forbiddenKeywords = pol002.rule_config.forbiddenKeywords || [];
        const forbiddenFilenames = pol002.rule_config.forbiddenFilenames || [];
        const lowerFile = filename.toLowerCase();

        const matchesKeyword = forbiddenKeywords.some((kw) => lowerFile.includes(kw.toLowerCase()));
        const matchesFile = forbiddenFilenames.some((fn) => lowerFile === fn.toLowerCase());

        if (matchesKeyword || matchesFile) {
          return {
            decision: 'DENIED',
            policyId: pol002.id,
            policyName: pol002.name,
            reason: `Access to restricted resource "${filename}" is explicitly blocked by policy ${pol002.id}.`,
            riskLevel: 'CRITICAL',
          };
        }
      }

      // Check POL-001: Allow Reading Approved Project Documents
      const pol001 = enabledPolicies.find((p) => p.id === 'POL-001');
      if (pol001) {
        const allowedExts = ['.txt', '.md', '.json', '.csv'];
        const hasApprovedExt = allowedExts.some((ext) => filename.toLowerCase().endsWith(ext));

        if (!hasApprovedExt) {
          return {
            decision: 'DENIED',
            policyId: 'UNAPPROVED-FILETYPE-GUARD',
            policyName: 'Unapproved File Extension Guard',
            reason: `File extension for "${filename}" is not in approved text formats (${allowedExts.join(', ')}).`,
            riskLevel: 'MEDIUM',
          };
        }

        const disallowedPatterns = pol001.rule_config.disallowedPatterns || [];
        const lowerFile = filename.toLowerCase();
        const matchesDisallowed = disallowedPatterns.some((pattern) => {
          const cleanPattern = pattern.replace('*', '').toLowerCase();
          return lowerFile.includes(cleanPattern);
        });

        if (!matchesDisallowed) {
          return {
            decision: 'ALLOWED',
            policyId: pol001.id,
            policyName: pol001.name,
            reason: `Reading "${filename}" authorized under approved documents scope.`,
            riskLevel: 'LOW',
          };
        }
      }

      // Default Deny if no explicit allow
      return {
        decision: 'DENIED',
        policyId: 'DEFAULT-DENY',
        policyName: 'Default Deny Policy',
        reason: `No active policy explicitly authorizes reading "${filename}". Gate failed closed.`,
        riskLevel: 'HIGH',
      };
    }

    case 'search_documents': {
      const query = (params?.query || '').toLowerCase();
      // Check POL-002 keywords
      const pol002 = enabledPolicies.find((p) => p.id === 'POL-002');
      if (pol002) {
        const forbidden = pol002.rule_config.forbiddenKeywords || [];
        if (forbidden.some((kw) => query.includes(kw.toLowerCase()))) {
          return {
            decision: 'DENIED',
            policyId: pol002.id,
            policyName: pol002.name,
            reason: `Search query "${params?.query}" targets restricted keywords governed by ${pol002.id}.`,
            riskLevel: 'HIGH',
          };
        }
      }

      const pol001 = enabledPolicies.find((p) => p.id === 'POL-001');
      if (pol001) {
        return {
          decision: 'ALLOWED',
          policyId: pol001.id,
          policyName: pol001.name,
          reason: 'Document search authorized within approved document collection.',
          riskLevel: 'LOW',
        };
      }

      return {
        decision: 'DENIED',
        policyId: 'DEFAULT-DENY',
        policyName: 'Default Deny Policy',
        reason: 'Document search not permitted under default-deny posture.',
        riskLevel: 'HIGH',
      };
    }

    case 'write_report': {
      const filename = params?.filename || '';
      const content = params?.content || '';

      if (filename.includes('..') || filename.startsWith('/') || filename.startsWith('\\')) {
        return {
          decision: 'DENIED',
          policyId: 'GATEWAY-TRAVERSAL-GUARD',
          policyName: 'Gateway Filesystem Traversal Guard',
          reason: 'Path traversal attempt in report writer. Escape from workspace/output prohibited.',
          riskLevel: 'CRITICAL',
        };
      }

      // Check POL-005: Deny Synthetic Secret Exfiltration
      const pol005 = enabledPolicies.find((p) => p.id === 'POL-005');
      if (pol005) {
        const blockedTokens = pol005.rule_config.blockedTokens || [];
        for (const token of blockedTokens) {
          if (content.includes(token)) {
            return {
              decision: 'DENIED',
              policyId: pol005.id,
              policyName: pol005.name,
              reason: `Report content contains synthetic credential token "${token}". Exfiltration blocked.`,
              riskLevel: 'CRITICAL',
            };
          }
        }
      }

      // Check POL-003: Allow Writing Reports to Approved Output Directory
      const pol003 = enabledPolicies.find((p) => p.id === 'POL-003');
      if (pol003) {
        const allowedExts = pol003.rule_config.allowedExtensions || ['.txt', '.md', '.json'];
        const hasValidExt = allowedExts.some((ext) => filename.toLowerCase().endsWith(ext));
        if (hasValidExt) {
          return {
            decision: 'ALLOWED',
            policyId: pol003.id,
            policyName: pol003.name,
            reason: `Writing report to "${filename}" authorized in approved output directory.`,
            riskLevel: 'LOW',
          };
        } else {
          return {
            decision: 'DENIED',
            policyId: pol003.id,
            policyName: pol003.name,
            reason: `Report filename extension is not permitted by ${pol003.id}. Allowed: ${allowedExts.join(', ')}`,
            riskLevel: 'MEDIUM',
          };
        }
      }

      return {
        decision: 'DENIED',
        policyId: 'DEFAULT-DENY',
        policyName: 'Default Deny Policy',
        reason: 'Writing reports not authorized under current policies.',
        riskLevel: 'HIGH',
      };
    }

    case 'mock_send_email': {
      const to = (params?.to || '').toLowerCase().trim();
      const body = params?.body || '';

      // Check POL-004: Deny Unauthorized Email Recipients
      const pol004 = enabledPolicies.find((p) => p.id === 'POL-004');
      if (pol004) {
        const allowedDomains = pol004.rule_config.allowedDomains || ['@internal.local'];
        const isAuthorizedDomain = allowedDomains.some((domain) => to.endsWith(domain.toLowerCase()));

        if (!isAuthorizedDomain) {
          return {
            decision: 'DENIED',
            policyId: pol004.id,
            policyName: pol004.name,
            reason: `Email destination "${to}" is not in approved internal domains (${allowedDomains.join(', ')}). Exfiltration blocked.`,
            riskLevel: 'CRITICAL',
          };
        }
      }

      // Check POL-005: Deny Synthetic Secret Exfiltration
      const pol005 = enabledPolicies.find((p) => p.id === 'POL-005');
      if (pol005) {
        const blockedTokens = pol005.rule_config.blockedTokens || [];
        for (const token of blockedTokens) {
          if (body.includes(token)) {
            return {
              decision: 'DENIED',
              policyId: pol005.id,
              policyName: pol005.name,
              reason: `Email payload contains protected synthetic credential "${token}". Transmission blocked.`,
              riskLevel: 'CRITICAL',
            };
          }
        }
      }

      return {
        decision: 'ALLOWED',
        policyId: 'POL-004',
        policyName: 'Internal Email Policy',
        reason: `Email to authorized recipient "${to}" permitted without confidential tokens.`,
        riskLevel: 'LOW',
      };
    }

    default:
      return {
        decision: 'DENIED',
        policyId: 'UNKNOWN-TOOL-GUARD',
        policyName: 'Unknown Tool Guard',
        reason: `Tool "${toolName}" is not registered in the SentinelFlow gateway. Operation denied.`,
        riskLevel: 'CRITICAL',
      };
  }
}

/**
 * Executes a tool proposal through the SentinelFlow Security Gateway.
 * Evaluates policy first. Only if ALLOWED does the real tool execute.
 * Hashes evaluation and decision to the cryptographic ledger.
 */
export async function executeGatedTool({ runId, toolName, params }) {
  const targetResource = params?.filename || params?.to || params?.query || 'workspace';

  // 1. Evaluate Deterministic Policy
  const evaluation = evaluatePolicy(toolName, params);

  // 2. Record policy evaluation in ledger
  await appendLedgerEvent({
    runId,
    eventType: 'policy.evaluated',
    toolName,
    resource: targetResource,
    decision: evaluation.decision,
    payload: {
      toolName,
      params,
      policyId: evaluation.policyId,
      policyName: evaluation.policyName,
      reason: evaluation.reason,
      riskLevel: evaluation.riskLevel,
    },
  });

  // 3. Branch: Allowed vs. Denied
  if (evaluation.decision === 'ALLOWED') {
    let toolResult;
    try {
      switch (toolName) {
        case 'read_document':
          toolResult = executeReadDocument(params);
          break;
        case 'search_documents':
          toolResult = executeSearchDocuments(params);
          break;
        case 'write_report':
          toolResult = executeWriteReport(params);
          break;
        case 'mock_send_email':
          toolResult = executeMockSendEmail(params);
          break;
        default:
          throw new Error(`Tool "${toolName}" has no execution handler.`);
      }

      await appendLedgerEvent({
        runId,
        eventType: 'action.allowed',
        toolName,
        resource: targetResource,
        decision: 'ALLOWED',
        payload: {
          status: 'EXECUTED',
          toolResult: {
            success: true,
            filename: toolResult.filename,
            outputPath: toolResult.outputPath,
            bytesWritten: toolResult.bytesWritten,
            totalMatches: toolResult.totalMatches,
            outboxPath: toolResult.outboxPath,
          },
        },
      });

      return {
        status: 'ALLOWED',
        executed: true,
        evaluation,
        toolResult,
      };
    } catch (err) {
      await appendLedgerEvent({
        runId,
        eventType: 'action.denied',
        toolName,
        resource: targetResource,
        decision: 'DENIED',
        payload: {
          error: err.message,
        },
      });

      return {
        status: 'DENIED',
        executed: false,
        evaluation,
        error: err.message,
      };
    }
  } else {
    // Operation DENIED: Tool is NEVER executed!
    await appendLedgerEvent({
      runId,
      eventType: 'action.denied',
      toolName,
      resource: targetResource,
      decision: 'DENIED',
      payload: {
        status: 'BLOCKED_AT_GATEWAY',
        policyId: evaluation.policyId,
        reason: evaluation.reason,
        attemptedParams: params,
      },
    });

    return {
      status: 'DENIED',
      executed: false,
      evaluation,
      reason: evaluation.reason,
    };
  }
}
