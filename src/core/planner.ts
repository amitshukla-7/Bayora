import type { GuaranteeDefinition, GuaranteeDigestMap, TestExecutionResult, TestId } from '../types';

export interface PlanOptions {
  guarantees: GuaranteeDefinition[];
  currentDigests: GuaranteeDigestMap;
  resultsByDigest: Record<string, TestExecutionResult | undefined>;
  forceAll?: boolean;
}

/**
 * Minimality Planner for Selective Retesting.
 * Computes strictly the minimal set of diagnostic tests that must be executed.
 * A test is scheduled if and only if its target guarantee's CURRENT digest
 * lacks a verified PASS result.
 */
export function planRequiredTests(options: PlanOptions): TestId[] {
  const { guarantees, currentDigests, resultsByDigest, forceAll } = options;

  if (forceAll) {
    return guarantees.map((g) => g.testId);
  }

  const planned: TestId[] = [];

  for (const guarantee of guarantees) {
    const digest = currentDigests[guarantee.id];
    const existingResult = digest ? resultsByDigest[digest] : undefined;

    // A guarantee is satisfied iff there is an existing PASS for its current digest
    const isSatisfied = existingResult !== undefined && existingResult.status === 'PASS';

    if (!isSatisfied) {
      if (!planned.includes(guarantee.testId)) {
        planned.push(guarantee.testId);
      }
    }
  }

  return planned;
}

/**
 * Checks whether an old test result satisfies a given guarantee digest.
 * An old result satisfies a digest iff its guaranteeDigest exactly matches.
 */
export function isResultValidForDigest(
  result: TestExecutionResult | undefined,
  currentDigest: string
): boolean {
  if (!result || result.status !== 'PASS') {
    return false;
  }
  return result.guaranteeDigest === currentDigest;
}
