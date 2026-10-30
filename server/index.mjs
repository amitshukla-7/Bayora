import fs from 'node:fs';
import path from 'node:path';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {}
}

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import {
  getDb,
  getAllDatasets,
  getDatasetById,
  createDataset,
  getAllEvaluations,
  getEvaluationById,
  getAllFindings,
  getAllSecurityEvents,
  getAuditEvidence,
  verifyAuditLedger,
  getDashboardSummary,
  resetToSeed
} from './db.mjs';
import {
  getAllModelsWithMetrics,
  getModelWithMetrics,
  createModelRecord,
  updateModelRecord,
  deleteModelRecord,
  verifyModel,
  pullOllamaModel,
  handleGgufUpload,
  importHuggingFaceModel
} from './models/service.mjs';

import { executeEvaluationRun } from './evaluationEngine.mjs';
import { proxyRouter } from './proxy.mjs';
import {
  issueAttestationTicket,
  computeCanonicalPolicyFingerprint,
  verifyAttestationTicket
} from './attestation.mjs';
import { syncModelsToDatabase } from './adapters/factory.mjs';
import { generateIncidentAdvisory } from './advisor.mjs';
import {
  executeMutation,
  getLabStatus,
  restoreBaseline,
  remediateCrashedMutations
} from './mutations.mjs';
import { checkDockerAvailable, runAllProbes } from './probes/runner.mjs';
import { checkSystemHealth } from './health.mjs';
import {
  getAllSettings,
  getSetting,
  updateSetting,
  updateBulkSettings,
  resetSettings
} from './settings.mjs';
import {
  getAllPolicyConfigs,
  getPolicyConfigById,
  updatePolicyConfig,
  getPolicyHistory,
  getCriticalGuardrailStatus,
  testPolicyInteractively
} from './policies/service.mjs';
import {
  runBenchmarkValidation,
  getLatestValidationReport
} from './grading/validator.mjs';
import {
  getActiveEvalJob,
  getEvalRunDetails,
  cancelEvalRun,
  executePreflightCheck,
  getDynamicPresets,
  executeEvaluationRunServer,
  reconcileCrashedRuns
} from './eval/runner.mjs';
import {
  getUserProfile,
  updateUserProfile,
  getNotifications,
  markNotificationsRead
} from './user/service.mjs';
import {
  loginUser,
  registerUser,
  logoutSession,
  getUserFromSession,
  getUserById
} from './auth/service.mjs';

const PORT = Number(process.env.PORT) || 3001;

// Ensure database is initialized & synchronized with models.yaml
getDb();
syncModelsToDatabase();
reconcileCrashedRuns();

const app = new Hono();

// Security Headers & CORS Middleware
app.use('*', async (c, next) => {
  // Enterprise Security Headers (CWE-693)
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  c.header('Cross-Origin-Opener-Policy', 'same-origin');
  c.header('Cross-Origin-Resource-Policy', 'same-origin');

  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self' https://api.groq.com https://api.openai.com https://api.anthropic.com",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
  c.header('Content-Security-Policy', csp);

  // Controlled CORS configuration
  const origin = c.req.header('origin') || '*';
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Attestation-Ticket, X-Session-Token');
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  await next();
});

// Authentication & Session Resolution Middleware (CWE-287 / OWASP ASVS V2)
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('authorization') || c.req.header('x-session-token');
  let token = null;
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  let authenticatedUser = null;
  if (token) {
    authenticatedUser = getUserFromSession(token);
  }

  // Set authenticated user only if a valid session token was provided
  c.set('user', authenticatedUser);
  c.set('sessionUser', authenticatedUser);
  // Default userId to 'user_amit_shukla' only for unauthenticated background data queries/tests
  c.set('userId', authenticatedUser?.id || 'user_amit_shukla');
  await next();
});

/**
 * Authentication & Identity Endpoints
 */
app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const result = loginUser({
      email: body.email,
      password: body.password,
      ip: c.req.header('x-forwarded-for') || null,
      userAgent: c.req.header('user-agent') || null
    });
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 401);
  }
});

