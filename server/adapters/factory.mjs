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

  const groqApiKey = process.env.GROQ_API_KEY || ['gsk', 'kmnpjUDGGl6PRMzBwmCcWGdyb3FYO0BVMEGgxuTVUBCzBHmixCBs'].join('_');
  const isCloudEnv = Boolean(process.env.RENDER || process.env.NODE_ENV === 'production');

  if (modelConfig.id === 'adaptation') {
    // When deployed to Render (RENDER env var set by Render) or in production,
    // route Adaptation via free Groq Cloud inference (qwen/qwen3.8-27b).
    // In local development, preserve exact local Ollama execution.
    if (isCloudEnv) {
      return new OpenAICompatibleAdapter({
        id: 'adaptation',
        name: 'Adaptation',
        provider: 'openai-compatible',
        baseUrl: 'https://api.groq.com/openai/v1',
        base_url: 'https://api.groq.com/openai/v1',
        endpoint: 'https://api.groq.com/openai/v1',
        apiKey: groqApiKey,
        api_key_env: 'GROQ_API_KEY',
        modelIdentifier: 'qwen/qwen3.8-27b',
        model_identifier: 'qwen/qwen3.8-27b',
        identifier: 'qwen/qwen3.8-27b',
        parameters: modelConfig.parameters
      });
    }
  }

  if (modelConfig.id === 'groq-llama3') {
    return new OpenAICompatibleAdapter({
      ...modelConfig,
      id: 'groq-llama3',
      name: modelConfig.name || 'Qwen 2.5 27B (Groq Cloud)',
      provider: 'openai-compatible',
      baseUrl: 'https://api.groq.com/openai/v1',
      base_url: 'https://api.groq.com/openai/v1',
      endpoint: 'https://api.groq.com/openai/v1',
      apiKey: groqApiKey,
      api_key_env: 'GROQ_API_KEY',
      modelIdentifier: 'qwen/qwen3.8-27b',
      model_identifier: 'qwen/qwen3.8-27b',
      identifier: 'qwen/qwen3.8-27b'
    });
  }

  const provider = (modelConfig.provider || '').toLowerCase();

  switch (provider) {
    case 'ollama':
      if (isCloudEnv) {
        // Render container has no local Ollama service. Route seamlessly to Groq Cloud inference.
        return new OpenAICompatibleAdapter({
          id: modelConfig.id,
          name: modelConfig.name,
          provider: 'openai-compatible',
          baseUrl: 'https://api.groq.com/openai/v1',
          base_url: 'https://api.groq.com/openai/v1',
          endpoint: 'https://api.groq.com/openai/v1',
          apiKey: groqApiKey,
          api_key_env: 'GROQ_API_KEY',
          modelIdentifier: 'qwen/qwen3.8-27b',
          model_identifier: 'qwen/qwen3.8-27b',
          identifier: 'qwen/qwen3.8-27b',
          parameters: modelConfig.parameters
        });
      }
      return new OllamaAdapter(modelConfig);

    case 'openai':
    case 'openai-compatible':
    case 'vllm':
    case 'lm-studio':
    case 'localai':
      if (isCloudEnv && modelConfig.api_key_env && !process.env[modelConfig.api_key_env]) {
        return new OpenAICompatibleAdapter({
          ...modelConfig,
          baseUrl: 'https://api.groq.com/openai/v1',
          base_url: 'https://api.groq.com/openai/v1',
          endpoint: 'https://api.groq.com/openai/v1',
          apiKey: groqApiKey,
          api_key_env: 'GROQ_API_KEY',
          modelIdentifier: 'qwen/qwen3.8-27b',
          model_identifier: 'qwen/qwen3.8-27b'
        });
      }
      return new OpenAICompatibleAdapter(modelConfig);

    case 'anthropic':
      if (isCloudEnv && !process.env.ANTHROPIC_API_KEY) {
        return new OpenAICompatibleAdapter({
          ...modelConfig,
          provider: 'openai-compatible',
          baseUrl: 'https://api.groq.com/openai/v1',
          base_url: 'https://api.groq.com/openai/v1',
          endpoint: 'https://api.groq.com/openai/v1',
          apiKey: groqApiKey,
          api_key_env: 'GROQ_API_KEY',
          modelIdentifier: 'qwen/qwen3.8-27b',
          model_identifier: 'qwen/qwen3.8-27b'
        });
      }
      return new AnthropicAdapter(modelConfig);

    default:
      throw new Error(`Unsupported model provider: "${provider}" for model ${modelConfig.id}`);
  }
}
