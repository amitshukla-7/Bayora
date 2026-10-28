import { z } from 'zod';

export const AnalystOutputSchema = z.object({
  summary: z.string().min(5),
  whatChanged: z.string().min(5),
  attackerImpact: z.string().min(5),
  fixSteps: z.array(z.string()).min(1),
  evidenceRefs: z.array(z.string()).min(1),
});

export type AnalystOutput = z.infer<typeof AnalystOutputSchema>;

export interface IncidentAnalystInput {
  failedCheckId: string;
  guaranteeId: string;
  guaranteeName: string;
  failureMessage: string;
  failureDetails: string;
  diffSummary: string;
  evidenceRefs: string[]; // Valid evidence row IDs or event hashes available in input
}

export interface AnalystValidationResult {
  valid: boolean;
  data?: AnalystOutput;
  error?: string;
  source: 'ai' | 'fallback';
}

/**
 * Validates AI Analyst output with Zod and enforces that every cited evidenceRef
 * actually exists in the provided input evidenceRefs list.
 */
export function validateAnalystOutput(
  rawOutput: unknown,
  allowedEvidenceRefs: string[]
): AnalystValidationResult {
  const parseResult = AnalystOutputSchema.safeParse(rawOutput);
  if (!parseResult.success) {
    return {
      valid: false,
      error: `Schema validation failed: ${parseResult.error.message}`,
      source: 'ai',
    };
  }

  const data = parseResult.data;

  // Verify that every cited evidenceRef exists in the allowed evidence set
  const invalidCitations = data.evidenceRefs.filter((ref) => !allowedEvidenceRefs.includes(ref));
  if (invalidCitations.length > 0) {
    return {
      valid: false,
      error: `Uncited/hallucinated evidence references: [${invalidCitations.join(', ')}]. All claims must cite provided evidence.`,
      source: 'ai',
    };
  }

  return {
    valid: true,
    data,
    source: 'ai',
  };
}

/**
 * Deterministic template fallback built directly from evidence rows.
 * Guarantees a valid, grounded advisory response even when local LLM fails or is unreachable.
 */
export function buildDeterministicFallback(input: IncidentAnalystInput): AnalystOutput {
  const primaryRef = input.evidenceRefs[0] || `ev-${input.failedCheckId.toLowerCase()}`;

  return {
    summary: `Boundary breach detected on ${input.guaranteeId} (${input.guaranteeName}): ${input.failureMessage}`,
    whatChanged: input.diffSummary || `Configuration parameters for ${input.guaranteeId} drifted from certified baseline.`,
    attackerImpact: `Adversary container in red role can exploit relaxed perimeter (${input.failedCheckId}) to compromise isolation: ${input.failureDetails}`,
    fixSteps: [
      `Inspect modified configuration affecting ${input.guaranteeId}.`,
      `Restore certified baseline parameters using the Remediate action.`,
      `Execute targeted selective probe ${input.failedCheckId} to confirm boundary re-establishment.`,
    ],
    evidenceRefs: [primaryRef],
  };
}
