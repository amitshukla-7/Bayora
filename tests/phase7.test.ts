import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { getDb, resetAllDemoData, appendAuditEvent, GENESIS_HASH } from '../server/db.mjs';
import { exportEvidenceBundle, verifyEvidenceBundle } from '../server/ledger.mjs';
import { sha256Hex } from '../src/core/canonical.ts';

const BUNDLE_TEST_PATH = path.resolve(process.cwd(), 'workspace', 'test_bundle.json');

describe('Phase 7: Cryptographic Hash Chain, Manifest Signing & Direct-SQL Tamper Detection', () => {
  beforeEach(() => {
    resetAllDemoData();
    if (fs.existsSync(BUNDLE_TEST_PATH)) {
      fs.unlinkSync(BUNDLE_TEST_PATH);
    }
  });

  describe('1. Hash Chain Continuity & ECDSA Manifest Signing', () => {
    it('builds hash chain following Hash_i = SHA256(Hash_{i-1} + RFC8785(Payload_i) + Timestamp_i)', async () => {
      const e1 = appendAuditEvent({
        eventType: 'POLICY_EVALUATION',
        resource: 'doc_1.txt',
        decision: 'ALLOW',
        canonicalPayload: { test: 'payload_1' }
      });

      expect(e1.sequence).toBe(1);
      expect(e1.previous_event_hash).toBe(GENESIS_HASH);

      const expectedH1 = await sha256Hex(GENESIS_HASH + e1.payload_canonical + e1.timestamp);
      expect(e1.event_hash).toBe(expectedH1);

      const e2 = appendAuditEvent({
        eventType: 'MODEL_INFERENCE',
        resource: 'model:llama3.2',
        decision: 'ALLOW',
        canonicalPayload: { test: 'payload_2' }
      });

      expect(e2.sequence).toBe(2);
      expect(e2.previous_event_hash).toBe(e1.event_hash);

      const expectedH2 = await sha256Hex(e1.event_hash + e2.payload_canonical + e2.timestamp);
      expect(e2.event_hash).toBe(expectedH2);
    });

    it('exports signed evidence bundle with valid ECDSA P-256 signature', async () => {
      appendAuditEvent({ eventType: 'EVENT_A', canonicalPayload: { a: 1 } });
      appendAuditEvent({ eventType: 'EVENT_B', canonicalPayload: { b: 2 } });

      const bundle = await exportEvidenceBundle();
      expect(bundle.manifest).toBeDefined();
      expect(bundle.manifest.event_count).toBe(2);
      expect(bundle.manifest_signature).toBeDefined();
      expect(bundle.public_key_jwk).toBeDefined();

      const verification = await verifyEvidenceBundle(bundle);
      expect(verification.status).toBe('VERIFIED');
      expect(verification.valid).toBe(true);
      expect(verification.totalEvents).toBe(2);
    });
  });

  describe('2. Direct-SQL Tamper Tests & Sequence Breakdown Detection', () => {
    it('detects direct payload alteration in SQLite and pinpoints exact broken sequence', async () => {
      appendAuditEvent({ eventType: 'AUDIT_01', canonicalPayload: { secret: 'safe' } });
      appendAuditEvent({ eventType: 'AUDIT_02', canonicalPayload: { secret: 'safe' } });
      appendAuditEvent({ eventType: 'AUDIT_03', canonicalPayload: { secret: 'safe' } });

      const db = getDb();

      // Temporarily bypass trigger in test transaction to simulate malicious direct SQL tampering
      db.exec('DROP TRIGGER IF EXISTS trg_audit_events_no_update');
      db.prepare(`
        UPDATE audit_events
        SET payload_canonical = '{"secret":"MALICIOUS_TAMPERED_INJECTION"}'
        WHERE sequence = 2
      `).run();
      // Re-apply trigger
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_update
        BEFORE UPDATE ON audit_events
        BEGIN
          SELECT RAISE(FAIL, 'audit_events is strictly append-only: UPDATE is prohibited');
        END;
      `);

      const tamperedBundle = await exportEvidenceBundle();
      const verification = await verifyEvidenceBundle(tamperedBundle);

      expect(verification.status).toBe('TAMPERED');
      expect(verification.valid).toBe(false);
      expect(verification.failedSequence).toBe(2);
      expect(verification.details).toContain('Cryptographic digest mismatch at block #2');
    });

    it('detects sequence omissions (missing middle block) and reports gap', async () => {
      appendAuditEvent({ eventType: 'AUDIT_01', canonicalPayload: { id: 1 } });
      appendAuditEvent({ eventType: 'AUDIT_02', canonicalPayload: { id: 2 } });
      appendAuditEvent({ eventType: 'AUDIT_03', canonicalPayload: { id: 3 } });

      const db = getDb();

      // Temporarily drop delete trigger to simulate malicious row deletion
      db.exec('DROP TRIGGER IF EXISTS trg_audit_events_no_delete');
      db.prepare('DELETE FROM audit_events WHERE sequence = 2').run();
      // Re-apply trigger
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_delete
        BEFORE DELETE ON audit_events
        BEGIN
          SELECT RAISE(FAIL, 'audit_events is strictly append-only: DELETE is prohibited');
        END;
      `);

      const deletedBundle = await exportEvidenceBundle();
      const verification = await verifyEvidenceBundle(deletedBundle);

      expect(verification.valid).toBe(false);
      expect(verification.status).toBe('INCOMPLETE');
      expect(verification.failedSequence).toBe(3);
    });

    it('asserts SQLite triggers actively reject direct UPDATE and DELETE operations', () => {
      appendAuditEvent({ eventType: 'AUDIT_TEST', canonicalPayload: { test: true } });
      const db = getDb();

      expect(() => {
        db.prepare("UPDATE audit_events SET decision = 'TAMPER' WHERE sequence = 1").run();
      }).toThrow(/audit_events is strictly append-only/);

      expect(() => {
        db.prepare('DELETE FROM audit_events WHERE sequence = 1').run();
      }).toThrow(/audit_events is strictly append-only/);
    });
  });

  describe('3. Offline CLI Verifier (scripts/verify.mjs)', () => {
    it('executes scripts/verify.mjs via CLI and exits 0 on valid bundle', async () => {
      appendAuditEvent({ eventType: 'VERIFY_CLI_01', canonicalPayload: { val: 42 } });
      appendAuditEvent({ eventType: 'VERIFY_CLI_02', canonicalPayload: { val: 84 } });

      const bundle = await exportEvidenceBundle();
      fs.writeFileSync(BUNDLE_TEST_PATH, JSON.stringify(bundle, null, 2), 'utf8');

      const stdout = execSync(`node scripts/verify.mjs "${BUNDLE_TEST_PATH}"`, {
        encoding: 'utf8'
      });

      expect(stdout).toContain('AUDIT PROOF VALID');
      expect(stdout).toContain('Status:             VERIFIED');
    });

    it('executes scripts/verify.mjs and exits 1 on tampered bundle', async () => {
      appendAuditEvent({ eventType: 'VERIFY_CLI_01', canonicalPayload: { val: 42 } });
      const bundle = await exportEvidenceBundle();

      // Tamper one character in payload
      bundle.events[0].payload_canonical = '{"val":9999}';
      fs.writeFileSync(BUNDLE_TEST_PATH, JSON.stringify(bundle, null, 2), 'utf8');

      expect(() => {
        execSync(`node scripts/verify.mjs "${BUNDLE_TEST_PATH}"`, {
          encoding: 'utf8'
        });
      }).toThrow(); // non-zero exit code (1)
    });
  });
});