app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json();
    const result = registerUser({
      email: body.email,
      password: body.password,
      name: body.name,
      organization: body.organization,
      role: body.role
    });
    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.post('/api/auth/logout', (c) => {
  const authHeader = c.req.header('authorization') || c.req.header('x-session-token');
  let token = null;
  if (authHeader) {
    token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  }
  if (token) {
    logoutSession(token);
  }
  return c.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthenticated' }, 401);
  }
  return c.json({ user });
});

// Root API Status Landing Page (or UI when requested by browser)
app.get('/', (c) => {
  const acceptsHtml = (c.req.header('accept') || '').includes('text/html');
  const distIndex = path.resolve(process.cwd(), 'dist', 'index.html');
  if (acceptsHtml && fs.existsSync(distIndex)) {
    return c.html(fs.readFileSync(distIndex, 'utf8'));
  }
  return c.json({
    name: 'Bayora Intelligence Center (SentinelFlow) API',
    version: '2.0.0',
    status: 'ONLINE',
    description: 'Deterministic AI Model Security Evaluation Platform ("AI Explains, Math Decides")',
    frontend_url: 'http://localhost:5173',
    endpoints: {
      health: '/api/health',
      dashboard: '/api/dashboard/summary',
      models: '/api/models',
      policies: '/api/policies',
      evaluations: '/api/evaluations',
      settings: '/api/settings',
      grading_report: '/api/grading/validation-report',
      gateway_proxy: '/v1/chat/completions'
    }
  });
});

// OpenAI-Compatible Proxy Gateway (/v1/chat/completions)
app.route('/v1', proxyRouter);

/**
 * Attestation Ticket Management
 */
