import { describe, it, expect } from 'vitest';
import { canonicalJson } from '../src/core/canonical';
import { computeAssuranceState, type StateEvaluationInput } from '../src/core/stateMachine';
import { planRequiredTests, isResultValidForDigest } from '../src/core/planner';
import { detectCanaryLeak } from '../src/core/leakDetector';
import { validateTicket, type SignedTicket } from '../src/core/tickets';
import { validateAnalystOutput, buildDeterministicFallback } from '../src/core/analyst';
import {
  computeConfigFingerprint,
  computeGuaranteeDigests,
  GENESIS_HASH,
  hashEventPayload,
  verifyEvidenceChain,
} from '../src/utils/crypto';
import { BASELINE_CONFIG, GUARANTEES } from '../src/services/simulation';
import type { EvidenceEvent, TestExecutionResult, SimulatedConfig } from '../src/types';

describe('1. Canonicalization & Digest Stability', () => {
  it('sorts keys lexicographically at all nested levels', () => {
    const a = { z: 1, a: { y: 2, b: 3 }, m: 4 };
    const b = { m: 4, a: { b: 3, y: 2 }, z: 1 };
    expect(canonicalJson(a)).toBe('{"a":{"b":3,"y":2},"m":4,"z":1}');
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it('omits undefined properties without producing invalid JSON', () => {
    const obj = { a: 1, b: undefined, c: 'hello' };
    const json = canonicalJson(obj);
    expect(json).toBe('{"a":1,"c":"hello"}');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('preserves fingerprint stability under array reordering of security configs', async () => {
    const configA: SimulatedConfig = {
      ...BASELINE_CONFIG,
      redMounts: ['/opt/red/workspace', '/opt/red/scratch'],
      redNetworks: ['net-b', 'net-a'],
      hardeningFlags: {
        ...BASELINE_CONFIG.hardeningFlags,
        dropCapabilities: ['CAP_NET_RAW', 'ALL'],
      },
    };

    const configB: SimulatedConfig = {
      ...BASELINE_CONFIG,
      redMounts: ['/opt/red/scratch', '/opt/red/workspace'],
      redNetworks: ['net-a', 'net-b'],
      hardeningFlags: {
        ...BASELINE_CONFIG.hardeningFlags,
        dropCapabilities: ['ALL', 'CAP_NET_RAW'],
      },
    };

    const fpA = await computeConfigFingerprint(configA);
    const fpB = await computeConfigFingerprint(configB);
    expect(fpA).toBe(fpB);

    const digA = await computeGuaranteeDigests(configA);
    const digB = await computeGuaranteeDigests(configB);
    expect(digA.G1).toBe(digB.G1);
    expect(digA.G2).toBe(digB.G2);
    expect(digA.G5).toBe(digB.G5);
  });

  it('proves metadata label edits (B1) leave security fingerprint invariant', async () => {
    const baseFp = await computeConfigFingerprint(BASELINE_CONFIG);

    const modifiedConfig: SimulatedConfig = {
      ...BASELINE_CONFIG,
      labels: {
        'env': 'eval-sandbox-us-east',
        'tier': 'safety-sandbox',
        'audit.tag': 'mutated-label-for-test',
        'operator.name': 'secops-alice',
        'new.annotation': 'routine-inspection',
      },
    };

    const newFp = await computeConfigFingerprint(modifiedConfig);
    expect(newFp).toBe(baseFp);
  });
});

describe('2. State Machine Truth Table (24 Precedence Scenarios)', () => {
  const baseInput: StateEvaluationInput = {
    currentState: 'UNVERIFIED',
    ledgerStatus: 'VALID',
    hasFailures: false,
    isRemediatedToBaseline: false,
    isDriftedFromVerified: false,
    allGuaranteesPassed: false,
    staleGuaranteeCount: 0,
  };

  const cases: Array<{ desc: string; input: StateEvaluationInput; expected: string }> = [
    // Precedence 1: Ledger Tamper & Incomplete Lockdown
    {
      desc: 'Case 01: TAMPERED ledger forces UNVERIFIED from VERIFIED',
      input: { ...baseInput, currentState: 'VERIFIED', ledgerStatus: 'TAMPERED', allGuaranteesPassed: true },
      expected: 'UNVERIFIED',
    },
    {
      desc: 'Case 02: INCOMPLETE ledger forces UNVERIFIED from VERIFIED',
      input: { ...baseInput, currentState: 'VERIFIED', ledgerStatus: 'INCOMPLETE', allGuaranteesPassed: true },
      expected: 'UNVERIFIED',
    },
    {
      desc: 'Case 03: TAMPERED ledger forces UNVERIFIED even with active failures',
      input: { ...baseInput, currentState: 'BREACHED', ledgerStatus: 'TAMPERED', hasFailures: true },
      expected: 'UNVERIFIED',
    },
    {
      desc: 'Case 04: INCOMPLETE ledger forces UNVERIFIED during RECOVERING',
      input: { ...baseInput, currentState: 'RECOVERING', ledgerStatus: 'INCOMPLETE', isRemediatedToBaseline: true },
      expected: 'UNVERIFIED',
    },

    // Precedence 2: Active Failures -> BREACHED
    {
      desc: 'Case 05: Single probe failure transitions VERIFIED to BREACHED',
      input: { ...baseInput, currentState: 'VERIFIED', hasFailures: true },
      expected: 'BREACHED',
    },
    {
      desc: 'Case 06: Probe failure during STALE transitions to BREACHED',
      input: { ...baseInput, currentState: 'STALE', hasFailures: true, isDriftedFromVerified: true },
      expected: 'BREACHED',
    },
    {
      desc: 'Case 07: Probe failure during RECOVERING transitions to BREACHED',
      input: { ...baseInput, currentState: 'RECOVERING', hasFailures: true, isRemediatedToBaseline: true },
      expected: 'BREACHED',
    },
    {
      desc: 'Case 08: Probe failure in UNVERIFIED transitions to BREACHED',
      input: { ...baseInput, currentState: 'UNVERIFIED', hasFailures: true },
      expected: 'BREACHED',
    },
    {
      desc: 'Case 09: Multiple simultaneous failures transition to BREACHED',
      input: { ...baseInput, currentState: 'VERIFIED', hasFailures: true, staleGuaranteeCount: 3 },
      expected: 'BREACHED',
    },

    // Precedence 3: Remediation -> RECOVERING
    {
      desc: 'Case 10: Baseline remediation from BREACHED transitions to RECOVERING',
      input: { ...baseInput, currentState: 'BREACHED', isRemediatedToBaseline: true, hasFailures: false },
      expected: 'RECOVERING',
    },
    {
      desc: 'Case 11: BREACHED without baseline remediation stays BREACHED',
      input: { ...baseInput, currentState: 'BREACHED', isRemediatedToBaseline: false, hasFailures: false },
      expected: 'BREACHED',
    },
    {
      desc: 'Case 12: RECOVERING with partial passes stays RECOVERING',
      input: { ...baseInput, currentState: 'RECOVERING', isRemediatedToBaseline: true, allGuaranteesPassed: false, staleGuaranteeCount: 1 },
      expected: 'RECOVERING',
    },
    {
      desc: 'Case 13: RECOVERING with all passes restores VERIFIED',
      input: { ...baseInput, currentState: 'RECOVERING', isRemediatedToBaseline: true, allGuaranteesPassed: true, staleGuaranteeCount: 0 },
      expected: 'VERIFIED',
    },
    {
      desc: 'Case 14: RECOVERING that drifts away from baseline transitions to STALE',
      input: { ...baseInput, currentState: 'RECOVERING', isRemediatedToBaseline: false, isDriftedFromVerified: true },
      expected: 'STALE',
    },

    // Precedence 4: Configuration Drift -> STALE
    {
      desc: 'Case 15: Security config drift from VERIFIED transitions to STALE',
      input: { ...baseInput, currentState: 'VERIFIED', isDriftedFromVerified: true, staleGuaranteeCount: 1 },
      expected: 'STALE',
    },
    {
      desc: 'Case 16: VERIFIED with stale guarantees count > 0 transitions to STALE',
      input: { ...baseInput, currentState: 'VERIFIED', staleGuaranteeCount: 2 },
      expected: 'STALE',
    },
    {
      desc: 'Case 17: STALE with selective retest pending stays STALE',
      input: { ...baseInput, currentState: 'STALE', isDriftedFromVerified: true, allGuaranteesPassed: false, staleGuaranteeCount: 1 },
      expected: 'STALE',
    },
    {
      desc: 'Case 18: STALE resolved by passing all selective checks restores VERIFIED',
      input: { ...baseInput, currentState: 'STALE', isDriftedFromVerified: false, allGuaranteesPassed: true, staleGuaranteeCount: 0 },
      expected: 'VERIFIED',
    },

    // Precedence 5: Clean Full Verification -> VERIFIED
    {
      desc: 'Case 19: Full suite pass from UNVERIFIED transitions to VERIFIED',
      input: { ...baseInput, currentState: 'UNVERIFIED', allGuaranteesPassed: true, staleGuaranteeCount: 0, isDriftedFromVerified: false },
      expected: 'VERIFIED',
    },
    {
      desc: 'Case 20: Partial pass (3 of 5) from UNVERIFIED remains UNVERIFIED',
      input: { ...baseInput, currentState: 'UNVERIFIED', allGuaranteesPassed: false, staleGuaranteeCount: 2 },
      expected: 'UNVERIFIED',
    },
    {
      desc: 'Case 21: UNVERIFIED with 0 tests run remains UNVERIFIED',
      input: { ...baseInput, currentState: 'UNVERIFIED', allGuaranteesPassed: false },
      expected: 'UNVERIFIED',
    },
    {
      desc: 'Case 22: VERIFIED remains VERIFIED when configuration matches baseline',
      input: { ...baseInput, currentState: 'VERIFIED', isDriftedFromVerified: false, staleGuaranteeCount: 0 },
      expected: 'VERIFIED',
    },
    {
      desc: 'Case 23: All passes with UNCHECKED ledger status transitions to VERIFIED',
      input: { ...baseInput, currentState: 'UNVERIFIED', ledgerStatus: 'UNCHECKED', allGuaranteesPassed: true },
      expected: 'VERIFIED',
    },
    {
      desc: 'Case 24: Direct remediation from BREACHED with all passes immediately VERIFIED',
      input: { ...baseInput, currentState: 'BREACHED', isRemediatedToBaseline: true, allGuaranteesPassed: true, staleGuaranteeCount: 0, ledgerStatus: 'VALID' },
      expected: 'VERIFIED',
    },
  ];

  cases.forEach(({ desc, input, expected }) => {
    it(desc, () => {
      const actual = computeAssuranceState(input);
      expect(actual).toBe(expected);
    });
  });
});

describe('3. Planner Minimality & Guarantee Digest Keying', () => {
  const dummyDigests = {
    G1: 'digest-g1-alpha',
    G2: 'digest-g2-alpha',
    G3: 'digest-g3-alpha',
    G4: 'digest-g4-alpha',
    G5: 'digest-g5-alpha',
  };

  const createResult = (testId: any, guaranteeId: any, digest: string, status: 'PASS' | 'FAIL'): TestExecutionResult => ({
    testId,
    guaranteeId,
    guaranteeDigest: digest,
    status,
    durationMs: 4,
    message: 'Test run',
    details: 'Execution verified',
    evaluatedAt: new Date().toISOString(),
  });

  it('plans all 5 tests when resultsByDigest is empty', () => {
    const planned = planRequiredTests({
      guarantees: GUARANTEES,
      currentDigests: dummyDigests,
      resultsByDigest: {},
    });
    expect(planned).toEqual(['T01', 'T02', 'T03', 'T04', 'T05']);
  });

  it('plans ONLY the drifted test when 4 of 5 guarantees have valid PASS for their current digest', () => {
    // G1, G2, G4, G5 have valid PASS for current digests; G3 has drifted to a new digest
    const resultsByDigest: Record<string, TestExecutionResult> = {
      'digest-g1-alpha': createResult('T01', 'G1', 'digest-g1-alpha', 'PASS'),
      'digest-g2-alpha': createResult('T02', 'G2', 'digest-g2-alpha', 'PASS'),
      // Notice: digest-g3-alpha is missing or only an old digest exists
      'digest-g4-alpha': createResult('T04', 'G4', 'digest-g4-alpha', 'PASS'),
      'digest-g5-alpha': createResult('T05', 'G5', 'digest-g5-alpha', 'PASS'),
    };

    const planned = planRequiredTests({
      guarantees: GUARANTEES,
      currentDigests: dummyDigests,
      resultsByDigest,
    });

    expect(planned).toEqual(['T03']); // Minimality: exactly T03 planned
  });

  it('proves an old result never satisfies a mutated guarantee digest', () => {
    const oldDigest = 'digest-g3-old-v1';
    const newDigest = 'digest-g3-mutated-v2';

    const oldResult = createResult('T03', 'G3', oldDigest, 'PASS');

    // Check validity against old vs new digest
    expect(isResultValidForDigest(oldResult, oldDigest)).toBe(true);
    expect(isResultValidForDigest(oldResult, newDigest)).toBe(false);

    // Planner check: having old result in store does NOT satisfy new digest
    const resultsByDigest = {
      [oldDigest]: oldResult,
    };

    const planned = planRequiredTests({
      guarantees: [GUARANTEES.find((g) => g.id === 'G3')!],
      currentDigests: { ...dummyDigests, G3: newDigest },
      resultsByDigest,
    });

    expect(planned).toEqual(['T03']);
  });
});

describe('4. Ledger Integrity, Genesis, Tamper & Drop Detection', () => {
  it('anchors first event to GENESIS_HASH and validates continuous sequence', async () => {
    const runId = 'test-run-vitest';
    const timestamp = new Date().toISOString();

    const ev1Hash = await hashEventPayload(1, runId, timestamp, 'run.started', { tests: ['T01'] }, GENESIS_HASH);
    const ev1: EvidenceEvent = {
      sequence: 1,
      run_id: runId,
      timestamp,
      event_type: 'run.started',
      payload: { tests: ['T01'] },
      previous_event_hash: GENESIS_HASH,
      event_hash: ev1Hash,
    };

    const ev2Hash = await hashEventPayload(2, runId, timestamp, 'test.completed', { status: 'PASS' }, ev1Hash);
    const ev2: EvidenceEvent = {
      sequence: 2,
      run_id: runId,
      timestamp,
      event_type: 'test.completed',
      payload: { status: 'PASS' },
      previous_event_hash: ev1Hash,
      event_hash: ev2Hash,
    };

    const report = await verifyEvidenceChain([ev1, ev2]);
    expect(report.status).toBe('VALID');
    expect(report.totalEvents).toBe(2);
  });

  it('detects payload tampering as TAMPERED', async () => {
    const runId = 'run-tamper';
    const ts = new Date().toISOString();
    const ev1Hash = await hashEventPayload(1, runId, ts, 'run.started', { ok: true }, GENESIS_HASH);
    const ev1: EvidenceEvent = {
      sequence: 1,
      run_id: runId,
      timestamp: ts,
      event_type: 'run.started',
      payload: { ok: true },
      previous_event_hash: GENESIS_HASH,
      event_hash: ev1Hash,
    };

    const ev2Hash = await hashEventPayload(2, runId, ts, 'test.completed', { status: 'FAIL' }, ev1Hash);
    const ev2Tampered: EvidenceEvent = {
      sequence: 2,
      run_id: runId,
      timestamp: ts,
      event_type: 'test.completed',
      payload: { status: 'PASS' }, // Forged payload without updating event_hash
      previous_event_hash: ev1Hash,
      event_hash: ev2Hash,
    };

    const report = await verifyEvidenceChain([ev1, ev2Tampered]);
    expect(report.status).toBe('TAMPERED');
    expect(report.brokenSequenceIndex).toBe(1);
  });

  it('detects dropped event against expected_plan as INCOMPLETE', async () => {
    const runId = 'run-incomplete';
    const ts = new Date().toISOString();

    const expectedPlan = ['manifest.captured', 'test.started:T01', 'test.completed:T01', 'policy.decision'];

    const ev1Hash = await hashEventPayload(1, runId, ts, 'run.started', { expected_plan: expectedPlan }, GENESIS_HASH);
    const ev1: EvidenceEvent = {
      sequence: 1,
      run_id: runId,
      timestamp: ts,
      event_type: 'run.started',
      payload: { expected_plan: expectedPlan },
      previous_event_hash: GENESIS_HASH,
      event_hash: ev1Hash,
    };

    // Missing test.started:T01 and test.completed:T01
    const ev2Hash = await hashEventPayload(2, runId, ts, 'manifest.captured', {}, ev1Hash);
    const ev2: EvidenceEvent = {
      sequence: 2,
      run_id: runId,
      timestamp: ts,
      event_type: 'manifest.captured',
      payload: {},
      previous_event_hash: ev1Hash,
      event_hash: ev2Hash,
    };

    const report = await verifyEvidenceChain([ev1, ev2]);
    expect(report.status).toBe('INCOMPLETE');
    expect(report.missingEvents).toContain('test.started:T01');
    expect(report.missingEvents).toContain('test.completed:T01');
  });
});

describe('5. Ticket Validation & Instant Invalidation', () => {
  const currentFp = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const now = Date.now();

  const validTicket: SignedTicket = {
    ticketId: 'TKT-TEST-001',
    issuedAt: new Date(now - 60000).toISOString(),
    expiresAt: new Date(now + 14 * 60 * 1000).toISOString(),
    manifestFingerprint: currentFp,
    keyId: 'software-key-01',
    signature: 'mock-sig-abc',
  };

  it('validates a fresh ticket matching current fingerprint', () => {
    const res = validateTicket(validTicket, currentFp, now);
    expect(res.valid).toBe(true);
  });

  it('immediately invalidates ticket when configuration fingerprint changes', () => {
    const mutatedFp = '1111111111111111111111111111111111111111111111111111111111111111';
    const res = validateTicket(validTicket, mutatedFp, now);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Fingerprint mismatch');
  });

  it('rejects ticket when 15-minute TTL expires', () => {
    const expiredTicket: SignedTicket = {
      ...validTicket,
      issuedAt: new Date(now - 20 * 60 * 1000).toISOString(),
      expiresAt: new Date(now - 5 * 60 * 1000).toISOString(),
    };
    const res = validateTicket(expiredTicket, currentFp, now);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Ticket expired');
  });

  it('rejects null or missing ticket', () => {
    expect(validateTicket(null, currentFp).valid).toBe(false);
    expect(validateTicket(undefined, currentFp).valid).toBe(false);
  });
});

describe('6. Canary Leak Detector Pure Function', () => {
  const token = 'BYR-9F4D2A1C';

  it('detects direct canary token leak', () => {
    const resp = `The confidential code you requested is BYR-9F4D2A1C from session history.`;
    const result = detectCanaryLeak(resp, token);
    expect(result.leaked).toBe(true);
    expect(result.excerpt).toBeDefined();
    expect(result.excerpt).toContain('[REDACTED_CANARY:');
  });

  it('detects case-insensitive and normalized canary leak', () => {
    const resp = `Found audit key: byr-9f4d2a1c in cache.`;
    const result = detectCanaryLeak(resp, token);
    expect(result.leaked).toBe(true);
  });

  it('reports no leak when canary token is absent', () => {
    const resp = `Session isolation active. I cannot disclose information from other sessions.`;
    const result = detectCanaryLeak(resp, token);
    expect(result.leaked).toBe(false);
    expect(result.excerpt).toBeNull();
  });
});

describe('7. AI Analyst Validation & Template Fallback', () => {
  const allowedRefs = ['ev-t04-trial-1', 'ev-t04-trial-2'];

  it('validates compliant AI analyst output with cited evidence', () => {
    const rawAiOutput = {
      summary: 'Cross-session canary token leak detected in model proxy cache.',
      whatChanged: 'Gateway configuration toggled to shared-cache pool.',
      attackerImpact: 'Adversary in red harness extracted blue evaluation canary token.',
      fixSteps: ['Revert gateway to per-session mode', 'Flush KV prefix cache', 'Re-run T04'],
      evidenceRefs: ['ev-t04-trial-1'],
    };

    const res = validateAnalystOutput(rawAiOutput, allowedRefs);
    expect(res.valid).toBe(true);
    expect(res.data?.summary).toBe(rawAiOutput.summary);
  });

  it('rejects AI output citing hallucinated/uncited evidence references', () => {
    const hallucinatedOutput = {
      summary: 'Memory exhaustion attack occurred.',
      whatChanged: 'Container memory limit removed.',
      attackerImpact: 'Denial of service across cluster.',
      fixSteps: ['Set cgroups limit'],
      evidenceRefs: ['ev-non-existent-log-999'], // Not in allowedRefs!
    };

    const res = validateAnalystOutput(hallucinatedOutput, allowedRefs);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Uncited/hallucinated evidence references');
  });

  it('builds grounded deterministic template fallback from live evidence', () => {
    const fallback = buildDeterministicFallback({
      failedCheckId: 'T04',
      guaranteeId: 'G4',
      guaranteeName: 'Model Session Confidentiality',
      failureMessage: 'Canary token BYR-1234 leaked into Session B response',
      failureDetails: 'Context cache shared prefix bleed observed in trial 2 of 5',
      diffSummary: 'gatewaySessionIsolation: strict -> shared',
      evidenceRefs: ['ev-t04-trial-2'],
    });

    expect(fallback.summary).toContain('G4');
    expect(fallback.evidenceRefs).toEqual(['ev-t04-trial-2']);
    expect(fallback.fixSteps.length).toBeGreaterThanOrEqual(1);

    // Verify that fallback itself satisfies AnalystOutputSchema
    const validated = validateAnalystOutput(fallback, ['ev-t04-trial-2']);
    expect(validated.valid).toBe(true);
  });
});
