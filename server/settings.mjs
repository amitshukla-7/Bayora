import { z } from 'zod';
import { getDb } from './db.mjs';

export const VALID_POLICIES = ['POL-001', 'POL-002', 'POL-003', 'POL-004', 'POL-005'];

export const DEFAULT_SETTINGS = {
  timeout_seconds: 60,
  concurrency: 4,
  active_models: ['mod_llama32', 'mod_gpt4o'],
  active_policies: ['POL-001', 'POL-002', 'POL-003', 'POL-004', 'POL-005'],
  theme: 'system',
  log_level: 'info',
  default_dataset: 'ds_standard_safety_v1',
  streaming_enabled: true
};

export const SETTING_SECTIONS = {
  runner: ['timeout_seconds', 'concurrency', 'streaming_enabled'],
  models_datasets: ['active_models', 'default_dataset'],
  policies: ['active_policies'],
  appearance: ['theme', 'log_level']
};

export const SettingKeySchema = z.enum([
  'timeout_seconds',
  'concurrency',
  'active_models',
  'active_policies',
  'theme',
  'log_level',
  'default_dataset',
  'streaming_enabled'
]);

export const SettingValueSchemas = {
  timeout_seconds: z.number().int({ message: 'timeout_seconds must be an integer' }).min(1, 'timeout_seconds must be >= 1').max(300, 'timeout_seconds must be <= 300'),
  concurrency: z.number().int({ message: 'concurrency must be an integer' }).min(1, 'concurrency must be >= 1').max(16, 'concurrency must be <= 16'),
  active_models: z.array(z.string().min(1, 'Model identifier cannot be empty')).min(1, 'At least one active model must be selected'),
  active_policies: z.array(z.enum(['POL-001', 'POL-002', 'POL-003', 'POL-004', 'POL-005'])).min(1, 'At least one defensive policy must be active'),
  theme: z.enum(['light', 'dark', 'system']),
  log_level: z.enum(['error', 'warn', 'info', 'debug']),
  default_dataset: z.string().min(1, 'default_dataset cannot be empty'),
  streaming_enabled: z.boolean()
};

export const BulkSettingsSchema = z.object({
  timeout_seconds: SettingValueSchemas.timeout_seconds.optional(),
  concurrency: SettingValueSchemas.concurrency.optional(),
  active_models: SettingValueSchemas.active_models.optional(),
  active_policies: SettingValueSchemas.active_policies.optional(),
  theme: SettingValueSchemas.theme.optional(),
  log_level: SettingValueSchemas.log_level.optional(),
  default_dataset: SettingValueSchemas.default_dataset.optional(),
  streaming_enabled: SettingValueSchemas.streaming_enabled.optional()
}).strict({ message: 'Unrecognized setting key provided' });

/**
 * Retrieve all current settings, falling back to defaults if not yet persisted in SQLite
 */
export function getAllSettings() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value, updated_at FROM settings').all();
  const settings = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    if (Object.hasOwn(DEFAULT_SETTINGS, row.key)) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
  }

  return settings;
}

/**
 * Retrieve a single setting by key
 */
export function getSetting(key) {
  const parsedKey = SettingKeySchema.safeParse(key);
  if (!parsedKey.success) {
    throw new Error(`Invalid setting key: "${key}"`);
  }

  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) {
    return DEFAULT_SETTINGS[key];
  }

  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

/**
 * Validate and persist a single setting
 */
export function updateSetting(key, rawValue) {
  const parsedKey = SettingKeySchema.safeParse(key);
  if (!parsedKey.success) {
    const error = new Error(`Invalid setting key: "${key}"`);
    error.statusCode = 400;
    throw error;
  }

  const schema = SettingValueSchemas[key];
  const parsedValue = schema.safeParse(rawValue);
  if (!parsedValue.success) {
    const error = new Error(`Validation failed for "${key}": ${parsedValue.error.issues.map(i => i.message).join('; ')}`);
    error.statusCode = 400;
    error.issues = parsedValue.error.issues;
    throw error;
  }

  const validated = parsedValue.data;
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(validated), now);

  return {
    key,
    value: validated,
    updated_at: now
  };
}

/**
 * Validate and atomically persist multiple settings
 */
export function updateBulkSettings(settingsObj) {
  if (!settingsObj || typeof settingsObj !== 'object' || Array.isArray(settingsObj)) {
    const error = new Error('Settings payload must be a JSON object.');
    error.statusCode = 400;
    throw error;
  }

  const parsed = BulkSettingsSchema.safeParse(settingsObj);
  if (!parsed.success) {
    const error = new Error(`Validation failed: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    error.statusCode = 400;
    error.issues = parsed.error.issues;
    throw error;
  }

  const validatedEntries = Object.entries(parsed.data);
  if (validatedEntries.length === 0) {
    return getAllSettings();
  }

  const db = getDb();
  const now = new Date().toISOString();

  const updateStmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const [k, v] of validatedEntries) {
      updateStmt.run(k, JSON.stringify(v), now);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return getAllSettings();
}

/**
 * Reset settings to defaults (either all or a specific section)
 */
export function resetSettings(section = 'all') {
  const db = getDb();
  let keysToReset = Object.keys(DEFAULT_SETTINGS);

  if (section !== 'all') {
    if (!SETTING_SECTIONS[section]) {
      const error = new Error(`Unknown settings section: "${section}". Valid sections are: ${Object.keys(SETTING_SECTIONS).join(', ')}, all`);
      error.statusCode = 400;
      throw error;
    }
    keysToReset = SETTING_SECTIONS[section];
  }

  const now = new Date().toISOString();
  const updateStmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const k of keysToReset) {
      updateStmt.run(k, JSON.stringify(DEFAULT_SETTINGS[k]), now);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return getAllSettings();
}