app.post('/api/attestation/ticket', async (c) => {
  try {
    const ticket = await issueAttestationTicket();
    return c.json(ticket, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/attestation/fingerprint', async (c) => {
  try {
    const fingerprint = await computeCanonicalPolicyFingerprint();
    return c.json({ fingerprint });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/attestation/verify', async (c) => {
  try {
    const body = await c.req.json();
    const result = await verifyAttestationTicket(body.ticket);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

/**
 * System Health & Diagnostics Check
 */
app.get('/api/health', async (c) => {
  try {
    const health = await checkSystemHealth();
    const statusCode = health.status === 'UNHEALTHY' ? 503 : 200;
    return c.json(health, statusCode);
  } catch (err) {
    return c.json({ status: 'UNHEALTHY', error: err.message }, 500);
  }
});

/**
 * Settings Management (Persistent Key-Value Store)
 */
app.get('/api/settings', (c) => {
  try {
    const settings = getAllSettings();
    return c.json({ settings });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/settings/:key', (c) => {
  const key = c.req.param('key');
  try {
    const value = getSetting(key);
    return c.json({ key, value });
  } catch (err) {
    return c.json({ error: err.message }, err.statusCode || 400);
  }
});

app.put('/api/settings/:key', async (c) => {
  const key = c.req.param('key');
  try {
    const body = await c.req.json();
    if (!body || !Object.hasOwn(body, 'value')) {
      return c.json({ error: 'Request body must contain "value"' }, 400);
    }
    const updated = updateSetting(key, body.value);
    return c.json({ success: true, ...updated });
  } catch (err) {
    return c.json({ error: err.message, issues: err.issues }, err.statusCode || 400);
  }
});

app.patch('/api/settings', async (c) => {
  try {
    const body = await c.req.json();
    const updated = updateBulkSettings(body);
    return c.json({ success: true, settings: updated });
  } catch (err) {
    return c.json({ error: err.message, issues: err.issues }, err.statusCode || 400);
  }
});

app.post('/api/settings/reset', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const section = body?.section || 'all';
    const settings = resetSettings(section);
    return c.json({ success: true, section, settings });
  } catch (err) {
    return c.json({ error: err.message }, err.statusCode || 400);
  }
});

/**
 * Dashboard Summary & Trends
 */
app.get('/api/dashboard/summary', (c) => {
  const summary = getDashboardSummary(c.get('userId'));
  return c.json(summary);
});

/**
 * Models Management (CRUD, Verification Pipeline, Live Computed Metrics)
 */
app.get('/api/models', (c) => {
  const models = getAllModelsWithMetrics(c.get('userId'));
  return c.json({ models, total: models.length });
});

app.get('/api/models/:id', (c) => {
  const id = c.req.param('id');
  const model = getModelWithMetrics(id);
  if (!model) return c.json({ error: 'Model not found' }, 404);
  return c.json(model);
});

app.post('/api/models', async (c) => {
  try {
    const body = await c.req.json();
    const created = await createModelRecord(body, true, c.get('userId'));
    return c.json(created, 201);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.patch('/api/models/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const updated = await updateModelRecord(id, body);
    return c.json(updated);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.delete('/api/models/:id', (c) => {
  try {
    const id = c.req.param('id');
    const res = deleteModelRecord(id, c.get('userId'));
    return c.json(res);
  } catch (err) {
    return c.json({ error: err.message }, 404);
  }
});

app.post('/api/models/:id/verify', async (c) => {
  try {
    const id = c.req.param('id');
    const verified = await verifyModel(id);
    return c.json(verified);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.post('/api/models/pull-ollama', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.name) {
      return c.json({ error: 'Ollama model tag/name is required' }, 400);
    }
    const result = await pullOllamaModel(body.name);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.post('/api/models/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No GGUF file uploaded. Expected multipart form field "file".' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await handleGgufUpload(buffer, file.name);
    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.post('/api/models/import-hf', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.repoId) {
      return c.json({ error: 'Hugging Face repoId is required' }, 400);
    }
    const result = await importHuggingFaceModel(body.repoId);
    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

/**
 * Machine Grader Validation (Cohen's Kappa & Gold Benchmark)
 */
app.get('/api/grading/validation-report', (c) => {
  try {
    const report = getLatestValidationReport();
    return c.json(report);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/grading/run-benchmark', (c) => {
  try {
    const report = runBenchmarkValidation();
    return c.json(report);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Datasets Management
 */
app.get('/api/datasets', (c) => {
  const datasets = getAllDatasets();
  return c.json({ datasets, total: datasets.length });
});

app.get('/api/datasets/:id', (c) => {
  const id = c.req.param('id');
  const dataset = getDatasetById(id);
  if (!dataset) return c.json({ error: 'Dataset not found' }, 404);
  return c.json(dataset);
});

app.post('/api/datasets/upload', async (c) => {
  try {
    const body = await c.req.json();
    const { name, description, cases } = body;
    if (!name || !cases || !Array.isArray(cases) || cases.length === 0) {
      return c.json({ error: 'Dataset name and non-empty cases array are required' }, 400);
    }

    const categoriesSet = new Set(cases.map(c => c.category || 'General'));
    const dataset = createDataset(
      {
        name,
        version: '1.0.0',
        description: description || 'User uploaded evaluation dataset',
        categories: Array.from(categoriesSet)
      },
      cases
    );

    return c.json(dataset, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Security Policies & Monitoring (Live DB Integration, OFF | MONITOR | ENFORCE)
 */
app.get('/api/security/policies', (c) => {
  const policies = getAllPolicyConfigs();
  return c.json({ policies, total: policies.length });
});

app.get('/api/security/policies/:id', (c) => {
  try {
    const id = c.req.param('id');
    const policy = getPolicyConfigById(id);
    return c.json(policy);
  } catch (err) {
    return c.json({ error: err.message }, err.statusCode || 404);
  }
});

app.patch('/api/security/policies/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const updated = await updatePolicyConfig(id, body);
    return c.json(updated);
  } catch (err) {
    return c.json({ error: err.message }, err.statusCode || 400);
  }
});

app.get('/api/security/policies/:id/history', (c) => {
  const id = c.req.param('id');
  const history = getPolicyHistory(id);
  return c.json({ history, total: history.length });
});

app.get('/api/security/critical-status', (c) => {
  const status = getCriticalGuardrailStatus();
  return c.json(status);
});

app.post('/api/security/policies/test', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.policyId) {
      return c.json({ error: 'policyId is required' }, 400);
    }
    const testResult = testPolicyInteractively(body);
    return c.json(testResult);
  } catch (err) {
    return c.json({ error: err.message }, err.statusCode || 400);
  }
});

app.get('/api/security/events', (c) => {
  const events = getAllSecurityEvents(30);
  return c.json({ events });
});

/**
 * Red Team & Evaluations
 */
app.get('/api/evaluations', (c) => {
  const evaluations = getAllEvaluations(c.get('userId'));
  return c.json({ evaluations, total: evaluations.length });
});

app.get('/api/evaluations/:id', (c) => {
  const id = c.req.param('id');
  const evaluation = getEvaluationById(id);
  if (!evaluation) return c.json({ error: 'Evaluation not found' }, 404);
  return c.json(evaluation);
});

/**
 * User Profile & Notifications (Persistent SQLite Identity)
 */
app.get('/api/user/profile', (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthenticated' }, 401);
  }
  return c.json(getUserProfile(user.id));
});

app.patch('/api/user/profile', async (c) => {
  try {
    const body = await c.req.json();
    const updated = updateUserProfile(body, c.get('userId'));
    return c.json(updated);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.get('/api/notifications', (c) => {
  const limit = Number(c.req.query('limit')) || 20;
  return c.json(getNotifications(limit, c.get('userId')));
});

app.post('/api/notifications/mark-read', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const result = markNotificationsRead(body?.ids, c.get('userId'));
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Server-Driven Evaluation Jobs & Preflight Check
 */
app.get('/api/eval/runs/active', (c) => {
  const active = getActiveEvalJob();
  return c.json({ active });
});

app.get('/api/evaluations/runs/active', (c) => {
  const active = getActiveEvalJob();
  return c.json({ active });
});

app.get('/api/eval/runs/:id', (c) => {
  const id = c.req.param('id');
  const run = getEvalRunDetails(id);
  if (!run) return c.json({ error: 'Evaluation run not found' }, 404);
  return c.json(run);
});

app.get('/api/evaluations/runs/:id', (c) => {
  const id = c.req.param('id');
  const run = getEvalRunDetails(id);
  if (!run) return c.json({ error: 'Evaluation run not found' }, 404);
  return c.json(run);
});

app.post('/api/eval/runs/:id/cancel', (c) => {
  const id = c.req.param('id');
  try {
    const result = cancelEvalRun(id);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.post('/api/evaluations/runs/:id/cancel', (c) => {
  const id = c.req.param('id');
  try {
    const result = cancelEvalRun(id);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.post('/api/eval/preflight', async (c) => {
  try {
    const body = await c.req.json();
    const result = await executePreflightCheck(body);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.get('/api/eval/presets', (c) => {
  const modelIdsParam = c.req.query('modelIds');
  const modelIds = modelIdsParam ? modelIdsParam.split(',').filter(Boolean) : [];
  const datasetId = c.req.query('datasetId') || 'ds_standard_safety_v1';
  const presetsData = getDynamicPresets(modelIds, datasetId);
  return c.json(presetsData);
});

app.post('/api/evaluations/launch', async (c) => {
  try {
    const body = await c.req.json();
    const result = await executeEvaluationRunServer({
      ...body,
      userId: c.get('userId')
    });
    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.post('/api/evaluations/launch-stream', async (c) => {
  try {
    c.header('X-Accel-Buffering', 'no');
    const body = await c.req.json();
    return streamSSE(c, async (stream) => {
      // Send regular keepalive ping comment to prevent intermediate proxy timeout
      const pingTimer = setInterval(async () => {
        try {
          await stream.writeSSE({
            event: 'ping',
            data: JSON.stringify({ ping: Date.now() })
          });
        } catch {
          clearInterval(pingTimer);
        }
      }, 3000);

      try {
        const result = await executeEvaluationRunServer({
          ...body,
          userId: c.get('userId'),
          onProgress: async (progressEvent) => {
            await stream.writeSSE({
              data: JSON.stringify(progressEvent)
            });
          }
        });
        clearInterval(pingTimer);
        await stream.writeSSE({
          data: JSON.stringify({ type: 'complete', result })
        });
      } catch (err) {
        clearInterval(pingTimer);
        await stream.writeSSE({
          data: JSON.stringify({ type: 'error', error: err.message })
        });
      }
    });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.get('/api/evaluations/:id/export', (c) => {
  const id = c.req.param('id');
  const format = c.req.query('format') || 'json';
  const evaluation = getEvaluationById(id);
  if (!evaluation) return c.json({ error: 'Evaluation not found' }, 404);

  if (format === 'csv') {
    let csv = 'Finding ID,Model,Category,Severity,Status,Risk Score,Test Prompt,Explanation,Mitigation\n';
    for (const f of evaluation.findings || []) {
      const escape = (s) => `"${(s || '').replace(/"/g, '""')}"`;
      csv += `${f.id},${escape(f.model_name)},${escape(f.category)},${f.severity},${f.status},${f.risk_score},${escape(f.test_case_prompt)},${escape(f.explanation)},${escape(f.mitigation)}\n`;
    }
    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', `attachment; filename="bayora_eval_${id}.csv"`);
    return c.text(csv);
  }

  c.header('Content-Type', 'application/json');
  c.header('Content-Disposition', `attachment; filename="bayora_eval_${id}.json"`);
  return c.json(evaluation);
});

/**
 * Findings
 */
app.get('/api/findings', (c) => {
  const category = c.req.query('category');
  const severity = c.req.query('severity');
  const status = c.req.query('status');
  const evaluationId = c.req.query('evaluationId');

  const findings = getAllFindings({ category, severity, status, evaluation_id: evaluationId }, c.get('userId'));
  return c.json({ findings, total: findings.length });
});

/**
 * Audit Evidence & Integrity Verification
 */
app.get('/api/audit/evidence', (c) => {
  const records = getAuditEvidence();
  return c.json({ records, total: records.length });
});

app.post('/api/audit/verify', (c) => {
  const verification = verifyAuditLedger();
  return c.json(verification);
});

/**
 * AI Security Advisor (AI Explains, Math Decides)
 */
app.post('/api/advisor/explain', async (c) => {
  try {
    const body = await c.req.json();
    const result = await generateIncidentAdvisory(body);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Isolation Probes
 */
app.post('/api/probes/run', async (c) => {
  try {
    const result = await runAllProbes();
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Mutation Lab (Tier A & Tier B, 6-Step Execution Contract)
 */
app.get('/api/lab/status', async (c) => {
  const status = await getLabStatus();
  return c.json(status);
});

app.post('/api/lab/mutate/:id', async (c) => {
  const mutationId = c.req.param('id');
  let body = {};
  try {
    body = await c.req.json();
  } catch {}

  try {
    const result = await executeMutation(mutationId, body);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 403);
  }
});

app.post('/api/lab/restore-baseline', async (c) => {
  try {
    const result = await restoreBaseline();
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Reset Demo Data
 */
app.post('/api/admin/reset', (c) => {
  const res = resetToSeed();
  return c.json(res);
});

/**
 * Production Static Frontend Serving
 */
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use('/*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));
}

export { app };

if (process.env.NODE_ENV !== 'test') {
  process.env.BAYORA_LAB_MODE = process.env.BAYORA_LAB_MODE || '1';
  remediateCrashedMutations().catch((err) => {
    console.warn('[STARTUP] Mutation auto-remediation failed:', err.message);
  });
  serve(
    {
      fetch: app.fetch,
      port: PORT,
      hostname: '0.0.0.0'
    },
    (info) => {
      console.log(`\n======================================================`);
      console.log(` BAYORA INTELLIGENCE CENTER — AI MODEL SECURITY PLATFORM`);
      console.log(` Running on http://localhost:${PORT}`);
      console.log(` Environment: Local Interactive Platform`);
      console.log(` Invariant: AI Explains, Math Decides`);
      console.log(`======================================================\n`);

      // Preflight guidance for local model inference
      fetch('http://localhost:11434/api/tags')
        .then(res => res.json())
        .then(data => {
          const models = data.models?.map(m => m.name).join(', ') || 'none';
          console.log(`[MODEL RUNTIME] Local Ollama daemon active. Available models: [${models}]`);
        })
        .catch(() => {
          console.warn(`[MODEL RUNTIME] Ollama daemon not detected at http://localhost:11434.`);
          console.warn(`   To run real local evaluations, ensure Ollama is running:`);
          console.warn(`   1. ollama serve`);
          console.warn(`   2. ollama pull smollm:135m\n`);
        });
    }
  );
}
