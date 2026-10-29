export type PageId =
  | 'dashboard'
  | 'models'
  | 'security'
  | 'redteam'
  | 'evaluations'
  | 'datasets'
  | 'profile'
  | 'settings';

export interface PlatformSettings {
  timeout_seconds: number;
  concurrency: number;
  active_models: string[];
  active_policies: string[];
  theme: 'light' | 'dark' | 'system';
  log_level: 'error' | 'warn' | 'info' | 'debug';
  default_dataset: string;
  streaming_enabled: boolean;
}

// =========================================================================
// SentinelFlow Assurance, Guarantee & Isolation Types
// =========================================================================

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
  [key: string]: string;
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

export interface BenchmarkMetrics {
  mutationDetectionRate: number;
  falsePositiveRate: number;
  selectiveRetestReduction: number;
  fullRunDurationMs: number;
  selectiveRunDurationMs: number;
  timeToDetectMs: number | null;
  recoveryLatencyMs: number | null;
  lastMutationApplied: string | null;
}

export interface SignedCheckpoint {
  checkpoint_id: string;
  run_id: string;
  root_event_hash: string;
  timestamp: string;
  key_id: string;
  signature: string;
  algorithm: string;
}

// =========================================================================
// Bayora Platform Types
// =========================================================================

export interface VerificationStep {
  step: number;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIPPED' | string;
  latencyMs?: number;
  nonce?: string;
  error?: string;
}

export interface VerificationReport {
  verifiedAt?: string;
  timestamp?: string;
  diagnostic?: string;
  nonceEchoVerified?: boolean;
  pingMs?: number;
  steps?: VerificationStep[];
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  identifier: string;
  version: string;
  description: string;
  model_type: string;
  execution_mode: 'Simulation' | 'Mock API' | 'Live' | 'Ollama' | 'OpenAI-Compatible';
  endpoint?: string;
  status: 'Active' | 'Testing' | 'FAILED_VERIFICATION' | 'PULLING' | 'Archived';
  registered_at: string;
  risk_score: number | null;
  total_evaluations: number;
  pass_rate: number | null;
  verification_details?: VerificationReport | string;
  file_path?: string;
  sha256?: string;
}

export interface DatasetCase {
  id: string;
  dataset_id: string;
  category: string;
  prompt: string;
  expected_behavior: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  evaluation_method: string;
  reference_response?: string;
  metadata?: string;
}

export interface Dataset {
  id: string;
  name: string;
  version: string;
  description: string;
  total_cases: number;
  categories: string[];
  is_builtin: number;
  created_at: string;
  updated_at: string;
  cases?: DatasetCase[];
}

export interface Evaluation {
  id: string;
  name: string;
  preset_scenario: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  models: string[]; // JSON array
  categories: string[]; // JSON array
  total_cases: number;
  passed_count: number;
  warning_count: number;
  failed_count: number;
  risk_score: number;
  execution_duration_ms: number;
  estimated_duration?: string;
  execution_settings: string;
  created_at: string;
  completed_at?: string;
  findings?: Finding[];
}

export interface Finding {
  id: string;
  evaluation_id: string;
  model_id: string;
  model_name: string;
  category: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Failed' | 'Warning' | 'Passed';
  test_case_prompt: string;
  observed_response: string;
  expected_behavior: string;
  explanation: string;
  policy_violated?: string;
  risk_score: number;
  evidence: string;
  mitigation: string;
  created_at: string;
}

export type PolicyMode = 'OFF' | 'MONITOR' | 'ENFORCE';

export interface Policy {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  mode?: PolicyMode;
  is_enabled: number;
  rules: string | Record<string, any>;
  version: string;
  updated_at: string;
  updated_by?: string;
  effect?: string;
  tool?: string;
}

export interface PolicyHistoryItem {
  id: number;
  policy_id: string;
  previous_mode: PolicyMode;
  new_mode: PolicyMode;
  diff_json: string;
  reason: string;
  actor: string;
  fingerprint_before: string;
  fingerprint_after: string;
  created_at: string;
}

export interface CriticalStatusResponse {
  anyDisabled: boolean;
  disabled: Array<{
    policyId: string;
    name: string;
    severity: string;
    mode: PolicyMode;
  }>;
  fingerprint: string;
}

