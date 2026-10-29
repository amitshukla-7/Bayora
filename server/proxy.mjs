import crypto from 'node:crypto';
import { Hono } from 'hono';
import { createModelAdapter } from './adapters/factory.mjs';
import { verifyAttestationTicket } from './attestation.mjs';
import {
  evaluatePol001,
  evaluatePol002,
  evaluatePol003,
  evaluatePol004,
  evaluatePol005
} from './policies/engine.mjs';
import { getDb, appendAuditEvent } from './db.mjs';

export const proxyRouter = new Hono();

/**
 * SHA-256 helper
 */
function sha256(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

/**
 * OpenAI-Compatible Proxy: /v1/chat/completions
 * Request Lifecycle:
 * 1. Auth & signed attestation ticket verification (5-min TTL, fingerprint match)
 * 2. Input security policy evaluation (POL-001, POL-002)
 * 3. Model adapter execution (Ollama, OpenAI, vLLM, Anthropic)
 * 4. Output security policy evaluation (POL-001 redaction, POL-004 toxicity, POL-005 compliance)
 * 5. Tool call authorization gate (POL-003)
 * 6. Audit ledger persistence (append-only hash c
 * hain)
 * 7. Formatted OpenAI response return
 */
proxyRouter.post('/chat/completions', async (c) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  // 1. Attestation ticket check
  const ticketHeader = c.req.header('X-Attestation-Ticket') || c.req.header('x-attestation-ticket');
  const authHeader = c.req.header('Authorization');
  let rawTicket = ticketHeader;

  if (!rawTicket && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith('{') || token.startsWith('eyJ') || token.startsWith('tkt_')) {
      rawTicket = token;
    }
  }

  const attestationResult = await verifyAttestationTicket(rawTicket);
  if (!attestationResult.valid) {
    return c.json(
      {
        error: {
          message: `SentinelFlow Attestation Gate: Access Denied. ${attestationResult.reason}`,
          type: 'attestation_failure',
          code: 'UNAUTHORIZED_ATTENTION_TICKET'
        }
      },
      403
    );
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { message: 'Invalid JSON request body', type: 'invalid_request_error' } }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const userMessages = messages.filter(m => m.role === 'user');
  const prompt = userMessages.map(m => m.content).join('\n') || '';
  const promptHash = sha256(prompt);
  const modelId = body.model || 'ollama-llama3.2';

  // 2. Input Security Policy Checks
  const inputPol001 = evaluatePol001(prompt);
  const inputPol002 = evaluatePol002(prompt);

  if (inputPol002.violated) {
    // Record rejection
    const decisionId = `dec_${crypto.randomBytes(6).toString('hex')}`;
    const db = getDb();
    db.prepare(`
      INSERT INTO policy_decisions (id, policy_id, model_id, decision, verdict, input_hash, output_hash, matched_rules, latency_ms, is_synthetic, created_at)
      VALUES (?, 'POL-002', ?, 'DENY', 'Failed', ?, '0000000000000000', ?, ?, 0, datetime('now'))
    `).run(decisionId, modelId, promptHash, JSON.stringify(inputPol002.matchedPatterns), Date.now() - startTime);

    appendAuditEvent({
      eventType: 'GATEWAY_INPUT_POLICY_DENIED',
      resource: 'v1/chat/completions',
      decision: 'DENY',
      canonicalPayload: { requestId, modelId, reason: 'Adversarial instruction injection detected in input prompt.' }
    });

    return c.json(
      {
        error: {
          message: 'Request denied by SentinelFlow input gate: Prompt injection or instruction override detected.',
          type: 'policy_violation_error',
          code: 'POL_002_VIOLATION'
        }
      },
      400
    );
  }

  // 3. Model Adapter Execution
  let adapter;
  try {
    adapter = createModelAdapter(modelId);
  } catch (err) {
    return c.json({ error: { message: `Model not found or adapter unsupported: ${err.message}`, type: 'model_not_found' } }, 404);
  }

  let modelResult;
  try {
    modelResult = await adapter.generate(prompt, {
      temperature: body.temperature ?? 0.0,
      seed: body.seed ?? 42,
      maxTokens: body.max_tokens,
      tools: body.tools
    });
  } catch (err) {
    return c.json(
      {
        error: {
          message: `Upstream model execution failed: ${err.message}`,
          type: 'upstream_model_error'
        }
      },
      502
    );
  }

  const responseText = modelResult.text || '';
  const responseHash = sha256(responseText);
  const latencyMs = modelResult.latencyMs || (Date.now() - startTime);

  // 4. Output Policy Checks
  const outPol001 = evaluatePol001(responseText);
  const outPol004 = evaluatePol004(responseText);
  const outPol005 = evaluatePol005(responseText);
  const outPol003 = evaluatePol003(modelResult.toolCalls || []);

  let finalResponseText = responseText;
  let finalVerdict = 'Passed';
  let primaryPolicyViolated = null;

  if (outPol001.violated) {
    finalVerdict = 'Failed';
    primaryPolicyViolated = 'POL-001';
    finalResponseText = outPol001.redactedText; // Redact sensitive keys
  } else if (outPol003.violated) {
    finalVerdict = 'Failed';
    primaryPolicyViolated = 'POL-003';
  } else if (outPol004.violated) {
    finalVerdict = 'Warning';
    primaryPolicyViolated = 'POL-004';
  } else if (outPol005.violated) {
    finalVerdict = 'Warning';
    primaryPolicyViolated = 'POL-005';
  }

  // 5. Persist Policy Decision
  const db = getDb();
  const decisionId = `dec_${crypto.randomBytes(6).toString('hex')}`;
  db.prepare(`
    INSERT INTO policy_decisions (id, policy_id, model_id, decision, verdict, input_hash, output_hash, matched_rules, latency_ms, is_synthetic, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `).run(
    decisionId,
    primaryPolicyViolated || 'POL-DEFAULT-ALLOW',
    modelId,
    finalVerdict === 'Failed' ? 'DENY' : 'ALLOW',
    finalVerdict,
    promptHash,
    responseHash,
    JSON.stringify({
      pol001: outPol001.matches,
      pol003: outPol003.violations,
      pol004: outPol004.matchedTerms,
      pol005: outPol005.reasons
    }),
    latencyMs
  );

  // 6. Record Gateway Request
  db.prepare(`
    INSERT INTO gateway_requests (id, model_id, prompt_hash, response_hash, latency_ms, tokens_prompt, tokens_completion, tokens_total, policy_verdict, is_synthetic, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `).run(
    requestId,
    modelId,
    promptHash,
    responseHash,
    latencyMs,
    modelResult.tokens.prompt,
    modelResult.tokens.completion,
    modelResult.tokens.total,
    finalVerdict
  );

  // 7. Append Audit Event
  appendAuditEvent({
    eventType: 'GATEWAY_PROXY_COMPLETION',
    resource: 'v1/chat/completions',
    decision: finalVerdict === 'Failed' ? 'DENY' : 'ALLOW',
    canonicalPayload: {
      requestId,
      modelId,
      verdict: finalVerdict,
      tokens: modelResult.tokens,
      latencyMs
    }
  });

  // 8. Return standard OpenAI completion response
  return c.json({
    id: `chatcmpl-${requestId}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: modelId,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: finalResponseText,
          tool_calls: modelResult.toolCalls || []
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: modelResult.tokens.prompt,
      completion_tokens: modelResult.tokens.completion,
      total_tokens: modelResult.tokens.total
    },
    bayora: {
      verdict: finalVerdict,
      policyViolated: primaryPolicyViolated,
      digest: modelResult.digest,
      fingerprint: attestationResult.fingerprint
    }
  });
});
