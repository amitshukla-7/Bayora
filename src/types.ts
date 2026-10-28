export type AssuranceState =
  | 'UNVERIFIED'
  | 'VERIFIED'
  | 'STALE'
  | 'BREACHED'
  | 'RECOVERING';

export type GuaranteeId = 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
export type TestId = 'T01' | 'T02' | 'T03' | 'T04' | 'T05';

export interface HardeningFlags {
  readOnlyRoot: boolean;
  dropCapabilities: string[];
  noNewPrivileges: boolean;
  seccompProfile: string;
}

export interface SimulatedConfig {
  redMounts: string[];
  redNetworks: string[];
  storageApiAuthz: 'strict' | 'relaxed';
  gatewaySessionIsolation: 'strict' | 'shared';
  hardeningFlags: HardeningFlags;
  labels: Record<string, string>; // benign metadata
}

export interface GuaranteeDigestMap {
  G1: string;
  G2: string;
  G3: string;
  G4: string;
  G5: string;
}

export interface GuaranteeDefinition {
  id: GuaranteeId;
  name: string;
  testId: TestId;
  testName: string;
  description: string;
  targetRole: 'red' | 'blue' | 'model-gateway' | 'infrastructure';
  threatModelRisk: string;
}

export interface ProbeTrial {
  trialNumber: number;
  canaryToken: string;
  sessionAPrompt: string;
  sessionAResponse: string;
  sessionBPrompt: string;
  sessionBResponse: string;
  leaked: boolean;
  durationMs: number;
  excerpt?: string | null;
  transcriptSha256: string;
}

export interface TestExecutionResult {
  testId: TestId;
  guaranteeId: GuaranteeId;
  guaranteeDigest?: string;
  status: 'PASS' | 'FAIL';
  durationMs: number;
  message: string;
  details: string;
  evaluatedAt: string;
  trials?: ProbeTrial[];
  source?: 'live' | 'cached';
  tag?: string;
  leakCount?: number;
  totalTrials?: number;
}

/**
 * 7-Stage Declared Lifecycle Event Types (Section 9.2)
 */
export type EventType =
  | 'run.started'
  | 'manifest.captured'
  | 'test.started'
  | 'test.completed'
  | 'policy.decision'
  | 'checkpoint.signed'
  | 'run.completed';

export interface EvidenceEvent {
  sequence: number;
  run_id: string;
  timestamp: string;
  event_type: EventType;
  payload: Record<string, any>;
  previous_event_hash: string;
  event_hash: string;
}

export type ChainValidationStatus = 'VALID' | 'TAMPERED' | 'INCOMPLETE';

export interface ChainVerificationReport {
  status: ChainValidationStatus;
  totalEvents: number;
  validCount: number;
  brokenSequenceIndex: number | null;
  errorMessage: string | null;
  tamperedEvent?: EvidenceEvent;
  expectedHash?: string;
  actualHash?: string;
  missingEvents?: string[];
  signatureValid?: boolean;
}

export interface GateEvaluationResult {
  decision: 'GRANTED' | 'DENIED';
  timestamp: string;
  currentFingerprint: string;
  verifiedFingerprint: string | null;
  reasons: string[];
  requiredTests: TestId[];
  ticketId?: string;
}

/**
 * Decoupled Status Fields Schema (Section 4.3)
 */
export type ConfigurationStatus = 'BASELINE' | 'DRIFTED' | 'REMEDIATED';
export type PolicyTestStatus = 'PASS' | 'FAIL' | 'PENDING';
export type EvidenceIntegrityStatus = 'VALID' | 'TAMPERED' | 'UNCHECKED';
export type EvidenceCompletenessStatus = 'COMPLETE' | 'INCOMPLETE' | 'UNCHECKED';

export interface DecoupledAssuranceSnapshot {
  run_id: string;
  environment_id: string;
  manifest_digest: string;
  configuration_status: ConfigurationStatus;
  policy_test_status: PolicyTestStatus;
  evidence_integrity_status: EvidenceIntegrityStatus;
  evidence_completeness_status: EvidenceCompletenessStatus;
  assurance_state: AssuranceState;
  drift_details: {
    affected_guarantees: GuaranteeId[];
    required_retests: TestId[];
  };
  gate_evaluation: {
    decision: 'GRANTED' | 'DENIED';
    reasons: string[];
    required_retests: TestId[];
    ticket_id?: string;
    issued_at?: string;
  };
}

/**
 * Canonical Environment Manifest (Section 8.1)
 */
export interface CanonicalManifest {
  manifest_schema: string;
  runtime: {
    name: string;
    version: string;
  };
  policy_bundle_version: string;
  test_suite_version: string;
  threat_model_version: string;
  security_relevant_config: {
    gatewaySessionIsolation: string;
    hardeningFlags: HardeningFlags;
    redMounts: string[];
    redNetworks: string[];
    storageApiAuthz: string;
  };
  configuration_digest: string;
  runtime_observation_digest: string;
}

/**
 * Benchmark & Evaluation Metrics (Section 18.1)
 */
export interface BenchmarkMetrics {
  mutationDetectionRate: number; // D (Target: 100%)
  falsePositiveRate: number; // FPR (Target: 0.0%)
  selectiveRetestReduction: number; // R (Target: > 70%)
  fullRunDurationMs: number;
  selectiveRunDurationMs: number;
  timeToDetectMs: number | null; // TTD
  recoveryLatencyMs: number | null; // T_rec
  lastMutationApplied: string | null;
}

/**
 * Checkpoint Signature Package (Section 3.1 & 9.2)
 */
export interface SignedCheckpoint {
  checkpoint_id: string;
  run_id: string;
  root_event_hash: string;
  timestamp: string;
  key_id: string;
  signature: string;
  algorithm: string;
}
