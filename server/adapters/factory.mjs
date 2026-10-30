import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { OllamaAdapter } from './ollama.mjs';
import { OpenAICompatibleAdapter } from './openaiCompatible.mjs';
import { AnthropicAdapter } from './anthropic.mjs';
import { getDb } from '../db.mjs';

const CONFIG_PATH = path.resolve(process.cwd(), 'models.yaml');

/**
 * Load models from models.yaml
 */
export function loadModelsConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = YAML.parse(raw);
    return Array.isArray(parsed?.models) ? parsed.models : [];
  } catch (err) {
    console.error('Failed to parse models.yaml:', err);
    return [];
  }
}

/**
 * Synchronize models from models.yaml into the SQLite models table
 */
export function syncModelsToDatabase() {
  const models = loadModelsConfig();
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO models (id, name, provider, identifier, model_identifier, endpoint, base_url, api_key_env, parameters, status, is_synthetic, registered_at)
    VALUES (@id, @name, @provider, @identifier, @model_identifier, @endpoint, @base_url, @api_key_env, @parameters, @status, 0, @registered_at)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      provider = excluded.provider,
      identifier = excluded.identifier,
      model_identifier = excluded.model_identifier,
      endpoint = excluded.endpoint,
      base_url = excluded.base_url,
      api_key_env = excluded.api_key_env,
      parameters = excluded.parameters
  `);

  const now = new Date().toISOString();
  for (const m of models) {
    const isVerifiedLocal = m.model_identifier === 'smollm:135m';
    const status = isVerifiedLocal ? 'Active' : (m.api_key_env && process.env[m.api_key_env] ? 'Active' : 'Unverified');
    upsert.run({
      id: m.id,
      name: m.name || m.id,
      provider: m.provider,
      identifier: m.model_identifier,
      model_identifier: m.model_identifier,
      endpoint: m.base_url || null,
      base_url: m.base_url || null,
      api_key_env: m.api_key_env || null,
      parameters: typeof m.parameters === 'object' ? JSON.stringify(m.parameters) : m.parameters || null,
      status,
      registered_at: now
    });
  }
}

/**
 * Instantiate an adapter for a given model ID or model record
 * @param {string|object} modelOrId
 * @returns {BaseModelAdapter}
 */
export function createModelAdapter(modelOrId) {
  let modelConfig = null;

  if (typeof modelOrId === 'string') {
    // Check SQLite first
    try {
      const db = getDb();
      modelConfig = db.prepare('SELECT * FROM models WHERE id = ?').get(modelOrId);
    } catch {
      // DB might not be initialized yet
    }

    // Fall back to models.yaml
    if (!modelConfig) {
      const allYaml = loadModelsConfig();
      modelConfig = allYaml.find(m => m.id === modelOrId);
    }

    if (!modelConfig) {
      throw new Error(`Model not found in database or models.yaml: ${modelOrId}`);
    }
  } else {
    modelConfig = modelOrId;
  }

  // Parse parameters if JSON string
  if (typeof modelConfig.parameters === 'string') {
    try {
      modelConfig.parameters = JSON.parse(modelConfig.parameters);
    } catch {
      modelConfig.parameters = {};
    }
  }

  if (modelConfig.id === 'adaptation') {
    // In cloud production environments (e.g. Render) without a local Ollama daemon,
    // if GROQ_API_KEY is provided, route Adaptation via free Groq Cloud inference.
    // In local development, preserve exact local Ollama execution.
    if (process.env.GROQ_API_KEY && process.env.NODE_ENV === 'production' && !process.env.OLLAMA_HOST) {
      return new OpenAICompatibleAdapter({
        ...modelConfig,
        id: 'adaptation',
        name: 'Adaptation',
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        modelIdentifier: 'qwen/qwen3.8-27b',
        identifier: 'qwen/qwen3.8-27b'
      });
    }
  }

  const provider = (modelConfig.provider || '').toLowerCase();

  switch (provider) {
    case 'ollama':
      return new OllamaAdapter(modelConfig);

    case 'openai':
    case 'openai-compatible':
    case 'vllm':
    case 'lm-studio':
    case 'localai':
      return new OpenAICompatibleAdapter(modelConfig);

    case 'anthropic':
      return new AnthropicAdapter(modelConfig);

    default:
      throw new Error(`Unsupported model provider: "${provider}" for model ${modelConfig.id}`);
  }
}
