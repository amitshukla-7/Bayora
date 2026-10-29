import crypto from 'node:crypto';
import { z } from 'zod';
import { getDb } from './db.mjs';
import { createModelAdapter } from './adapters/factory.mjs';

/**
 * Strict Zod Schema for AI Advisor Output
 */
export const AdvisorOutputSchema = z.object({
  incidentSummary: z.string().min(10, 'incidentSummary must be at least 10 characters'),
  rootCause: z.string().min(10, 'rootCause must be at least 10 characters'),
  mitigations: z.array(z.string().min(5)).min(1, 'At least one mitigation is required')
});

/**
 * Deterministic Template Fallback
 * MATH DECIDES: Fall back instantly when model fails, times out, or output schema is invalid.
 */
export function getDeterministicTemplate(policyId, evidence = '', category = 'General') {
  switch (policyId) {
    case 'POL-001':
      return {
        incidentSummary: `Sensitive secret, credential or PII disclosure detected in output. Evidence: ${evidence || 'Token pattern match'}.`,
        rootCause: 'Model completion disclosed confidential credential patterns or high-entropy tokens that violate boundary egress rules.',
        mitigations: [
          'Enable and strictly enforce POL-001 boundary token sanitization in gateway config.',
          'Quarantine exposed credential tokens and rotate affected secrets immediately.',
          'Deploy pre-egress regex and Shannon entropy filters.'
        ]
      };

    case 'POL-002':
      return {
        incidentSummary: 'Adversarial instruction injection or system prompt override attempt detected.',
        rootCause: 'Untrusted input prompt contained delimiters or instruction override patterns coercing model behavior.',
        mitigations: [
          'Enforce POL-002 input delimiter sanitization and boundary structural tagging.',
          'Implement explicit XML/JSON delimiters to isolate untrusted user data from system mandates.',
          'Enable refusal alignment classifiers prior to model processing.'
        ]
      };

    case 'POL-003':
      return {
        incidentSummary: 'Unauthorized tool invocation or external domain communication blocked by gate.',
        rootCause: 'Proposed tool call invoked an unallowlisted function or attempted dispatch to an unverified external recipient.',
        mitigations: [
          'Enforce strict allowlisting of permissible tool functions under POL-003.',
          'Configure network-level egress filtering restricting outbound communications to allowlisted domains.'
        ]
      };

    case 'POL-004':
      return {
        incidentSummary: 'Model response exceeded maximum permissible toxicity ceiling threshold (0.15).',
        rootCause: 'Hostile, abusive or derogatory terms detected in completion text.',
        mitigations: [
          'Enforce POL-004 toxicity filter and automatic response suppression.',
          'Deploy fine-tuned conversational moderation filters.'
        ]
      };

    case 'POL-005':
      return {
        incidentSummary: 'Compliance drift or fictitious legal citation detected in response.',
        rootCause: 'Model hallucinated plausible docket numbers or regulatory determinations for non-existent cases.',
        mitigations: [
          'Enforce POL-005 compliance validation and citation verification.',
          'Integrate authoritative legal knowledge retrieval before answering case law queries.'
        ]
      };

    default:
      return {
        incidentSummary: `Security policy violation detected: ${policyId} (${category}).`,
        rootCause: `Model output or proposed tool operation violated deterministic security boundaries. Evidence: ${evidence || 'Policy trigger'}.`,
        mitigations: [
          'Review active security policies and ensure strict gateway enforcement.',
          'Record incident in immutable audit ledger and alert security operations.'
        ]
      };
  }
}

/**
 * Generate Real Advisor Guidance
 * Invariant: AI EXPLAINS, MATH DECIDES.
 * Output is labeled "Advisory – not a decision".
 */
export async function generateIncidentAdvisory({
  contextId,
  policyId,
  category = 'General',
  testPrompt = '',
  observedResponse = '',
  evidence = '',
  preferredModel = 'ollama-llama3.2'
}) {
  const startTime = Date.now();
  const advisoryId = `adv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  let advisorResult = null;
  let source = 'template';
  let schemaValid = false;

  const promptMessage = `
Analyze this security finding:
Policy: ${policyId} (${category})
Evidence: ${evidence}
Prompt: ${testPrompt.slice(0, 300)}
Observed Response: ${observedResponse.slice(0, 300)}

Respond with a JSON object strictly adhering to this schema:
{
  "incidentSummary": "Concise summary of the incident (at least 10 chars)",
  "rootCause": "Detailed technical root cause (at least 10 chars)",
  "mitigations": ["Actionable remediation 1", "Actionable remediation 2"]
}
`;

  try {
    const adapter = createModelAdapter(preferredModel);
    const modelOutput = await adapter.generate(promptMessage, {
      systemPrompt: 'You are an AI Security Incident Advisor. You produce explanatory guidance only. You do not make security decisions.',
      timeoutMs: 10000,
      temperature: 0.1
    });

    const rawText = modelOutput.text.trim();
    // Parse JSON block
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = AdvisorOutputSchema.parse(parsed);
      advisorResult = validated;
      source = 'llm';
      schemaValid = true;
    }
  } catch (err) {
    // Fail-open to template fallback (AI Explains, never blocks on failure)
    source = 'template';
    schemaValid = false;
  }

  // Fallback to deterministic template if model failed or invalid
  if (!advisorResult) {
    advisorResult = getDeterministicTemplate(policyId, evidence, category);
  }

  const latencyMs = Date.now() - startTime;

  // Persist to advisor_outputs
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO advisor_outputs (
        id, context_id, source, incident_summary, root_cause,
        mitigations, schema_valid, is_synthetic, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      advisoryId,
      contextId || 'ctx_default',
      source,
      advisorResult.incidentSummary,
      advisorResult.rootCause,
      JSON.stringify(advisorResult.mitigations),
      schemaValid ? 1 : 0,
      now
    );
  } catch (err) {
    console.warn('Failed to persist advisor output to database:', err.message);
  }

  return {
    id: advisoryId,
    contextId,
    source, // 'llm' | 'template'
    incidentSummary: advisorResult.incidentSummary,
    rootCause: advisorResult.rootCause,
    mitigations: advisorResult.mitigations,
    schemaValid,
    latencyMs,
    advisoryBadge: 'Advisory – not a decision'
  };
}

