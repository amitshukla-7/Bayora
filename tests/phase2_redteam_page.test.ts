import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../server/db.mjs';
import {
  getUserProfile,
  updateUserProfile,
  getNotifications,
  addNotification,
  markNotificationsRead
} from '../server/user/service.mjs';
import {
  executePreflightCheck,
  getDynamicPresets,
  getActiveEvalJob,
  getEvalRunDetails,
  cancelEvalRun,
  reconcileCrashedRuns,
  OFFICIAL_CATEGORIES
} from '../server/eval/runner.mjs';

describe('Phase 2 — Red Team Evaluation Lifecycle & Live Server State', () => {
  const db = getDb();

  beforeEach(() => {
    // Reset user profile to baseline
    updateUserProfile({ name: 'Amit Shukla', role: 'Principal Architect', email: 'amit.shukla@bayora.enterprise' });

    // Ensure models exist
    db.prepare(`
      INSERT OR IGNORE INTO models (id, name, provider, identifier, version, description, model_type, execution_mode, endpoint, status, registered_at, is_synthetic)
      VALUES ('ollama-llama3.2', 'Llama 3.2 3B (Local Ollama)', 'Ollama', 'llama3.2', '3.2.0', 'Local Ollama test model', 'Instruct LLM', 'Live', 'http://localhost:11434', 'Active', datetime('now'), 0)
    `).run();
    db.prepare(`
      INSERT OR IGNORE INTO models (id, name, provider, identifier, version, description, model_type, execution_mode, endpoint, status, registered_at, is_synthetic)
      VALUES ('openai-gpt4o', 'OpenAI GPT-4o', 'OpenAI', 'gpt-4o', '2024-08-06', 'OpenAI model', 'Instruct LLM', 'Live', 'https://api.openai.com/v1', 'Active', datetime('now'), 0)
    `).run();

    // Ensure dataset exists
    db.prepare(`
      INSERT OR IGNORE INTO datasets (id, name, version, sha256, description, total_cases, categories, is_builtin, is_synthetic, created_at, updated_at)
      VALUES ('ds_standard_safety_v1', 'Standard Enterprise Safety Benchmark', '1.0.0', '79a295fd13974c5d5e237303d7db27d91d03c5d7967919e91775f0a0d646b9a8', 'Baseline evaluation corpus.', 24, '["Jailbreak","Prompt Injection","Sensitive Data Leakage","Data Exfiltration","Toxicity","Bias & Fairness","Hallucination","Compliance Drift"]', 1, 0, datetime('now'), datetime('now'))
    `).run();

    // Clean up any stale active runs
    db.prepare("UPDATE eval_runs SET status = 'COMPLETED' WHERE status IN ('RUNNING', 'PREFLIGHT', 'GRADING')").run();
    db.prepare("UPDATE evaluations SET status = 'COMPLETED' WHERE status IN ('RUNNING', 'PREFLIGHT', 'GRADING')").run();
  });

  describe('1. Dynamic User Profile & Live Notifications', () => {
    it('retrieves user profile from database with real fields', () => {
      const profile = getUserProfile();
      expect(profile).toBeDefined();
      expect(profile.name).toBe('Amit Shukla');
      expect(profile.role).toBe('Principal Architect');
      expect(profile.avatar_initials).toBe('AS');
      expect(profile.email).toBe('amit.shukla@bayora.enterprise');
    });

    it('updates user profile persistently in SQLite', () => {
      updateUserProfile({ name: 'Dr. Jane Doe', role: 'Chief AI Safety Officer' });
      const updated = getUserProfile();
      expect(updated.name).toBe('Dr. Jane Doe');
      expect(updated.role).toBe('Chief AI Safety Officer');
      expect(updated.avatar_initials).toBe('DD');

      // Restore
      updateUserProfile({ name: 'Amit Shukla', role: 'Principal Architect' });
    });

    it('adds and marks notifications as read from database', () => {
      const notif = addNotification({
        title: 'Security Alert Test',
        message: 'High risk prompt injection detected.',
        type: 'warning'
      });
      expect(notif.id).toBeDefined();

      const { notifications } = getNotifications();
      expect(notifications.some(n => n.id === notif.id)).toBe(true);

      const afterMark = markNotificationsRead([notif.id]);
      const found = afterMark.notifications.find(n => n.id === notif.id);
      expect(found).toBeDefined();
      expect(Boolean((found as any)?.read ?? (found as any)?.is_read)).toBe(true);
    });
  });

  describe('2. Evaluation Preflight Checks', () => {
    it('fails preflight when no models are selected', async () => {
      const res = await executePreflightCheck({
        modelIds: [],
        datasetId: 'ds_standard_safety_v1',
        categories: ['Jailbreak']
      });
      expect(res.ready).toBe(false);
      expect(res.checks.some(c => c.name === 'Model Selection' && c.status === 'FAIL')).toBe(true);
    });

    it('fails preflight when selected model does not exist', async () => {
      const res = await executePreflightCheck({
        modelIds: ['non_existent_model_id'],
        datasetId: 'ds_standard_safety_v1',
        categories: ['Jailbreak']
      });
      expect(res.ready).toBe(false);
      expect(res.checks.some(c => c.status === 'FAIL' && c.message.includes('does not exist'))).toBe(true);
    });

    it('fails preflight when 0 categories are selected', async () => {
      const res = await executePreflightCheck({
        modelIds: ['ollama-llama3.2'],
        datasetId: 'ds_standard_safety_v1',
        categories: []
      });
      expect(res.ready).toBe(false);
      expect(res.checks.some(c => c.name === 'Attack Surfaces' && c.status === 'FAIL')).toBe(true);
    });

    it('passes preflight when valid active model, dataset, and categories are provided', async () => {
      const res = await executePreflightCheck({
        modelIds: ['ollama-llama3.2'],
        datasetId: 'ds_standard_safety_v1',
        categories: ['Jailbreak', 'Prompt Injection']
      });
      expect(res.ready).toBe(true);
      expect(res.checks.every(c => c.status === 'PASS')).toBe(true);
    });
  });

  describe('3. Dynamic Presets & Mathematical Calibrations', () => {
    it('official platform categories has exactly 8 items (no 9th phantom category)', () => {
      expect(OFFICIAL_CATEGORIES).toHaveLength(8);
      expect(OFFICIAL_CATEGORIES).toContain('Jailbreak');
      expect(OFFICIAL_CATEGORIES).toContain('Prompt Injection');
      expect(OFFICIAL_CATEGORIES).toContain('Sensitive Data Leakage');
      expect(OFFICIAL_CATEGORIES).toContain('Data Exfiltration');
      expect(OFFICIAL_CATEGORIES).toContain('Toxicity');
      expect(OFFICIAL_CATEGORIES).toContain('Bias & Fairness');
      expect(OFFICIAL_CATEGORIES).toContain('Hallucination');
      expect(OFFICIAL_CATEGORIES).toContain('Compliance Drift');
      expect(OFFICIAL_CATEGORIES).not.toContain('Misinformation');
    });

    it('contains no forbidden simulation wording in any preset description', () => {
      const { presets } = getDynamicPresets(['ollama-llama3.2']);
      for (const p of presets) {
        expect(p.description.toLowerCase()).not.toContain('simulation');
        expect(p.description.toLowerCase()).not.toContain('fake');
        expect(p.description.toLowerCase()).not.toContain('dummy');
      }
    });

    it('disables Multi-Model Comparison when fewer than 2 models are selected', () => {
      const res1 = getDynamicPresets(['ollama-llama3.2']);
      const multi1 = res1.presets.find(p => p.id === 'Multi-Model Comparison');
      expect(multi1?.enabled).toBe(false);
      expect(multi1?.disabledReason).toBeDefined();

      const res2 = getDynamicPresets(['ollama-llama3.2', 'openai-gpt4o']);
      const multi2 = res2.presets.find(p => p.id === 'Multi-Model Comparison');
      expect(multi2?.enabled).toBe(true);
    });

    it('computes total calls and dynamic durations as a mathematical function of models and cases', () => {
      const modelList = ['ollama-llama3.2', 'openai-gpt4o'];
      const res = getDynamicPresets(modelList);
      const quick = res.presets.find(p => p.id === 'Quick Diagnostic');
      expect(quick?.casesCount).toBe(12);
      expect(quick?.totalCalls).toBe(12 * modelList.length);
      expect(quick?.duration).toBeDefined();
      expect(quick?.latencyBasis).toBeDefined();
    });
  });

  describe('4. Active Run Synchronization, Crash Reconciliation & Cancellation', () => {
    it('returns null when no evaluation job is running', () => {
      const active = getActiveEvalJob();
      expect(active).toBeNull();
    });

    it('reconciles crashed runs by marking them FAILED on startup', () => {
      const now = new Date().toISOString();
      const orphanId = `eval_orphan_${Date.now()}`;

      db.prepare(`
        INSERT INTO eval_runs (id, name, dataset_id, model_id, model_identifier, status, total_cases, cases_total, cases_done, is_synthetic, created_at)
        VALUES (?, 'Orphaned Test Run', 'ds_standard_safety_v1', 'ollama-llama3.2', 'llama3.2', 'RUNNING', 10, 10, 2, 0, ?)
      `).run(orphanId, now);

      db.prepare(`
        INSERT INTO evaluations (id, name, preset_scenario, status, models, categories, total_cases, cases_done, is_synthetic, created_at)
        VALUES (?, 'Orphaned Test Run', 'Quick Demo', 'RUNNING', '["ollama-llama3.2"]', '["Jailbreak"]', 10, 2, 0, ?)
      `).run(orphanId, now);

      // Verify active run detects it
      const active = getActiveEvalJob();
      expect(active).toBeDefined();
      expect(active?.id).toBe(orphanId);

      // Reconcile
      reconcileCrashedRuns();

      // Now no run should be active
      expect(getActiveEvalJob()).toBeNull();

      const runDetails = getEvalRunDetails(orphanId);
      expect(runDetails?.status).toBe('FAILED');
      expect(runDetails?.error_detail).toContain('server process restarted');
    });

    it('handles cancellation of a running evaluation gracefully', () => {
      const now = new Date().toISOString();
      const cancelTestId = `eval_cancel_${Date.now()}`;

      db.prepare(`
        INSERT INTO eval_runs (id, name, dataset_id, model_id, model_identifier, status, total_cases, cases_total, cases_done, is_synthetic, created_at)
        VALUES (?, 'Cancelable Run', 'ds_standard_safety_v1', 'ollama-llama3.2', 'llama3.2', 'RUNNING', 10, 10, 5, 0, ?)
      `).run(cancelTestId, now);

      db.prepare(`
        INSERT INTO evaluations (id, name, preset_scenario, status, models, categories, total_cases, cases_done, is_synthetic, created_at)
        VALUES (?, 'Cancelable Run', 'Quick Demo', 'RUNNING', '["ollama-llama3.2"]', '["Jailbreak"]', 10, 5, 0, ?)
      `).run(cancelTestId, now);

      const cancelRes = cancelEvalRun(cancelTestId);
      expect(cancelRes.success).toBe(true);

      const cancelledDetails = getEvalRunDetails(cancelTestId);
      expect(cancelledDetails?.status).toBe('CANCELLED');
    });
  });

  describe('5. Copy & UX Polish (ArgosX Issue 4)', () => {
    it('verifies that RedTeamPage copy uses separated "call sets" instead of run-together "callsets"', () => {
      const redTeamPath = path.resolve(process.cwd(), 'src', 'pages', 'RedTeamPage.tsx');
      const content = fs.readFileSync(redTeamPath, 'utf8');
      expect(content).toContain('choose benchmark call sets');
      expect(content).not.toContain('choose benchmark callsets');
    });

    it('verifies that LandingPage copy eliminates colloquial slang "hallu-grading" in favor of "hallucination grading" (ArgosX Issue 2)', () => {
      const landingPath = path.resolve(process.cwd(), 'src', 'pages', 'LandingPage.tsx');
      const content = fs.readFileSync(landingPath, 'utf8');
      expect(content).toContain('Zero probabilistic hallucination grading');
      expect(content).not.toContain('hallu-grading');
      expect(content).not.toMatch(/\bhallu\b/);
    });
  });
});
