import type {
  Model,
  Dataset,
  Evaluation,
  Finding,
  Policy,
  PolicyMode,
  PolicyHistoryItem,
  CriticalStatusResponse,
  PolicyTestResult,
  SecurityEvent,
  DashboardSummary,
  AuditRecord,
  AuditVerification,
  ProbeRunResult,
  LabStatus,
  LabMutationResult,
  AdvisorIncidentResponse,
  PlatformSettings,
  UserProfile,
  NotificationItem,
  PreflightResult,
  DynamicPreset,
  ActiveEvalRun
} from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bayora_auth_token');
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('bayora_auth_token', token);
  } else {
    localStorage.removeItem('bayora_auth_token');
  }
}

export function authFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return globalThis.fetch(url, { ...init, headers });
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
  expiresAt: string;
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const res = await globalThis.fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await handleResponse<AuthResponse>(res);
  setAuthToken(data.token);
  return data;
}

export async function registerApi(data: {
  email: string;
  password: string;
  name?: string;
  organization?: string;
  role?: string;
}): Promise<AuthResponse> {
  const res = await globalThis.fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const resData = await handleResponse<AuthResponse>(res);
  setAuthToken(resData.token);
  return resData;
}

export async function logoutApi(): Promise<{ success: boolean }> {
  try {
    const res = await authFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    await handleResponse<{ success: boolean }>(res);
  } catch {}
  setAuthToken(null);
  return { success: true };
}

export async function fetchCurrentUserApi(): Promise<UserProfile | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await authFetch(`${API_BASE}/auth/me`);
    if (!res.ok) {
      setAuthToken(null);
      return null;
    }
    const data = await handleResponse<{ user: UserProfile }>(res);
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Dashboard
 */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await authFetch(`${API_BASE}/dashboard/summary`);
  return handleResponse<DashboardSummary>(res);
}

/**
 * Models
 */
export async function fetchModels(): Promise<{ models: Model[]; total: number }> {
  const res = await authFetch(`${API_BASE}/models`);
  return handleResponse<{ models: Model[]; total: number }>(res);
}

export async function fetchModelById(id: string): Promise<Model> {
  const res = await authFetch(`${API_BASE}/models/${id}`);
  return handleResponse<Model>(res);
}

export async function createModel(model: Partial<Model>): Promise<Model> {
  const res = await authFetch(`${API_BASE}/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(model)
  });
  return handleResponse<Model>(res);
}

export async function deleteModel(id: string): Promise<{ success: boolean; id: string }> {
  const res = await authFetch(`${API_BASE}/models/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean; id: string }>(res);
}

export async function verifyModelApi(id: string): Promise<Model> {
  const res = await authFetch(`${API_BASE}/models/${id}/verify`, { method: 'POST' });
  return handleResponse<Model>(res);
}

export async function pullOllamaModelApi(name: string): Promise<Model> {
  const res = await authFetch(`${API_BASE}/models/pull-ollama`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return handleResponse<Model>(res);
}

export async function uploadGgufModelApi(file: File): Promise<Model> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await authFetch(`${API_BASE}/models/upload`, {
    method: 'POST',
    body: formData
  });
  return handleResponse<Model>(res);
}

export async function importHuggingFaceModelApi(repoId: string): Promise<Model> {
  const res = await authFetch(`${API_BASE}/models/import-hf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoId })
  });
  return handleResponse<Model>(res);
}

/**
 * Datasets
 */
export async function fetchDatasets(): Promise<{ datasets: Dataset[]; total: number }> {
  const res = await authFetch(`${API_BASE}/datasets`);
  return handleResponse<{ datasets: Dataset[]; total: number }>(res);
}

export async function fetchDatasetById(id: string): Promise<Dataset> {
  const res = await authFetch(`${API_BASE}/datasets/${id}`);
  return handleResponse<Dataset>(res);
}

export async function uploadDataset(dataset: {
  name: string;
  description?: string;
  cases: any[];
}): Promise<Dataset> {
  const res = await authFetch(`${API_BASE}/datasets/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataset)
  });
  return handleResponse<Dataset>(res);
}

