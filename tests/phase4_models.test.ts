import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../server/index.mjs';
import { getDb, resetAllDemoData } from '../server/db.mjs';
import {
  getAllModelsWithMetrics,
  getModelWithMetrics,
  createModelRecord,
  updateModelRecord,
  deleteModelRecord,
  verifyModel,
  handleGgufUpload,
  importHuggingFaceModel,
  GGUF_MAGIC
} from '../server/models/service.mjs';

describe('Phase 4: Model Registry, Verification Pipeline, GGUF/Pickle Checks & Live Metrics', () => {
  beforeEach(() => {
    resetAllDemoData();
  });

  describe('1. CRUD in SQLite & Live Metrics Aggregation', () => {
    it('creates, reads, updates, and deletes a model record in SQLite', async () => {
      const created = await createModelRecord({
        name: 'Llama 3.2 1B Evaluation',
        provider: 'Ollama',
        identifier: 'llama3.2:1b',
        version: '1.0.0',
        description: 'Test evaluation model',
        execution_mode: 'Simulation'
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Llama 3.2 1B Evaluation');
      expect(created.status).toBe('Testing');

      // Update
      const updated = await updateModelRecord(created.id, {
        description: 'Updated test description',
        status: 'Active'
      });
      expect(updated.description).toBe('Updated test description');
      expect(updated.status).toBe('Active');

      // Delete
      const deleted = deleteModelRecord(created.id);
      expect(deleted.success).toBe(true);
      expect(getModelWithMetrics(created.id)).toBeNull();
    });

    it('computes live pass_rate and risk_score from SQLite eval_runs, returning null for empty models', async () => {
      const model = await createModelRecord({
        name: 'Metrics Test Model',
        provider: 'Ollama',
        identifier: 'test-metrics-llm',
        execution_mode: 'Simulation'
      });

      // Initially no runs: metrics must be null (honest empty state)
      const emptyModel = getModelWithMetrics(model.id);
      expect(emptyModel.total_evaluations).toBe(0);
      expect(emptyModel.pass_rate).toBeNull();
      expect(emptyModel.risk_score).toBeNull();

      // Insert actual eval_run in SQLite
      const db = getDb();
      db.prepare(`
        INSERT INTO eval_runs (
          id, name, model_id, model_identifier, status, total_cases,
          passed_count, failed_count, warning_count, created_at
        ) VALUES ('eval_metrics_1', 'Security Benchmark', ?, ?, 'COMPLETED', 10, 8, 2, 0, datetime('now'))
      `).run(model.id, model.identifier);

      // Now metrics must be computed purely from the SQL rows
      const computedModel = getModelWithMetrics(model.id);
      expect(computedModel.total_evaluations).toBe(1);
      expect(computedModel.total_cases).toBe(10);
      expect(computedModel.passed_count).toBe(8);
      expect(computedModel.failed_count).toBe(2);
      expect(computedModel.pass_rate).toBe(80.0);
      expect(computedModel.risk_score).toBe(20.0);
    });
  });

  describe('2. Model Verification Pipeline', () => {
    it('successfully verifies Simulation model and sets status = Active with nonce echo', async () => {
      const model = await createModelRecord({
        name: 'Verified Model',
        provider: 'Ollama',
        identifier: 'verified-ollama',
        execution_mode: 'Simulation'
      });

      const verified = await verifyModel(model.id);
      expect(verified.status).toBe('Active');
      expect(verified.verification_details.nonceEchoVerified).toBe(true);
      expect(verified.verification_details.steps.length).toBeGreaterThanOrEqual(3);
      expect(verified.verification_details.diagnostic).toContain('passed');
    });

    it('fails verification and sets FAILED_VERIFICATION when endpoint is unreachable', async () => {
      const model = await createModelRecord({
        name: 'Dead Endpoint Model',
        provider: 'OpenAI',
        identifier: 'dead-gpt',
        execution_mode: 'Live',
        endpoint: 'http://127.0.0.1:59998/v1/chat' // Unreachable
      });

      const failed = await verifyModel(model.id);
      expect(failed.status).toBe('FAILED_VERIFICATION');
      expect(failed.verification_details.diagnostic).toContain('Connectivity Check Failed');
      expect(failed.verification_details.steps.some((s: any) => s.status === 'FAIL')).toBe(true);
    });
  });

  describe('3. Local GGUF Upload, Magic Bytes & Pickle Rejection', () => {
    it('accepts valid GGUF binary with 0x47475546 magic bytes and saves to workspace/models', async () => {
      // Create valid GGUF header
      const validGguf = Buffer.concat([
        GGUF_MAGIC,
        Buffer.from([0x03, 0x00, 0x00, 0x00]), // version 3
        Buffer.alloc(32) // padding
      ]);

      const model = await handleGgufUpload(validGguf, 'llama-3.2-1b.gguf');
      expect(model.id).toContain('mod_gguf_');
      expect(model.provider).toBe('Local GGUF');
      expect(model.status).toBe('Active');
      expect(model.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(model.file_path).toContain('.gguf');
    });

    it('rejects corrupted payload missing GGUF magic bytes with clear error', async () => {
      const corrupted = Buffer.from('NOT_A_GGUF_FILE');
      await expect(handleGgufUpload(corrupted, 'corrupted.gguf')).rejects.toThrow(
        /Missing GGUF magic bytes/
      );
    });

    it('strictly rejects PyTorch executable pickle files (.pt, .bin, .pkl) with CWE-502 security warning', async () => {
      const dummyPayload = Buffer.from('pickle_payload');

      await expect(handleGgufUpload(dummyPayload, 'model.pt')).rejects.toThrow(
        /Security Violation: Executable PyTorch\/pickle weights.*CWE-502/
      );
      await expect(handleGgufUpload(dummyPayload, 'pytorch_model.bin')).rejects.toThrow(
        /Security Violation.*CWE-502/
      );
      await expect(handleGgufUpload(dummyPayload, 'weights.pkl')).rejects.toThrow(
        /Security Violation.*CWE-502/
      );
    });
  });

  describe('4. Hugging Face Safe Import Validation', () => {
    it('validates repo format and rejects invalid repo identifiers', async () => {
      await expect(importHuggingFaceModel('invalid-repo-without-slash')).rejects.toThrow(
        /Expected format: "org\/model-name"/
      );
    });
  });

  describe('5. HTTP Model Registry Endpoints', () => {
    it('POST /api/models validates payload with Zod and returns 400 on invalid input', async () => {
      const res = await app.request('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }) // Missing identifier
      });
      expect(res.status).toBe(400);
    });

    it('POST /api/models with valid payload creates and returns model', async () => {
      const res = await app.request('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'API Registered Model',
          provider: 'Ollama',
          identifier: 'api-model-1',
          execution_mode: 'Simulation'
        })
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBeDefined();
      expect(json.name).toBe('API Registered Model');
    });

    it('POST /api/models/:id/verify triggers verification pipeline via HTTP', async () => {
      const created = await createModelRecord({
        name: 'Verify API Target',
        provider: 'Ollama',
        identifier: 'verify-api-target',
        execution_mode: 'Simulation'
      });

      const res = await app.request(`/api/models/${created.id}/verify`, { method: 'POST' });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('Active');
    });
  });
});
