import { BaseModelAdapter } from './base.mjs';

/**
 * Anthropic Messages API Adapter
 */
export class AnthropicAdapter extends BaseModelAdapter {
  constructor(config = {}) {
    super({
      ...config,
      provider: 'anthropic',
      baseUrl: (config.baseUrl || config.base_url || 'https://api.anthropic.com/v1').replace(/\/+$/, ''),
      modelIdentifier: config.modelIdentifier || config.model_identifier || 'claude-3-5-sonnet-20241022'
    });
  }

  async ping() {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { ok: false, error: `Missing API key in environment (${this.apiKeyEnv})` };
    }
    // Ping with a minimal 1-token query or check
    return { ok: true, baseUrl: this.baseUrl, model: this.modelIdentifier };
  }

  async generate(prompt, opts = {}) {
    const startTime = performance.now();
    const timeoutMs = opts.timeoutMs || 45000;
    const temperature = opts.temperature !== undefined ? opts.temperature : (this.parameters.temperature ?? 0.0);
    const maxTokens = opts.maxTokens || 1024;

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error(`Anthropic adapter requires API key via env variable ${this.apiKeyEnv}`);
    }

    const body = {
      model: this.modelIdentifier,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: 'user', content: String(prompt) }
      ]
    };

    if (opts.systemPrompt) {
      body.system = opts.systemPrompt;
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };

    try {
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs)
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`Anthropic HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      let text = '';
      if (Array.isArray(data.content)) {
        text = data.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('');
      }

      const promptTokens = data.usage?.input_tokens || Math.ceil(prompt.length / 4);
      const completionTokens = data.usage?.output_tokens || Math.ceil(text.length / 4);

      const digest = this.computeDigest(prompt, text, this.modelIdentifier);

      return {
        text,
        finishReason: data.stop_reason || 'stop',
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
      throw new Error(`Anthropic adapter failed for model ${this.modelIdentifier}: ${err.message}`);
    }
  }
}

