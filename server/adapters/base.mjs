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
    this.modelIdentifier = config.modelIdentifier || config.model_identifier || config.identifier;
    this.baseUrl = (config.baseUrl || config.base_url || config.endpoint || '').replace(/\/+$/, '');
    this.apiKey = config.apiKey || config.api_key;
    this.apiKeyEnv = config.apiKeyEnv || config.api_key_env;
    this.parameters = config.parameters || {};
  }

  /**
   * Resolve API key from environment variable reference if present
   */
  getApiKey() {
    if (this.apiKey) return this.apiKey;
    if (this.apiKeyEnv && process.env[this.apiKeyEnv]) return process.env[this.apiKeyEnv];
    if (this.baseUrl && this.baseUrl.includes('groq.com')) {
      return process.env.GROQ_API_KEY || null;
    }
    return null;
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