export interface PolicyTestResult {
  policyId: string;
  mode: PolicyMode;
  effectiveVerdict: 'Pass' | 'Warning' | 'Fail';
  score: number;
  explanation: string;
  matchedSpans: Array<{ start: number; end: number; text: string }>;
  redactedText?: string;
  simulatedTimeMs: number;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  description: string;
  blocked: number;
  target: string;
}

export interface TrendPoint {
  day: string;
  date: string;
  testRuns: number;
  hallucinationRate: number;
}

export interface SecurityCategoryRisk {
  category: string;
  riskScore: number | null;
  severity: string;
  statusColor: string;
  sampleSize?: number;
  provenance?: string;
}

export interface BenchmarkAxis {
  axis: string;
  score: number | null;
  fullMark: number;
  sampleSize?: number;
  provenance?: string;
}

export interface AttackSuccessCategory {
  category: string;
  successRate: number;
  attempts: number;
  breaches?: number;
  ci95Low?: number;
  ci95High?: number;
  provenance?: string;
}

export interface DashboardSummary {
  totalRuns: number;
  passedRuns: number;
  warningRuns: number;
  failedRuns: number;
  passRate: number | null;
  warningRate: number | null;
  failedRate: number | null;
  ribbonValid?: boolean;
  syntheticDataMode?: boolean;
  trends7d: TrendPoint[];
  securityOverview: SecurityCategoryRisk[];
  benchmarkProfile: BenchmarkAxis[];
  attackSuccess: AttackSuccessCategory[];
}

export interface AuditRecord {
  sequence: number;
  event_id: string;
  evaluation_id: string;
  timestamp: string;
  event_type: string;
  canonical_payload: string;
  previous_hash: string;
  hash: string;
}

export interface AuditVerification {
  verified: boolean;
  totalRecords?: number;
  latestHash?: string;
  brokenSequence?: number;
  reason?: string;
  message: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  timestamp: string;
  read: boolean;
}

// =========================================================================
// Real Isolation Probes & Mutation Lab Types (Phase 10)
// =========================================================================

export interface ProbeRawEvidence {
  command?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  errno?: string | number;
  ps?: string;
  error?: string;
  [key: string]: any;
}

export interface ProbeTestResult {
  probeId: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'UNVERIFIED';
  latencyMs: number;
  evidence: ProbeRawEvidence;
}

export interface ProbeRunResult {
  runId: string;
  timestamp: string;
  overallStatus: 'BREACHED' | 'UNVERIFIED' | 'VERIFIED';
  score: number;
  dockerAvailable: boolean;
  results: ProbeTestResult[];
}

export interface StepContractItem {
  step: number;
  name: string;
  status: string;
  details?: string;
}

export interface RetestResultItem {
  caseId: string;
  category: string;
  prompt: string;
  verdict: 'Passed' | 'Warning' | 'Failed';
  breachDetected: boolean;
  oracleReason: string;
  latencyMs: number;
}

export interface LabCatalogItem {
  id: string;
  legacyId?: string;
  tier: 'TIER_A' | 'TIER_B';
  name: string;
  target: string;
  description: string;
  requiresDocker: boolean;
}

export interface LabStatus {
  labModeEnabled: boolean;
  dockerAvailable: boolean;
  activeMutation?: any;
  requiresDockerNotice?: string | null;
  catalog?: {
    tierA: LabCatalogItem[];
    tierB: LabCatalogItem[];
  };
  error?: string;
}

export interface LabMutationResult {
  mutationId: string;
  name: string;
  tier?: string;
  executed: boolean;
  status: string;
  fpBefore?: string;
  fpAfter?: string;
  fingerprintChanged?: boolean;
  breachDetected?: boolean;
  retestCount?: number;
  retestResults?: RetestResultItem[];
  stepLog?: StepContractItem[];
  details?: string;
  error?: string;
}

export interface AdvisorIncidentResponse {
  id: string;
  contextId?: string;
  source: 'llm' | 'template';
  incidentSummary: string;
  rootCause: string;
  mitigations: string[];
  schemaValid: boolean;
  latencyMs: number;
  advisoryBadge: string;
}

