export type PageId =
  | 'dashboard'
  | 'models'
  | 'security'
  | 'redteam'
  | 'evaluations'
  | 'datasets'
  | 'profile'
  | 'pricing';

export interface Model {
  id: string;
  name: string;
  provider: string;
  identifier: string;
  version: string;
  description: string;
  model_type: string;
  execution_mode: 'Simulation' | 'Mock API' | 'Live';
  endpoint?: string;
  status: 'Active' | 'Testing' | 'Archived';
  registered_at: string;
  risk_score: number;
  total_evaluations: number;
  pass_rate: number;
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

export interface Policy {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  is_enabled: number;
  rules: string;
  version: string;
  updated_at: string;
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
  riskScore: number;
  severity: string;
  statusColor: string;
}

export interface BenchmarkAxis {
  axis: string;
  score: number;
  fullMark: number;
}

export interface AttackSuccessCategory {
  category: string;
  successRate: number;
  attempts: number;
}

export interface DashboardSummary {
  totalRuns: number;
  passedRuns: number;
  warningRuns: number;
  failedRuns: number;
  passRate: number;
  warningRate: number;
  failedRate: number;
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
