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

export interface TestExecutionResult {
  testId: TestId;
  guaranteeId: GuaranteeId;
  status: 'PASS' | 'FAIL';
  durationMs: number;
  message: string;
  details: string;
  evaluatedAt: string;
}

export type EventType =
  | 'run.started'
  | 'test.started'
  | 'test.completed'
  | 'policy.decision'
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
