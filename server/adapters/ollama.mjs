import { BaseModelAdapter } from './base.mjs';

/**
 * Ollama Adapter (Local, Credential-Free Default)
 */
export class OllamaAdapter extends BaseModelAdapter {
  constructor(config = {}) {
    super({
      ...config,
      provider: 'ollama',
      baseUrl: config.baseUrl || config.base_url || 'http://localhost:11434',
      modelIdentifier: config.modelIdentifier || config.model_identifier || 'llama3.2:3b'
    });
  }

  async ping() {
    try {
      const res = await fetch(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, version: data.version, baseUrl: this.baseUrl };
      }
      return { ok: false, status: res.status, message: res.statusText };
    } catch (err) {
      return { ok: false, error: err.message, baseUrl: this.baseUrl };
    }
  }

  async generate(prompt, opts = {}) {
    const startTime = performance.now();
    const timeoutMs = opts.timeoutMs || 45000;
    const temperature = opts.temperature !== undefined ? opts.temperature : (this.parameters.temperature ?? 0.0);
    const seed = opts.seed !== undefined ? opts.seed : (this.parameters.seed ?? 42);

    const body = {
      model: this.modelIdentifier,
      prompt: String(prompt),
      stream: false,
      options: {
        temperature,
        seed
      }
    };

    if (opts.systemPrompt) {
      body.system = opts.systemPrompt;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs)
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`Ollama HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const text = data.response || '';
      const promptTokens = data.prompt_eval_count || Math.ceil(prompt.length / 4);
      const completionTokens = data.eval_count || Math.ceil(text.length / 4);

      const digest = this.computeDigest(prompt, text, this.modelIdentifier);

      return {
        text,
        toolCalls: [],
        latencyMs,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens
        },
        model: this.modelIdentifier,
        digest
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - startTime);
      throw new Error(`Ollama adapter failed for model ${this.modelIdentifier} (${this.baseUrl}): ${err.message}`);
    }
  }
}

