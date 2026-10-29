import crypto from 'node:crypto';

/**
 * Base Model Adapter Interface
 * All model adapters must implement this contract.
 */
export class BaseModelAdapter {
  constructor(config = {}) {
    this.id = config.id;
    this.name = config.name || config.id;
    this.provider = config.provider;
    this.modelIdentifier = config.model_identifier || config.modelIdentifier;
    this.baseUrl = config.base_url || config.baseUrl;
    this.apiKeyEnv = config.api_key_env || config.apiKeyEnv;
    this.parameters = config.parameters || {};
  }

  /**
   * Resolve API key from environment variable reference if present
   */
  getApiKey() {
    if (!this.apiKeyEnv) return null;
    return process.env[this.apiKeyEnv] || null;
  }

  /**
   * Compute deterministic SHA-256 digest of input prompt and generated completion
   */
  computeDigest(prompt, text, model) {
    const payload = JSON.stringify({
      model: model || this.modelIdentifier,
      prompt: String(prompt),
      response: String(text)
    });
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  /**
   * Execute model inference
   * @param {string} prompt 
   * @param {object} opts { temperature, seed, timeoutMs, systemPrompt, toolCalls }
   * @returns {Promise<{
   *   text: string,
   *   toolCalls?: Array<any>,
   *   latencyMs: number,
   *   tokens: { prompt: number, completion: number, total: number },
   *   model: string,
   *   digest: string
   * }>}
   */
  async generate(prompt, opts = {}) {
    throw new Error('BaseModelAdapter.generate() must be implemented by subclass');
  }

  /**
   * Ping/healthcheck to verify adapter endpoint availability
   */
  async ping() {
    return { ok: false, message: 'Healthcheck not implemented' };
  }
}

