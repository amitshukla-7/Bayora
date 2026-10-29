import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { serve } from '@hono/node-server';
import {
  getDb,
  getAllModels,
  getModelById,
  createModel,
  deleteModel,
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

import { executeEvaluationRun } from './evaluationEngine.mjs';
import { proxyRouter } from './proxy.mjs';
import {
  issueAttestationTicket,
  computeCanonicalPolicyFingerprint,
  verifyAttestationTicket
} from './attestation.mjs';
import { syncModelsToDatabase } from './adapters/factory.mjs';
import { generateIncidentAdvisory } from './advisor.mjs';
import { executeMutation } from './mutations.mjs';
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

const PORT = Number(process.env.PORT) || 3001;

// Ensure database is initialized & synchronized with models.yaml
getDb();
syncModelsToDatabase();

const app = new Hono();

// CORS Middleware
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Attestation-Ticket');
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  await next();
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
  const summary = getDashboardSummary();
  return c.json(summary);
});

/**
 * Models Management
 */
app.get('/api/models', (c) => {
  const models = getAllModels();
  return c.json({ models, total: models.length });
});

app.get('/api/models/:id', (c) => {
  const id = c.req.param('id');
  const model = getModelById(id);
  if (!model) return c.json({ error: 'Model not found' }, 404);
  return c.json(model);
});

app.post('/api/models', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.name || !body.identifier) {
      return c.json({ error: 'Model name and identifier are required' }, 400);
    }
    const created = createModel(body);
    return c.json(created, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/models/:id', (c) => {
  const id = c.req.param('id');
  const res = deleteModel(id);
  return c.json(res);
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
  const evaluations = getAllEvaluations();
  return c.json({ evaluations, total: evaluations.length });
});

app.get('/api/evaluations/:id', (c) => {
  const id = c.req.param('id');
  const evaluation = getEvaluationById(id);
  if (!evaluation) return c.json({ error: 'Evaluation not found' }, 404);
  return c.json(evaluation);
});

app.post('/api/evaluations/launch', async (c) => {
  try {
    const body = await c.req.json();
    const result = await executeEvaluationRun(body);
    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.post('/api/evaluations/launch-stream', async (c) => {
  try {
    const body = await c.req.json();
    return streamSSE(c, async (stream) => {
      try {
        await executeEvaluationRun({
          ...body,
          onProgress: async (progressEvent) => {
            await stream.writeSSE({
              data: JSON.stringify(progressEvent)
            });
          }
        });
      } catch (err) {
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

  const findings = getAllFindings({ category, severity, status, evaluation_id: evaluationId });
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
 * Mutation Lab (M1-M5, B1)
 */
app.get('/api/lab/status', async (c) => {
  const docker = await checkDockerAvailable();
  return c.json({
    labModeEnabled: process.env.BAYORA_LAB_MODE === '1',
    dockerAvailable: docker.available,
    requiresDockerNotice: !docker.available ? 'REQUIRES DOCKER LAB' : null
  });
});

app.post('/api/lab/mutate/:id', async (c) => {
  const mutationId = c.req.param('id');
  try {
    const result = await executeMutation(mutationId);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 403);
  }
});

/**
 * Reset Demo Data
 */
app.post('/api/admin/reset', (c) => {
  const res = resetToSeed();
  return c.json(res);
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  serve(
    {
      fetch: app.fetch,
      port: PORT
    },
    (info) => {
      console.log(`\n======================================================`);
      console.log(` BAYORA INTELLIGENCE CENTER — AI MODEL SECURITY PLATFORM`);
      console.log(` Running on http://localhost:${PORT}`);
      console.log(` Environment: Local Interactive Prototype`);
      console.log(`======================================================\n`);
    }
  );
}
