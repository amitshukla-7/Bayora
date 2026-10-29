import { describe, it, expect } from 'vitest';
import { app } from '../server/index.mjs';
import {
  validateAndSanitizeUrl,
  assertSafeIp,
  isObfuscatedIp,
  validateHuggingFaceRepoId,
  validateHuggingFaceFilePath,
  validateOllamaModelIdentifier
} from '../server/security/urlValidator.mjs';

describe('Phase 3: Strict Link & Identifier Validation, SSRF Defense, and Allowlists', () => {

  describe('1. Table-Driven Test Matrix: URI Schemes & Protocol Smuggling (Vectors 1–4)', () => {
    const dangerousSchemes = [
      { name: 'JavaScript URI', input: 'javascript:alert(1)' },
      { name: 'Data URI HTML injection', input: 'data:text/html,<script>alert(1)</script>' },
      { name: 'Data URI base64', input: 'data:text/plain;base64,SGVsbG8=' },
      { name: 'File URI Linux passwd', input: 'file:///etc/passwd' },
      { name: 'File URI Windows win.ini', input: 'file:///C:/Windows/win.ini' },
      { name: 'FTP Protocol', input: 'ftp://ftp.server.internal/weights.bin' },
      { name: 'Gopher Protocol', input: 'gopher://gopher.server.internal/' },
      { name: 'Blob Protocol', input: 'blob:https://example.com/uuid' },
      { name: 'VBScript URI', input: 'vbscript:MsgBox(1)' }
    ];

    for (const { name, input } of dangerousSchemes) {
      it(`strictly rejects ${name} ("${input.slice(0, 30)}...")`, async () => {
        const result = await validateAndSanitizeUrl(input);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/Disallowed URI scheme|Unsupported protocol|Malformed URL/);
      });
    }
  });

  describe('2. Table-Driven Test Matrix: SSRF, Cloud Metadata & Private Networks (Vectors 5–11)', () => {
    const ssrfVectors = [
      { name: 'AWS/GCP/Azure Cloud Metadata IPv4', input: 'http://169.254.169.254/latest/meta-data/' },
      { name: 'Cloud Metadata Hostname metadata.google.internal', input: 'http://metadata.google.internal/computeMetadata/v1/' },
      { name: 'Cloud Metadata Hostname instance-data', input: 'http://instance-data/latest/meta-data/' },
      { name: 'IPv4 Loopback (Standard)', input: 'http://127.0.0.1:8080/admin' },
      { name: 'IPv4 Loopback (Alternate 127.0.1.1)', input: 'http://127.0.1.1:9000/internal' },
      { name: 'IPv6 Loopback [::1]', input: 'http://[::1]:8080/secret' },
      { name: 'IPv6 Unspecified [::]', input: 'http://[::]:8080/' },
      { name: 'IPv4-mapped IPv6 Loopback [::ffff:127.0.0.1]', input: 'http://[::ffff:127.0.0.1]:8000/' },
      { name: 'IPv4-mapped IPv6 Metadata [::ffff:169.254.169.254]', input: 'http://[::ffff:169.254.169.254]/' },
      { name: 'Private RFC 1918 Class A (10.0.0.1)', input: 'http://10.0.0.1:5432/db' },
      { name: 'Private RFC 1918 Class B (172.16.0.1)', input: 'http://172.16.0.1/status' },
      { name: 'Private RFC 1918 Class B (172.31.255.255)', input: 'http://172.31.255.255/' },
      { name: 'Private RFC 1918 Class C (192.168.1.1)', input: 'http://192.168.1.1/router' },
      { name: 'Carrier-Grade NAT (100.64.0.1)', input: 'http://100.64.0.1/' },
      { name: 'Current Network 0.0.0.0', input: 'http://0.0.0.0:8000/' },
      { name: 'Hexadecimal IP notation (0x7f.0.0.1)', input: 'http://0x7f.0.0.1/' },
      { name: 'Octal leading-zero IP notation (0177.0.0.1)', input: 'http://0177.0.0.1/' },
      { name: 'Decimal Integer IP notation (2130706433)', input: 'http://2130706433/' }
    ];

    for (const { name, input } of ssrfVectors) {
      it(`strictly blocks ${name} ("${input}")`, async () => {
        const result = await validateAndSanitizeUrl(input, { allowLocalhost: false });
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/SSRF Block|Unencrypted HTTP protocol/);
      });
    }

    it('identifies obfuscated integer, hex and octal IP notations', () => {
      expect(isObfuscatedIp('2130706433')).toBe(true);
      expect(isObfuscatedIp('0x7f.0.0.1')).toBe(true);
      expect(isObfuscatedIp('0x7f000001')).toBe(true);
      expect(isObfuscatedIp('0177.0.0.1')).toBe(true);
      expect(isObfuscatedIp('127.0.0.1')).toBe(false);
      expect(isObfuscatedIp('api.openai.com')).toBe(false);
    });
  });

  describe('3. Embedded Credentials & Syntax Bounds (Vectors 12–14)', () => {
    it('rejects URLs containing embedded user credentials (user:password@host)', async () => {
      const result = await validateAndSanitizeUrl('https://admin:SuperSecretPassword@api.openai.com/v1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Embedded credentials (user:password@) in URL are strictly prohibited');
    });

    it('rejects overlong URL strings exceeding 2,048 characters', async () => {
      const overlong = 'https://api.example.com/' + 'a'.repeat(2050);
      const result = await validateAndSanitizeUrl(overlong);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum limit of 2048 characters');
    });

    it('rejects URLs containing ASCII control characters or null bytes', async () => {
      const controlCharUrl = 'https://api.openai.com/v1\x00/chat';
      const result = await validateAndSanitizeUrl(controlCharUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('forbidden ASCII control characters');
    });
  });

  describe('4. Valid Secure Endpoints & Localhost Allowlist', () => {
    it('accepts valid public HTTPS endpoints', async () => {
      const result = await validateAndSanitizeUrl('https://api.openai.com/v1/chat/completions');
      expect(result.valid).toBe(true);
      expect(result.url).toBe('https://api.openai.com/v1/chat/completions');
    });

    it('rejects plain HTTP for remote public endpoints', async () => {
      const result = await validateAndSanitizeUrl('http://api.openai.com/v1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unencrypted HTTP protocol is forbidden');
    });

    it('allows localhost/127.0.0.1 HTTP when allowLocalhost option is explicitly true', async () => {
      const resLocal = await validateAndSanitizeUrl('http://localhost:11434/api/generate', { allowLocalhost: true });
      expect(resLocal.valid).toBe(true);

      const resLoopback = await validateAndSanitizeUrl('http://127.0.0.1:11434/api/tags', { allowLocalhost: true });
      expect(resLoopback.valid).toBe(true);
    });

    it('rejects localhost HTTP when allowLocalhost option is false (default)', async () => {
      const res = await validateAndSanitizeUrl('http://localhost:11434/api/generate', { allowLocalhost: false });
      expect(res.valid).toBe(false);
    });
  });

  describe('5. Hugging Face Repository & Weight File Validation (Vectors 16–17)', () => {
    it('validates canonical Hugging Face repository identifiers', () => {
      expect(validateHuggingFaceRepoId('meta-llama/Llama-3.2-3B-Instruct').valid).toBe(true);
      expect(validateHuggingFaceRepoId('TheBloke/Mistral-7B-Instruct-v0.2-GGUF').valid).toBe(true);
      expect(validateHuggingFaceRepoId('Qwen/Qwen2.5-7B').valid).toBe(true);
    });

    it('rejects invalid, malformed or path-traversal HF repository identifiers', () => {
      expect(validateHuggingFaceRepoId('SingleWordNoSlash').valid).toBe(false);
      expect(validateHuggingFaceRepoId('../../etc/passwd').valid).toBe(false);
      expect(validateHuggingFaceRepoId('owner//model').valid).toBe(false);
      expect(validateHuggingFaceRepoId('owner/model/nested/extra').valid).toBe(false);
      expect(validateHuggingFaceRepoId('owner/model;rm -rf /').valid).toBe(false);
    });

    it('permits safe model weight formats (.gguf, .safetensors)', () => {
      expect(validateHuggingFaceFilePath('model-q4_k_m.gguf').valid).toBe(true);
      expect(validateHuggingFaceFilePath('weights/model.safetensors').valid).toBe(true);
    });

    it('strictly rejects executable pickle weights (.pt, .bin, .pkl, .ckpt) to prevent arbitrary code execution', () => {
      const unsafeExtensions = ['pytorch_model.bin', 'model.pt', 'weights.pkl', 'checkpoint.ckpt', 'payload.py', 'runner.sh'];
      for (const unsafe of unsafeExtensions) {
        const res = validateHuggingFaceFilePath(unsafe);
        expect(res.valid).toBe(false);
        expect(res.error).toMatch(/Security Policy Violation: Unsafe serialization format|Unsupported file extension/);
      }
    });

    it('rejects path traversal or absolute file paths in model file specifications', () => {
      expect(validateHuggingFaceFilePath('../../../model.gguf').valid).toBe(false);
      expect(validateHuggingFaceFilePath('/etc/model.gguf').valid).toBe(false);
      expect(validateHuggingFaceFilePath('C:\\Windows\\model.gguf').valid).toBe(false);
    });
  });

  describe('6. Ollama Model Identifier Grammar Validation (Vector 18)', () => {
    it('accepts valid Ollama model tags and identifiers', () => {
      expect(validateOllamaModelIdentifier('llama3.2').valid).toBe(true);
      expect(validateOllamaModelIdentifier('llama3.2:3b').valid).toBe(true);
      expect(validateOllamaModelIdentifier('qwen2.5:7b-instruct-q4_K_M').valid).toBe(true);
      expect(validateOllamaModelIdentifier('mistral:latest').valid).toBe(true);
    });

    it('strictly rejects malicious Ollama model tags containing path traversal or shell characters', () => {
      expect(validateOllamaModelIdentifier('../../etc/shadow').valid).toBe(false);
      expect(validateOllamaModelIdentifier('llama3; rm -rf /').valid).toBe(false);
      expect(validateOllamaModelIdentifier('model/with/slashes').valid).toBe(false);
      expect(validateOllamaModelIdentifier('tag$(id)').valid).toBe(false);
      expect(validateOllamaModelIdentifier('tag`id`').valid).toBe(false);
      expect(validateOllamaModelIdentifier('tag|cat').valid).toBe(false);
    });
  });

  describe('7. API Route Integration: Server-Side URL & Identifier Defense Gate', () => {
    it('POST /api/models rejects SSRF cloud metadata endpoint with HTTP 400', async () => {
      const res = await app.request('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Malicious Metadata Probe',
          provider: 'OpenAI-Compatible',
          identifier: 'evil-probe',
          endpoint: 'http://169.254.169.254/latest/meta-data/'
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/SSRF Block|Unencrypted HTTP protocol/);
    });

    it('POST /api/models rejects JavaScript scheme with HTTP 400', async () => {
      const res = await app.request('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'XSS Vector',
          provider: 'OpenAI-Compatible',
          identifier: 'xss-probe',
          endpoint: 'javascript:alert(document.cookie)'
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Disallowed URI scheme|Unsupported protocol/);
    });

    it('POST /api/models/pull-ollama rejects path traversal tags with HTTP 400', async () => {
      const res = await app.request('/api/models/pull-ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '../../etc/passwd'
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid Ollama model/);
    });

    it('POST /api/models/import-hf rejects invalid repo identifiers without owner with HTTP 400', async () => {
      const res = await app.request('/api/models/import-hf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId: 'invalid-single-word-repo'
        })
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Hugging Face/);
    });
  });
});
