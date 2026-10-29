import { BaseModelAdapter } from './base.mjs';

/**
 * OpenAI-Compatible Adapter (vLLM, LM Studio, OpenAI, LocalAI, etc.)
 */
export class OpenAICompatibleAdapter extends BaseModelAdapter {
  constructor(config = {}) {
    super({
      ...config,
      provider: config.provider || 'openai-compatible',
      baseUrl: (config.baseUrl || config.base_url || 'https://api.openai.com/v1').replace(/\/+$/, ''),
      modelIdentifier: config.modelIdentifier || config.model_identifier || 'gpt-4o'
    });
  }

  async ping() {
    try {
      const headers = { 'Content-Type': 'application/json' };
      const apiKey = this.getApiKey();
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      const res = await fetch(`${this.baseUrl}/models`, {
        headers,
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        return { ok: true, baseUrl: this.baseUrl };
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

    const messages = [];
    if (opts.systemPrompt) {
      messages.push({ role: 'system', content: opts.systemPrompt });
    }
    messages.push({ role: 'user', content: String(prompt) });

    const body = {
      model: this.modelIdentifier,
      messages,
      temperature
    };

    if (seed !== undefined && seed !== null) {
      body.seed = seed;
    }
    if (opts.maxTokens) {
      body.max_tokens = opts.maxTokens;
    }
    if (opts.tools) {
      body.tools = opts.tools;
    }

    const headers = {
      'Content-Type': 'application/json'
    };
    const apiKey = this.getApiKey();
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs)
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`OpenAI HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const choice = data.choices && data.choices[0];
      const text = choice?.message?.content || '';
      const toolCalls = choice?.message?.tool_calls || [];

      const promptTokens = data.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
      const completionTokens = data.usage?.completion_tokens || Math.ceil(text.length / 4);

      const digest = this.computeDigest(prompt, text, this.modelIdentifier);

      return {
        text,
        toolCalls,
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
      throw new Error(`OpenAI-compatible adapter failed for model ${this.modelIdentifier} (${this.baseUrl}): ${err.message}`);
    }
  }
}

