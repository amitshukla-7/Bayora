import { describe, it, expect, beforeEach } from 'vitest';
import { getDb } from '../server/db.mjs';
import {
  getAllSettings,
  getSetting,
  updateSetting,
  updateBulkSettings,
  resetSettings,
  DEFAULT_SETTINGS
} from '../server/settings.mjs';

describe('Phase 1 — Persistent Settings Architecture', () => {
  beforeEach(() => {
    // Ensure clean state before each test
    resetSettings('all');
  });

  describe('1. Default Settings & Getters', () => {
    it('returns default settings when database has no overrides', () => {
      const settings = getAllSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(settings.timeout_seconds).toBe(60);
      expect(settings.concurrency).toBe(4);
      expect(settings.active_models).toEqual(['mod_llama32', 'mod_gpt4o']);
      expect(settings.active_policies).toEqual(['POL-001', 'POL-002', 'POL-003', 'POL-004', 'POL-005']);
      expect(settings.theme).toBe('system');
      expect(settings.log_level).toBe('info');
      expect(settings.default_dataset).toBe('ds_standard_safety_v1');
      expect(settings.streaming_enabled).toBe(true);
    });

    it('retrieves individual settings by key', () => {
      expect(getSetting('timeout_seconds')).toBe(60);
      expect(getSetting('streaming_enabled')).toBe(true);
      expect(getSetting('theme')).toBe('system');
    });

    it('rejects invalid setting keys when reading', () => {
      expect(() => getSetting('unknown_key')).toThrow(/Invalid setting key/);
    });
  });

  describe('2. Single Setting Updates (PUT /api/settings/:key)', () => {
    it('successfully updates timeout_seconds within valid range [1, 300]', () => {
      const res1 = updateSetting('timeout_seconds', 1);
      expect(res1.value).toBe(1);
      expect(getSetting('timeout_seconds')).toBe(1);

      const res300 = updateSetting('timeout_seconds', 300);
      expect(res300.value).toBe(300);
      expect(getSetting('timeout_seconds')).toBe(300);
    });

    it('rejects timeout_seconds out of bounds (<1 or >300 or float)', () => {
      expect(() => updateSetting('timeout_seconds', 0)).toThrow(/timeout_seconds must be >= 1/);
      expect(() => updateSetting('timeout_seconds', 301)).toThrow(/timeout_seconds must be <= 300/);
      expect(() => updateSetting('timeout_seconds', -10)).toThrow(/timeout_seconds must be >= 1/);
      expect(() => updateSetting('timeout_seconds', 12.5)).toThrow(/timeout_seconds must be an integer/);
      expect(() => updateSetting('timeout_seconds', 'fast')).toThrow();
    });

    it('successfully updates concurrency within valid range [1, 16]', () => {
      const res = updateSetting('concurrency', 8);
      expect(res.value).toBe(8);
      expect(getSetting('concurrency')).toBe(8);

      expect(() => updateSetting('concurrency', 0)).toThrow(/concurrency must be >= 1/);
      expect(() => updateSetting('concurrency', 17)).toThrow(/concurrency must be <= 16/);
    });

    it('validates active_models as a non-empty array of strings', () => {
      const updated = updateSetting('active_models', ['mod_custom_v1', 'mod_claude']);
      expect(updated.value).toEqual(['mod_custom_v1', 'mod_claude']);
      expect(getSetting('active_models')).toEqual(['mod_custom_v1', 'mod_claude']);

      expect(() => updateSetting('active_models', [])).toThrow(/At least one active model must be selected/);
      expect(() => updateSetting('active_models', [''])).toThrow(/Model identifier cannot be empty/);
      expect(() => updateSetting('active_models', 'mod_single')).toThrow();
    });

    it('validates active_policies as a subset of POL-001..005', () => {
      const updated = updateSetting('active_policies', ['POL-001', 'POL-002']);
      expect(updated.value).toEqual(['POL-001', 'POL-002']);
      expect(getSetting('active_policies')).toEqual(['POL-001', 'POL-002']);

      expect(() => updateSetting('active_policies', ['POL-999'])).toThrow();
      expect(() => updateSetting('active_policies', [])).toThrow(/At least one defensive policy must be active/);
    });

    it('validates theme and log_level enums', () => {
      expect(updateSetting('theme', 'dark').value).toBe('dark');
      expect(updateSetting('theme', 'light').value).toBe('light');
      expect(() => updateSetting('theme', 'neon')).toThrow();

      expect(updateSetting('log_level', 'debug').value).toBe('debug');
      expect(updateSetting('log_level', 'warn').value).toBe('warn');
      expect(() => updateSetting('log_level', 'verbose')).toThrow();
    });

    it('validates default_dataset and streaming_enabled', () => {
      expect(updateSetting('default_dataset', 'ds_custom_adversarial').value).toBe('ds_custom_adversarial');
      expect(() => updateSetting('default_dataset', '')).toThrow(/default_dataset cannot be empty/);

      expect(updateSetting('streaming_enabled', false).value).toBe(false);
      expect(updateSetting('streaming_enabled', true).value).toBe(true);
      expect(() => updateSetting('streaming_enabled', 'true')).toThrow();
    });
  });

  describe('3. Bulk Settings Updates (PATCH /api/settings)', () => {
    it('applies multiple valid settings atomically in SQLite', () => {
      const bulkPayload = {
        timeout_seconds: 120,
        concurrency: 2,
        theme: 'dark',
        streaming_enabled: false
      };

      const result = updateBulkSettings(bulkPayload);
      expect(result.timeout_seconds).toBe(120);
      expect(result.concurrency).toBe(2);
      expect(result.theme).toBe('dark');
      expect(result.streaming_enabled).toBe(false);
      // Untouched keys remain default
      expect(result.log_level).toBe('info');
      expect(result.default_dataset).toBe('ds_standard_safety_v1');

      // Verify directly from SQLite
      const all = getAllSettings();
      expect(all.timeout_seconds).toBe(120);
      expect(all.concurrency).toBe(2);
    });

    it('rejects bulk updates with unrecognized keys (strict validation)', () => {
      expect(() => updateBulkSettings({
        timeout_seconds: 90,
        malicious_key: 'hacked'
      })).toThrow(/Unrecognized key/);
    });

    it('rolls back transaction completely if any setting is invalid', () => {
      // Current timeout is 60
      expect(getSetting('timeout_seconds')).toBe(60);

      expect(() => updateBulkSettings({
        timeout_seconds: 150,
        concurrency: 99 // Invalid!
      })).toThrow();

      // Ensure timeout_seconds did NOT get mutated
      expect(getSetting('timeout_seconds')).toBe(60);
    });
  });

  describe('4. Reset to Defaults', () => {
    it('resets a specific section to defaults', () => {
      updateSetting('timeout_seconds', 240);
      updateSetting('theme', 'dark');

      expect(getSetting('timeout_seconds')).toBe(240);
      expect(getSetting('theme')).toBe('dark');

      // Reset runner section only
      const res = resetSettings('runner');
      expect(res.timeout_seconds).toBe(60);
      // Theme should remain dark
      expect(res.theme).toBe('dark');
    });

    it('resets all settings globally to defaults', () => {
      updateBulkSettings({
        timeout_seconds: 180,
        concurrency: 12,
        theme: 'dark',
        log_level: 'error'
      });

      const res = resetSettings('all');
      expect(res).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('5. Database Persistence Across Reconnect', () => {
    it('persists rows in SQLite table `settings`', () => {
      updateSetting('timeout_seconds', 45);

      const db = getDb();
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('timeout_seconds');
      expect(row).toBeDefined();
      expect(JSON.parse(row.value)).toBe(45);
    });
  });

  describe('6. HTTP API Endpoint Tests (/api/settings)', async () => {
    const { app } = await import('../server/index.mjs');

    it('GET /api/settings returns all settings with HTTP 200', async () => {
      const res = await app.request('/api/settings');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.settings).toBeDefined();
      expect(json.settings.timeout_seconds).toBe(60);
      expect(json.settings.concurrency).toBe(4);
    });

    it('GET /api/settings/:key returns individual setting or 400 if invalid', async () => {
      const resOk = await app.request('/api/settings/theme');
      expect(resOk.status).toBe(200);
      const jsonOk = await resOk.json();
      expect(jsonOk).toEqual({ key: 'theme', value: 'system' });

      const resBad = await app.request('/api/settings/not_a_key');
      expect(resBad.status).toBe(400);
    });

    it('PUT /api/settings/:key updates setting or returns 400 on validation failure', async () => {
      const resOk = await app.request('/api/settings/timeout_seconds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 150 })
      });
      expect(resOk.status).toBe(200);
      const jsonOk = await resOk.json();
      expect(jsonOk.value).toBe(150);

      // Verify failure
      const resBad = await app.request('/api/settings/timeout_seconds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 999 }) // Exceeds 300
      });
      expect(resBad.status).toBe(400);
    });

    it('PATCH /api/settings updates multiple settings atomically', async () => {
      const res = await app.request('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concurrency: 8,
          theme: 'dark'
        })
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.settings.concurrency).toBe(8);
      expect(json.settings.theme).toBe('dark');
    });

    it('PATCH /api/settings returns 400 on unrecognized keys', async () => {
      const res = await app.request('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unknown_key: 'test'
        })
      });
      expect(res.status).toBe(400);
    });

    it('POST /api/settings/reset restores defaults per section or globally', async () => {
      // First mutate settings
      await app.request('/api/settings/concurrency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 16 })
      });

      const res = await app.request('/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'runner' })
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.settings.concurrency).toBe(4);
    });
  });
});
