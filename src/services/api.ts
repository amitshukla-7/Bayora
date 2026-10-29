import type {
  Model,
  Dataset,
  Evaluation,
  Finding,
  Policy,
  SecurityEvent,
  DashboardSummary,
  AuditRecord,
  AuditVerification,
  ProbeRunResult,
  LabStatus,
  LabMutationResult,
  AdvisorIncidentResponse
} from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Dashboard
 */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  return handleResponse<DashboardSummary>(res);
}

/**
 * Models
 */
export async function fetchModels(): Promise<{ models: Model[]; total: number }> {
  const res = await fetch(`${API_BASE}/models`);
  return handleResponse<{ models: Model[]; total: number }>(res);
}

export async function fetchModelById(id: string): Promise<Model> {
  const res = await fetch(`${API_BASE}/models/${id}`);
  return handleResponse<Model>(res);
}

export async function createModel(model: Partial<Model>): Promise<Model> {
  const res = await fetch(`${API_BASE}/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(model)
  });
  return handleResponse<Model>(res);
}

export async function deleteModel(id: string): Promise<{ success: boolean; id: string }> {
  const res = await fetch(`${API_BASE}/models/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean; id: string }>(res);
}

/**
 * Datasets
 */
export async function fetchDatasets(): Promise<{ datasets: Dataset[]; total: number }> {
  const res = await fetch(`${API_BASE}/datasets`);
  return handleResponse<{ datasets: Dataset[]; total: number }>(res);
}

export async function fetchDatasetById(id: string): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/datasets/${id}`);
  return handleResponse<Dataset>(res);
}

export async function uploadDataset(dataset: {
  name: string;
  description?: string;
  cases: any[];
}): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/datasets/upload`, {
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
  const res = await fetch(`${API_BASE}/security/policies`);
  return handleResponse<{ policies: Policy[]; total: number }>(res);
}

export async function updatePolicy(id: string, updates: Partial<Policy>): Promise<Policy> {
  const res = await fetch(`${API_BASE}/security/policies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return handleResponse<Policy>(res);
}

export async function fetchSecurityEvents(): Promise<{ events: SecurityEvent[] }> {
  const res = await fetch(`${API_BASE}/security/events`);
  return handleResponse<{ events: SecurityEvent[] }>(res);
}

/**
 * Red Team & Evaluations
 */
export async function fetchEvaluations(): Promise<{ evaluations: Evaluation[]; total: number }> {
  const res = await fetch(`${API_BASE}/evaluations`);
  return handleResponse<{ evaluations: Evaluation[]; total: number }>(res);
}

export async function fetchEvaluationById(id: string): Promise<Evaluation> {
  const res = await fetch(`${API_BASE}/evaluations/${id}`);
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
  const res = await fetch(`${API_BASE}/evaluations/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
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

  const res = await fetch(`${API_BASE}/findings?${query.toString()}`);
  return handleResponse<{ findings: Finding[]; total: number }>(res);
}

/**
 * Audit Ledger
 */
export async function fetchAuditEvidence(): Promise<{ records: AuditRecord[]; total: number }> {
  const res = await fetch(`${API_BASE}/audit/evidence`);
  return handleResponse<{ records: AuditRecord[]; total: number }>(res);
}

export async function verifyAuditLedger(): Promise<AuditVerification> {
  const res = await fetch(`${API_BASE}/audit/verify`, { method: 'POST' });
  return handleResponse<AuditVerification>(res);
}

/**
 * Admin Reset
 */
export async function resetDemoData(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/admin/reset`, { method: 'POST' });
  return handleResponse<{ success: boolean; message: string }>(res);
}

/**
 * Isolation Probes (T01 - T05)
 */
export async function runIsolationProbes(): Promise<ProbeRunResult> {
  const res = await fetch(`${API_BASE}/probes/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse<ProbeRunResult>(res);
}

/**
 * Mutation Lab (M1-M5, B1)
 */
export async function fetchLabStatus(): Promise<LabStatus> {
  const res = await fetch(`${API_BASE}/lab/status`);
  return handleResponse<LabStatus>(res);
}

export async function applyLabMutation(mutationId: string): Promise<LabMutationResult> {
  const res = await fetch(`${API_BASE}/lab/mutate/${encodeURIComponent(mutationId)}`, {
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
  const res = await fetch(`${API_BASE}/advisor/explain`, {
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
    categories: string[];
    executionSettings?: any;
  },
  onProgress?: (event: {
    percent: number;
    completed: number;
    total: number;
    step: string;
    currentModel?: string;
    currentCategory?: string;
  }) => void
): Promise<any> {
  const res = await fetch(`${API_BASE}/evaluations/launch-stream`, {
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

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const chunk of lines) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      for (const line of trimmed.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress' && onProgress) {
              onProgress(data);
            } else if (data.type === 'complete') {
              finalResult = data.result;
            }
          } catch {
            // Ignore parse failures on partial SSE lines
          }
        }
      }
    }
  }

  if (buffer.trim()) {
    for (const line of buffer.trim().split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'complete') {
            finalResult = data.result;
          }
        } catch {}
      }
    }
  }

  return finalResult || { status: 'COMPLETED' };
}

