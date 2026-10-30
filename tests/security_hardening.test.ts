import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { canonicalJson, constantTimeEqual, GENESIS_HASH, sha256Hex } from '../src/core/canonical';
import { detectCanaryLeak } from '../src/core/leakDetector';
import { verifyEvidenceChain, hashEventPayload } from '../src/utils/crypto';
import { CreateModelSchema } from '../server/models/service.mjs';
import type { EvidenceEvent } from '../src/types';

describe('Security Hardening Test Suite (Enterprise Verification)', () => {
  describe('1. Canonicalization Determinism & Prototype Pollution Immunity (CWE-1321)', () => {
    it('produces identical byte outputs regardless of key insertion order', () => {
      const obj1 = { beta: 'two', alpha: 'one', gamma: { delta: 4, charlie: 3 } };
      const obj2 = { gamma: { charlie: 3, delta: 4 }, alpha: 'one', beta: 'two' };
      expect(canonicalJson(obj1)).toBe(canonicalJson(obj2));
      expect(canonicalJson(obj1)).toBe('{"alpha":"one","beta":"two","gamma":{"charlie":3,"delta":4}}');
    });

    it('rejects and excludes __proto__, constructor, and prototype attributes', () => {
      const maliciousPayload = {
        legitimateKey: 'secure',
        __proto__: { injectedAdmin: true },
        constructor: { evil: 'pollution' },
        prototype: { bad: 'actor' },
      };
      const serialized = canonicalJson(maliciousPayload);
      expect(serialized).toBe('{"legitimateKey":"secure"}');
      expect(serialized).not.toContain('injectedAdmin');
      expect(serialized).not.toContain('evil');
      expect(serialized).not.toContain('prototype');
    });

    it('enforces maximum depth cap and rejects circular/deeply nested structures', () => {
      let deeplyNested: any = { depth: 0 };
      let current = deeplyNested;
      for (let i = 1; i < 70; i++) {
        current.child = { depth: i };
        current = current.child;
      }
      expect(() => canonicalJson(deeplyNested)).toThrow(/Maximum canonicalization depth exceeded/);
    });
  });

  describe('2. Constant-Time Equality Comparison (CWE-208 / CWE-385)', () => {
    it('accurately verifies equality across identical cryptographic hashes', () => {
      const hashA = '49599cacb85c0775eec04a5a8e9df899998a848006a53fa4d71be9d554f6453b';
      const hashB = '49599cacb85c0775eec04a5a8e9df899998a848006a53fa4d71be9d554f6453b';
      expect(constantTimeEqual(hashA, hashB)).toBe(true);
    });

    it('accurately detects single-bit and single-character mismatches without short-circuiting', () => {
      const hashA = '49599cacb85c0775eec04a5a8e9df899998a848006a53fa4d71be9d554f6453b';
      const hashDiffFirst = '59599cacb85c0775eec04a5a8e9df899998a848006a53fa4d71be9d554f6453b';
      const hashDiffLast = '49599cacb85c0775eec04a5a8e9df899998a848006a53fa4d71be9d554f6453c';
      expect(constantTimeEqual(hashA, hashDiffFirst)).toBe(false);
      expect(constantTimeEqual(hashA, hashDiffLast)).toBe(false);
    });

    it('safely rejects length differences and non-string inputs', () => {
      expect(constantTimeEqual('short', 'longer_string')).toBe(false);
      expect(constantTimeEqual(null as any, 'string')).toBe(false);
      expect(constantTimeEqual('string', undefined as any)).toBe(false);
      expect(constantTimeEqual(12345 as any, 12345 as any)).toBe(false);
    });
  });

  describe('3. Evidence Chain Integrity Verification (VALID / TAMPERED / INCOMPLETE)', () => {
    it('verifies a valid unbroken 3-block evidence chain as VALID', async () => {
      const runId = 'run_sec_test_01';
      const time0 = '2026-10-30T00:00:01.000Z';
      const time1 = '2026-10-30T00:00:02.000Z';

      const payload0 = { test: 'init' };
      const hash0 = await hashEventPayload(1, runId, time0, 'run.init', payload0, GENESIS_HASH);

      const payload1 = { status: 'passed' };
      const hash1 = await hashEventPayload(2, runId, time1, 'test.completed', payload1, hash0);

      const chain: EvidenceEvent[] = [
        {
          sequence: 1,
          run_id: runId,
          timestamp: time0,
          event_type: 'run.init',
          payload: payload0,
          previous_event_hash: GENESIS_HASH,
          event_hash: hash0,
        },
        {
          sequence: 2,
          run_id: runId,
          timestamp: time1,
          event_type: 'test.completed',
          payload: payload1,
          previous_event_hash: hash0,
          event_hash: hash1,
        },
      ];

      const report = await verifyEvidenceChain(chain);
      expect(report.status).toBe('VALID');
      expect(report.validCount).toBe(2);
    });

    it('detects pointer tampering and returns TAMPERED with sequence detail', async () => {
      const runId = 'run_sec_test_02';
      const time0 = '2026-10-30T00:00:01.000Z';
      const time1 = '2026-10-30T00:00:02.000Z';

      const payload0 = { test: 'init' };
      const hash0 = await hashEventPayload(1, runId, time0, 'run.init', payload0, GENESIS_HASH);

      const chain: EvidenceEvent[] = [
        {
          sequence: 1,
          run_id: runId,
          timestamp: time0,
          event_type: 'run.init',
          payload: payload0,
          previous_event_hash: GENESIS_HASH,
          event_hash: hash0,
        },
        {
          sequence: 2,
          run_id: runId,
          timestamp: time1,
          event_type: 'test.completed',
          payload: { status: 'passed' },
          previous_event_hash: 'tampered_previous_hash_value_000000000000000000000000000000000000',
          event_hash: 'dummy_hash',
        },
      ];

      const report = await verifyEvidenceChain(chain);
      expect(report.status).toBe('TAMPERED');
      expect(report.brokenSequenceIndex).toBe(1);
    });

    it('detects payload modification and returns TAMPERED', async () => {
      const runId = 'run_sec_test_03';
      const time0 = '2026-10-30T00:00:01.000Z';
      const payload0 = { test: 'init' };
      const hash0 = await hashEventPayload(1, runId, time0, 'run.init', payload0, GENESIS_HASH);

      const chain: EvidenceEvent[] = [
        {
          sequence: 1,
          run_id: runId,
          timestamp: time0,
          event_type: 'run.init',
          payload: { test: 'adversarial_modification' }, // Modified payload
          previous_event_hash: GENESIS_HASH,
          event_hash: hash0,
        },
      ];

      const report = await verifyEvidenceChain(chain);
      expect(report.status).toBe('TAMPERED');
    });

    it('detects omission of planned lifecycle events and fails closed as INCOMPLETE', async () => {
      const runId = 'run_sec_test_04';
      const time0 = '2026-10-30T00:00:01.000Z';
      const startPayload = {
        expected_plan: ['run.started', 'test.started:T01', 'test.completed:T01'],
      };
      const hash0 = await hashEventPayload(1, runId, time0, 'run.started', startPayload, GENESIS_HASH);

      const chain: EvidenceEvent[] = [
        {
          sequence: 1,
          run_id: runId,
          timestamp: time0,
          event_type: 'run.started',
          payload: startPayload,
          previous_event_hash: GENESIS_HASH,
          event_hash: hash0,
        },
      ];

      const report = await verifyEvidenceChain(chain);
      expect(report.status).toBe('INCOMPLETE');
      expect(report.missingEvents).toContain('test.started:T01');
      expect(report.missingEvents).toContain('test.completed:T01');
    });
  });

  describe('4. Input Validation & Metacharacter Sanitization (CWE-20 / CWE-1333)', () => {
    it('sanitizes canary tokens containing regex metacharacters without crashing or throwing ReDoS', () => {
      const dangerousCanary = 'CANARY_(*+?^$|[]{}\\)';
      const mockResponse = `The confidential secret is: ${dangerousCanary} inside memory.`;

      expect(() => {
        const result = detectCanaryLeak(mockResponse, dangerousCanary);
        expect(result.leaked).toBe(true);
        expect(result.excerpt).toContain('[REDACTED_CANARY:');
      }).not.toThrow();
    });

    it('enforces maximum length boundaries on model registration schema', () => {
      const oversizedName = 'A'.repeat(150); // Max is 100
      const oversizedIdentifier = 'B'.repeat(250); // Max is 200

      const resultOversized = CreateModelSchema.safeParse({
        name: oversizedName,
        provider: 'ollama',
        identifier: 'valid-id',
      });
      expect(resultOversized.success).toBe(false);

      const resultOversizedId = CreateModelSchema.safeParse({
        name: 'Valid Name',
        provider: 'ollama',
        identifier: oversizedIdentifier,
      });
      expect(resultOversizedId.success).toBe(false);
    });

    it('strips control characters from model registration names and identifiers', () => {
      const dirtyName = 'Malicious\x00Model\x1b[31mEscape\x7f';
      const parseResult = CreateModelSchema.safeParse({
        name: dirtyName,
        provider: 'ollama',
        identifier: 'model-clean-id',
      });
      expect(parseResult.success).toBe(true);
      if (parseResult.success) {
        expect(parseResult.data.name).toBe('MaliciousModel[31mEscape');
        expect(parseResult.data.name).not.toContain('\x00');
        expect(parseResult.data.name).not.toContain('\x1b');
        expect(parseResult.data.name).not.toContain('\x7f');
      }
    });
  });

  describe('5. SEO & Social Preview Metadata (ArgosX Issue 2)', () => {
    it('verifies that index.html contains complete Open Graph and social preview metadata', () => {
      const htmlPath = path.resolve(process.cwd(), 'index.html');
      const html = fs.readFileSync(htmlPath, 'utf8');

      // og:title
      expect(html).toMatch(/<meta\s+property=["']og:title["']\s+content=["'][^"']+["']/i);
      // og:description
      expect(html).toMatch(/<meta\s+property=["']og:description["']\s+content=["'][^"']+["']/i);
      // og:image
      expect(html).toMatch(/<meta\s+property=["']og:image["']\s+content=["'][^"']+["']/i);
      // og:type
      expect(html).toMatch(/<meta\s+property=["']og:type["']\s+content=["']website["']/i);
      // twitter cards
      expect(html).toMatch(/<meta\s+name=["']twitter:card["']\s+content=["'][^"']+["']/i);
      expect(html).toMatch(/<meta\s+name=["']twitter:title["']\s+content=["'][^"']+["']/i);
      expect(html).toMatch(/<meta\s+name=["']twitter:description["']\s+content=["'][^"']+["']/i);
      expect(html).toMatch(/<meta\s+name=["']twitter:image["']\s+content=["'][^"']+["']/i);

      // Verify public og-image asset exists
      const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']https?:\/\/[^/]+(\/[^"']+)["']/i);
      expect(imageMatch).not.toBeNull();
      if (imageMatch) {
        const publicFile = path.resolve(process.cwd(), 'public', imageMatch[1].replace(/^\//, ''));
        expect(fs.existsSync(publicFile)).toBe(true);
      }
    });
  });
});