/**
 * Security Policies
 */
export async function fetchPolicies(): Promise<{ policies: Policy[]; total: number }> {
  const res = await authFetch(`${API_BASE}/security/policies`);
  return handleResponse<{ policies: Policy[]; total: number }>(res);
}

export async function updatePolicy(
  id: string,
  updates: {
    mode?: PolicyMode;
    rules?: any;
    reason?: string;
    actor?: string;
    is_enabled?: number;
    name?: string;
    description?: string;
    severity?: string;
  }
): Promise<Policy> {
  const res = await authFetch(`${API_BASE}/security/policies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return handleResponse<Policy>(res);
}

export async function fetchPolicyHistory(id: string): Promise<{ history: PolicyHistoryItem[]; total: number }> {
  const res = await authFetch(`${API_BASE}/security/policies/${id}/history`);
  return handleResponse<{ history: PolicyHistoryItem[]; total: number }>(res);
}

export async function fetchCriticalStatus(): Promise<CriticalStatusResponse> {
  const res = await authFetch(`${API_BASE}/security/critical-status`);
  return handleResponse<CriticalStatusResponse>(res);
}

export async function testPolicyInteractively(payload: {
  policyId: string;
  prompt?: string;
  response?: string;
}): Promise<PolicyTestResult> {
  const res = await authFetch(`${API_BASE}/security/policies/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<PolicyTestResult>(res);
}

export async function fetchSecurityEvents(): Promise<{ events: SecurityEvent[] }> {
  const res = await authFetch(`${API_BASE}/security/events`);
  return handleResponse<{ events: SecurityEvent[] }>(res);
}

/**
 * Red Team & Evaluations
 */
export async function fetchEvaluations(): Promise<{ evaluations: Evaluation[]; total: number }> {
  const res = await authFetch(`${API_BASE}/evaluations`);
  return handleResponse<{ evaluations: Evaluation[]; total: number }>(res);
}

export async function fetchEvaluationById(id: string): Promise<Evaluation> {
  const res = await authFetch(`${API_BASE}/evaluations/${id}`);
  return handleResponse<Evaluation>(res);
}

export async function launchEvaluation(payload: {
  name?: string;
  presetScenario: string;
  modelIds: string[];
  categories: string[];
  executionSettings?: any;
}): Promise<{
  evalId: string;
  status: string;
  totalCases: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  riskScore: number;
  durationMs: number;
  findingsCount: number;
  findings: any[];
}> {
  const res = await authFetch(`${API_BASE}/evaluations/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

/**
 * Server-Driven Evaluation Jobs & Lifecycle
 */
export async function fetchActiveEvalRun(): Promise<{ active: ActiveEvalRun | null }> {
  const res = await authFetch(`${API_BASE}/eval/runs/active`);
  return handleResponse<{ active: ActiveEvalRun | null }>(res);
}

export async function fetchEvalRunStatus(id: string): Promise<ActiveEvalRun> {
  const res = await authFetch(`${API_BASE}/eval/runs/${id}`);
  return handleResponse<ActiveEvalRun>(res);
}

export async function cancelEvalRunApi(id: string): Promise<{ success: boolean; id: string; status: string }> {
  const res = await authFetch(`${API_BASE}/eval/runs/${id}/cancel`, { method: 'POST' });
  return handleResponse(res);
}

export async function runPreflightApi(payload: {
  modelIds: string[];
  datasetId?: string;
  categories: string[];
}): Promise<PreflightResult> {
  const res = await authFetch(`${API_BASE}/eval/preflight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<PreflightResult>(res);
}

export async function fetchDynamicPresetsApi(
  modelIds: string[] = [],
  datasetId = 'ds_standard_safety_v1'
): Promise<{
  presets: DynamicPreset[];
  categories: string[];
  historicalStats: { measuredCases: number; p50LatencyMs: number };
}> {
  const query = new URLSearchParams();
  if (modelIds.length > 0) query.set('modelIds', modelIds.join(','));
  if (datasetId) query.set('datasetId', datasetId);

  const res = await authFetch(`${API_BASE}/eval/presets?${query.toString()}`);
  return handleResponse(res);
}

/**
 * User Profile & Notifications
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  const res = await authFetch(`${API_BASE}/user/profile`);
  return handleResponse<UserProfile>(res);
}

export async function updateUserProfileApi(data: Partial<UserProfile>): Promise<UserProfile> {
  const res = await authFetch(`${API_BASE}/user/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse<UserProfile>(res);
}

export async function fetchNotifications(): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
}> {
  const res = await authFetch(`${API_BASE}/notifications`);
  return handleResponse(res);
}

export async function markNotificationsReadApi(ids?: string[]): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
}> {
  const res = await authFetch(`${API_BASE}/notifications/mark-read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  return handleResponse(res);
}

/**
 * Findings
 */
export async function fetchFindings(params?: {
  category?: string;
  severity?: string;
  status?: string;
  evaluationId?: string;
}): Promise<{ findings: Finding[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.severity) query.set('severity', params.severity);
  if (params?.status) query.set('status', params.status);
  if (params?.evaluationId) query.set('evaluationId', params.evaluationId);

  const res = await authFetch(`${API_BASE}/findings?${query.toString()}`);
  return handleResponse<{ findings: Finding[]; total: number }>(res);
}

/**
 * Audit Ledger
 */
export async function fetchAuditEvidence(): Promise<{ records: AuditRecord[]; total: number }> {
  const res = await authFetch(`${API_BASE}/audit/evidence`);
  return handleResponse<{ records: AuditRecord[]; total: number }>(res);
}

export async function verifyAuditLedger(): Promise<AuditVerification> {
  const res = await authFetch(`${API_BASE}/audit/verify`, { method: 'POST' });
  return handleResponse<AuditVerification>(res);
}

/**
 * Admin Reset
 */
export async function resetDemoData(): Promise<{ success: boolean; message: string }> {
  const res = await authFetch(`${API_BASE}/admin/reset`, { method: 'POST' });
  return handleResponse<{ success: boolean; message: string }>(res);
}

/**
 * Isolation Probes (T01 - T05)
 */
export async function runIsolationProbes(): Promise<ProbeRunResult> {
  const res = await authFetch(`${API_BASE}/probes/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse<ProbeRunResult>(res);
}

/**
 * Mutation Lab (M1-M5, B1)
 */
export async function fetchLabStatus(): Promise<LabStatus> {
  const res = await authFetch(`${API_BASE}/lab/status`);
  return handleResponse<LabStatus>(res);
}

export async function applyLabMutation(mutationId: string, options: Record<string, any> = {}): Promise<LabMutationResult> {
  const res = await authFetch(`${API_BASE}/lab/mutate/${encodeURIComponent(mutationId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  return handleResponse<LabMutationResult>(res);
}

export async function restoreLabBaseline(): Promise<LabMutationResult> {
  const res = await authFetch(`${API_BASE}/lab/restore-baseline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse<LabMutationResult>(res);
}

/**
 * Real AI Advisor (Advisory Guidance)
 */
export async function explainIncident(payload: {
  contextId?: string;
  policyId?: string;
  category?: string;
  testPrompt?: string;
  observedResponse?: string;
  evidence?: string;
  preferredModel?: string;
}): Promise<AdvisorIncidentResponse> {
  const res = await authFetch(`${API_BASE}/advisor/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<AdvisorIncidentResponse>(res);
}

/**
 * Streaming Red Team Evaluation Runner (Real-Time Chunked Progress, Zero Fake Delays)
 */
export async function launchEvaluationStream(
  payload: {
    name?: string;
    presetScenario: string;
    modelIds: string[];
    datasetId?: string;
    categories: string[];
    executionSettings?: any;
  },
  onProgress?: (event: {
    evalId?: string;
    percent: number;
    completed: number;
    total: number;
    step: string;
    currentModel?: string;
    currentCategory?: string;
  }) => void
): Promise<any> {
  const res = await authFetch(`${API_BASE}/evaluations/launch-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Response stream unavailable from evaluation runner.');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalResult: any = null;
  let streamError: string | null = null;
  let lastEvalId: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const chunk of lines) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      for (const rawLine of trimmed.split('\n')) {
        const line = rawLine.replace(/\r$/, '');
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6).trim());
            if (data.evalId) lastEvalId = data.evalId;
            if (data.type === 'progress' && onProgress) {
              onProgress(data);
            } else if (data.type === 'complete') {
              finalResult = data.result || finalResult;
            } else if (data.type === 'error') {
              streamError = data.error || 'Evaluation failed on server';
            }
          } catch {
            // Ignore parse failures on partial SSE lines
          }
        }
      }
    }
  }

  if (buffer.trim()) {
    for (const rawLine of buffer.trim().split('\n')) {
      const line = rawLine.replace(/\r$/, '');
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6).trim());
          if (data.evalId) lastEvalId = data.evalId;
          if (data.type === 'complete') {
            finalResult = data.result || finalResult;
          } else if (data.type === 'error') {
            streamError = data.error || 'Evaluation failed on server';
          }
        } catch {}
      }
    }
  }

  if (streamError) {
    throw new Error(streamError);
  }

  if (!finalResult && lastEvalId) {
    // Stream closed early (e.g. proxy idle timeout), but the job is running on the server.
    // Seamlessly poll the server source of truth until completion.
    const pollStart = Date.now();
    const maxPollMs = 300000; // 5 minutes max
    while (!finalResult && Date.now() - pollStart < maxPollMs) {
      await new Promise(r => setTimeout(r, 1200));
      try {
        const res = await authFetch(`${API_BASE}/eval/runs/${lastEvalId}`);
        if (res.ok) {
          const run = await res.json();
          if (run) {
            if (onProgress && run.total_cases > 0) {
              onProgress({
                evalId: lastEvalId,
                percent: run.percent || Math.round((run.cases_done / run.total_cases) * 100),
                completed: run.cases_done || 0,
                total: run.total_cases || 0,
                step: `Evaluating case ${run.cases_done + 1} of ${run.total_cases}...`
              });
            }
            if (run.status === 'COMPLETED' || run.cases_done >= run.total_cases) {
              finalResult = {
                id: run.id,
                evalId: run.id,
                name: run.name,
                status: 'COMPLETED',
                totalCases: run.total_cases,
                passedCount: run.passed_count || 0,
                warningCount: run.warning_count || 0,
                failedCount: run.failed_count || 0,
                erroredCount: run.cases_errored || 0,
                riskScore: run.risk_score || 0
              };
              break;
            } else if (run.status === 'FAILED' || run.status === 'CANCELLED') {
              throw new Error(run.error_detail || `Evaluation run ${run.status.toLowerCase()} on server.`);
            }
          }
        }
      } catch (pollErr: any) {
        if (pollErr.message && !pollErr.message.includes('fetch')) {
          throw pollErr;
        }
      }
    }
  }

  if (!finalResult) {
    throw new Error('Evaluation stream disconnected before receiving completion verdict.');
  }

  return finalResult;
}

/**
 * Platform Settings (Persistent SQLite Key-Value Store)
 */
export async function fetchSettings(): Promise<{ settings: PlatformSettings }> {
  const res = await authFetch(`${API_BASE}/settings`);
  return handleResponse<{ settings: PlatformSettings }>(res);
}

export async function updateSetting<K extends keyof PlatformSettings>(
  key: K,
  value: PlatformSettings[K]
): Promise<{ success: boolean; key: K; value: PlatformSettings[K]; updated_at: string }> {
  const res = await authFetch(`${API_BASE}/settings/${String(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value })
  });
  return handleResponse(res);
}

export async function updateBulkSettings(
  settings: Partial<PlatformSettings>
): Promise<{ success: boolean; settings: PlatformSettings }> {
  const res = await authFetch(`${API_BASE}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  return handleResponse(res);
}

export async function resetSettings(
  section = 'all'
): Promise<{ success: boolean; section: string; settings: PlatformSettings }> {
  const res = await authFetch(`${API_BASE}/settings/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section })
  });
  return handleResponse(res);
}



