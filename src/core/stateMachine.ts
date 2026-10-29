import type { AssuranceState, GuaranteeId } from '../types';

export interface StateEvaluationInput {
  currentState: AssuranceState;
  ledgerStatus: 'VALID' | 'TAMPERED' | 'INCOMPLETE' | 'UNCHECKED';
  hasFailures: boolean;
  failingGuarantees?: GuaranteeId[];
  isRemediatedToBaseline: boolean;
  isDriftedFromVerified: boolean;
  allGuaranteesPassed: boolean;
  staleGuaranteeCount: number;
}

/**
 * Pure Deterministic State Machine for Bayora Assurance States.
 * Evaluates strict precedence rules:
 * Rule 1 (Highest): Ledger Tampering or Incompleteness forces UNVERIFIED (Fail-closed lockdown).
 * Rule 2: Active boundary violation (probe failure) forces BREACHED.
 * Rule 3: Remediation to baseline from BREACHED transitions to RECOVERING.
 * Rule 4: Security configuration drift from VERIFIED transitions to STALE.
 * Rule 5: Passing all guarantees under clean ledger and matching configuration transitions to VERIFIED.
 * Rule 6: Partial passes from UNVERIFIED remain UNVERIFIED.
 */
export function computeAssuranceState(input: StateEvaluationInput): AssuranceState {
  const {
    currentState,
    ledgerStatus,
    hasFailures,
    isRemediatedToBaseline,
    isDriftedFromVerified,
    allGuaranteesPassed,
    staleGuaranteeCount,
  } = input;

  // Rule 1: Ledger Tamper / Completeness Failure -> UNVERIFIED Lockdown
  if (ledgerStatus === 'TAMPERED' || ledgerStatus === 'INCOMPLETE') {
    return 'UNVERIFIED';
  }

  // Rule 2: Active Breach (Confirmed Probe Failure) -> BREACHED
  if (hasFailures) {
    return 'BREACHED';
  }

  // Rule 3: Remediation to baseline from BREACHED -> RECOVERING
  if (currentState === 'BREACHED') {
    if (isRemediatedToBaseline) {
      if (allGuaranteesPassed && staleGuaranteeCount === 0 && ledgerStatus === 'VALID') {
        return 'VERIFIED';
      }
      return 'RECOVERING';
    }
    return 'BREACHED';
  }

  // If in RECOVERING, stay in RECOVERING until all passes restore VERIFIED
  if (currentState === 'RECOVERING') {
    if (allGuaranteesPassed && staleGuaranteeCount === 0 && (ledgerStatus === 'VALID' || ledgerStatus === 'UNCHECKED')) {
      return 'VERIFIED';
    }
    if (isDriftedFromVerified && !isRemediatedToBaseline) {
      return 'STALE';
    }
    return 'RECOVERING';
  }

  // Rule 4: Configuration Drift from VERIFIED -> STALE
  if (currentState === 'VERIFIED') {
    if (isDriftedFromVerified || staleGuaranteeCount > 0) {
      return 'STALE';
    }
    return 'VERIFIED';
  }

  // Rule 5: STALE remains STALE until all affected guarantees pass
  if (currentState === 'STALE') {
    if (allGuaranteesPassed && staleGuaranteeCount === 0 && !isDriftedFromVerified && (ledgerStatus === 'VALID' || ledgerStatus === 'UNCHECKED')) {
      return 'VERIFIED';
    }
    return 'STALE';
  }

  // Rule 6: Full verification from UNVERIFIED
  if (currentState === 'UNVERIFIED') {
    if (allGuaranteesPassed && staleGuaranteeCount === 0 && !isDriftedFromVerified && (ledgerStatus === 'VALID' || ledgerStatus === 'UNCHECKED')) {
      return 'VERIFIED';
    }
    return 'UNVERIFIED';
  }

  return 'UNVERIFIED';
}
