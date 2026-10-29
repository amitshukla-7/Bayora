import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../server/index.mjs';
import { getDb, resetAllDemoData, getPolicyById } from '../server/db.mjs';
import {
  executeMutation,
  restoreBaseline,
  remediateCrashedMutations,
  getLabStatus,
  MUTATION_CATALOG
} from '../server/mutations.mjs';
import { computeCanonicalPolicyFingerprint } from '../server/attestation.mjs';

describe('Phase 3: Real Mutation Lab (Tier A Docker-Free & Tier B Docker, 6-Step Contract)', () => {
  beforeEach(async () => {
    process.env.BAYORA_LAB_MODE = '1';
    resetAllDemoData();
    await restoreBaseline();
  });

  describe('1. Mutation Catalog & Status', () => {
    it('exposes Tier A and Tier B catalogs correctly', async () => {
      expect(MUTATION_CATALOG.tierA.length).toBeGreaterThanOrEqual(5);
      expect(MUTATION_CATALOG.tierB.length).toBeGreaterThanOrEqual(5);

      const status = await getLabStatus();
      expect(status.labModeEnabled).toBe(true);
      expect(status.catalog).toBeDefined();
    });

    it('GET /api/lab/status returns live status from SQLite', async () => {
      const res = await app.request('/api/lab/status');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.labModeEnabled).toBe(true);
      expect(typeof json.dockerAvailable).toBe('boolean');
    });
  });

  describe('2. Tier A (Docker-Free) Mutations & 6-Step Execution Contract', () => {
    it('M1-A: relaxes secret entropy ceiling, causes fingerprint drift, and detects secret leak breach', async () => {
      const fpBefore = await computeCanonicalPolicyFingerprint();
      const res = await executeMutation('M1-A');

      expect(res.executed).toBe(true);
      expect(res.status).toBe('APPLIED');
      expect(res.tier).toBe('TIER_A');
      expect(res.fingerprintChanged).toBe(true);
      expect(res.fpAfter).not.toBe(fpBefore);
      expect(res.breachDetected).toBe(true);

      // Verify 6-step contract
      expect(res.stepLog).toHaveLength(6);
      expect(res.stepLog[0].name).toContain('Preflight');
      expect(res.stepLog[1].status).toBe('APPLIED');
      expect(res.stepLog[2].status).toBe('PASS');
      expect(res.stepLog[3].status).toBe('STALE');
      expect(res.stepLog[4].status).toBe('COMPLETED');
      expect(res.stepLog[5].status).toBe('BREACH_DETECTED');

      // Selective retest details
      expect(res.retestResults.length).toBeGreaterThanOrEqual(2);
      expect(res.retestResults.some((r: any) => r.breachDetected)).toBe(true);
    });

    it('M2-A: disables prompt injection delimiters, causes drift, and detects override breach', async () => {
      const res = await executeMutation('M2-A');
      expect(res.executed).toBe(true);
      expect(res.fingerprintChanged).toBe(true);
      expect(res.breachDetected).toBe(true);
      expect(res.retestResults.some((r: any) => r.breachDetected && r.category === 'Prompt Injection')).toBe(true);
    });

    it('M3-A: adds wildcard * to tool allowlist, causes drift, and detects exfiltration breach', async () => {
      const res = await executeMutation('M3-A');
      expect(res.executed).toBe(true);
      expect(res.fingerprintChanged).toBe(true);
      expect(res.breachDetected).toBe(true);
      expect(res.retestResults.some((r: any) => r.breachDetected && r.category === 'Tool Manipulation')).toBe(true);
    });

    it('M4-A: disables canary context isolation and detects cross-session canary bleed', async () => {
      const res = await executeMutation('M4-A');
      expect(res.executed).toBe(true);
      expect(res.fingerprintChanged).toBe(true);
      expect(res.breachDetected).toBe(true);
      expect(res.retestResults.some((r: any) => r.breachDetected && r.category === 'Session Isolation')).toBe(true);
    });

    it('B1-A: Benign Negative Control asserts fingerprint invariance and zero false positive breaches', async () => {
      const fpBefore = await computeCanonicalPolicyFingerprint();
      const res = await executeMutation('B1-A');

      expect(res.executed).toBe(true);
      expect(res.fingerprintChanged).toBe(false);
      expect(res.fpAfter).toBe(fpBefore); // Exact invariance
      expect(res.breachDetected).toBe(false); // Zero false positives!
      expect(res.retestResults.every((r: any) => !r.breachDetected)).toBe(true);
    });
  });

  describe('3. Persistence in SQLite mutation_runs & STALE Status Invalidation', () => {
    it('persists each mutation run in SQLite mutation_runs table', async () => {
      await executeMutation('M1-A');
      const db = getDb();
      const run = db.prepare('SELECT * FROM mutation_runs ORDER BY applied_at DESC LIMIT 1').get();
      expect(run).toBeDefined();
      expect(run.mutation_id).toBe('M1-A');
      expect(run.tier).toBe('TIER_A');
      expect(run.status).toBe('APPLIED');
      expect(run.breach_detected).toBe(1);
    });

    it('marks completed evaluation runs as STALE upon applying an adversarial mutation', async () => {
      const db = getDb();
      const model = db.prepare('SELECT id, identifier FROM models LIMIT 1').get();
      const modelId = model ? model.id : 'm1';
      const modelIdentifier = model ? model.identifier : 'ollama-llama3.2';

      if (!model) {
        db.prepare(`
          INSERT INTO models (id, name, provider, identifier, version, model_type, execution_mode, registered_at)
          VALUES ('m1', 'Test Model', 'Ollama', 'ollama-llama3.2', '1.0', 'chat', 'Live', datetime('now'))
        `).run();
      }

      db.prepare(`
        INSERT INTO eval_runs (id, name, model_id, model_identifier, status, created_at)
        VALUES ('eval_stale_test', 'Cached Run', ?, ?, 'COMPLETED', datetime('now'))
      `).run(modelId, modelIdentifier);

      await executeMutation('M1-A');

      const run = db.prepare('SELECT status FROM eval_runs WHERE id = ?').get('eval_stale_test');
      expect(run.status).toBe('STALE');
    });
  });

  describe('4. Panic Restore Button & Baseline Recovery', () => {
    it('restoreBaseline resets SQLite policies, updates mutation_runs, and restores fingerprint', async () => {
      // 1. Mutate POL-001
      await executeMutation('M1-A');
      const mutatedPolicy = getPolicyById('POL-001');
      expect(mutatedPolicy.rules).toContain('99');

      // 2. Trigger restoreBaseline
      const restored = await restoreBaseline();
      expect(restored.status).toBe('RESTORED');

      // 3. Confirm policy rules restored to default
      const cleanPolicy = getPolicyById('POL-001');
      expect(cleanPolicy.rules).not.toContain('99');

      // 4. Confirm mutation_runs marked as RESTORED
      const db = getDb();
      const activeCount = db.prepare(`SELECT COUNT(*) as cnt FROM mutation_runs WHERE status = 'APPLIED' AND restored_at IS NULL`).get().cnt;
      expect(activeCount).toBe(0);
    });

    it('POST /api/lab/restore-baseline triggers 1-click restore via HTTP', async () => {
      await executeMutation('M2-A');
      const res = await app.request('/api/lab/restore-baseline', { method: 'POST' });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('RESTORED');
    });
  });

  describe('5. Startup Auto-Remediation of Crashed Runs', () => {
    it('automatically restores certified baseline if an unrecovered mutation is found on startup', async () => {
      const db = getDb();
      // Simulate crash: mutation applied in DB without restored_at
      db.prepare(`
        INSERT INTO mutation_runs (id, mutation_id, tier, name, status, applied_at)
        VALUES ('mut_crash_1', 'M1-A', 'TIER_A', 'Crashed Mutation', 'APPLIED', datetime('now'))
      `).run();

      // Corrupt POL-001 rules
      db.prepare(`
        UPDATE policy_configs SET rules_json = '{"entropy_threshold": 99.0}' WHERE id = 'POL-001'
      `).run();

      // Simulate startup auto-remediation
      await remediateCrashedMutations();

      // Check clean state
      const pol001 = db.prepare('SELECT rules_json FROM policy_configs WHERE id = ?').get('POL-001');
      expect(pol001.rules_json).not.toContain('99.0');
      const active = db.prepare(`SELECT COUNT(*) as cnt FROM mutation_runs WHERE status = 'APPLIED' AND restored_at IS NULL`).get().cnt;
      expect(active).toBe(0);
    });
  });
});
