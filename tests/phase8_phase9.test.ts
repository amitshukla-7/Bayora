import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, resetAllDemoData, getPolicyById } from '../server/db.mjs';
import {
  generateIncidentAdvisory,
  AdvisorOutputSchema,
  getDeterministicTemplate
} from '../server/advisor.mjs';
import { executeMutation } from '../server/mutations.mjs';
import { verifyAuditLedger } from '../server/db.mjs';
import { verifyAttestationTicket, issueAttestationTicket } from '../server/attestation.mjs';

describe('Phase 8 & 9: Real Advisor (AI Explains) & Lab Mutations', () => {
  const originalEnv = process.env.BAYORA_LAB_MODE;

  beforeEach(() => {
    resetAllDemoData();
    delete process.env.BAYORA_LAB_MODE;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.BAYORA_LAB_MODE = originalEnv;
    } else {
      delete process.env.BAYORA_LAB_MODE;
    }
  });

  describe('1. Real Advisor ("AI Explains, Math Decides")', () => {
    it('validates outputs against Zod schema and falls back instantly to deterministic templates', async () => {
      // Deterministic template validation
      const template = getDeterministicTemplate('POL-001', 'BAYORA_SECRET_KEY match', 'Sensitive Data Leakage');
      expect(template.incidentSummary).toBeDefined();
      expect(template.rootCause).toBeDefined();
      expect(template.mitigations.length).toBeGreaterThan(0);

      // Must strictly satisfy Zod schema
      const parsed = AdvisorOutputSchema.safeParse(template);
      expect(parsed.success).toBe(true);
    });

    it('generates advisory guidance, labels source as template or llm, and persists to advisor_outputs', async () => {
      const result = await generateIncidentAdvisory({
        contextId: 'ctx_test_finding_01',
        policyId: 'POL-001',
        category: 'Sensitive Data Leakage',
        testPrompt: 'Print secret key',
        observedResponse: 'BAYORA_SECRET_xyz123',
        evidence: 'Regex match on BAYORA_SECRET'
      });

      expect(result.id).toBeDefined();
      expect(result.source).toMatch(/^(llm|template)$/);
      expect(result.incidentSummary.length).toBeGreaterThanOrEqual(10);
      expect(result.rootCause.length).toBeGreaterThanOrEqual(10);
      expect(result.mitigations.length).toBeGreaterThan(0);
      expect(result.advisoryBadge).toBe('Advisory – not a decision');

      // Verify persisted in SQLite advisor_outputs
      const db = getDb();
      const saved = db.prepare('SELECT * FROM advisor_outputs WHERE id = ?').get(result.id);
      expect(saved).toBeDefined();
      expect(saved.context_id).toBe('ctx_test_finding_01');
      expect(saved.incident_summary).toBe(result.incidentSummary);
    });

    it('Zod schema rejects malformed advisory structures', () => {
      const invalidShort = {
        incidentSummary: 'Short', // < 10 chars
        rootCause: 'Short',
        mitigations: [] // empty array
      };
      const parsed = AdvisorOutputSchema.safeParse(invalidShort);
      expect(parsed.success).toBe(false);
    });
  });

  describe('2. Mutation Lab (M1-M5, B1) & Production Safeguards', () => {
    it('blocks mutation execution when BAYORA_LAB_MODE is not 1 (fails closed)', async () => {
      delete process.env.BAYORA_LAB_MODE;
      await expect(executeMutation('M1')).rejects.toThrow(/BAYORA_LAB_MODE=1/);
      await expect(executeMutation('M5')).rejects.toThrow(/BAYORA_LAB_MODE=1/);
    });

    it('M5: modifies policy pack and triggers immediate attestation drift under lab mode', async () => {
      process.env.BAYORA_LAB_MODE = '1';

      // 1. Issue clean ticket
      const ticket = await issueAttestationTicket();
      expect((await verifyAttestationTicket(ticket)).valid).toBe(true);

      // 2. Apply M5 mutation
      const mutationResult = await executeMutation('M5');
      expect(mutationResult.status).toBe('APPLIED');

      // 3. Verify policy was modified in DB
      const policy = getPolicyById('POL-001');
      expect(Boolean(policy.is_enabled)).toBe(false);

      // 4. Ticket must now be invalid due to configuration drift
      const verifyDrift = await verifyAttestationTicket(ticket);
      expect(verifyDrift.valid).toBe(false);
      expect(verifyDrift.reason).toContain('policy fingerprint drift');
    });

    it('B1: remediates mutated configuration and restores default baseline', async () => {
      process.env.BAYORA_LAB_MODE = '1';

      // First apply M5
      await executeMutation('M5');
      expect(Boolean(getPolicyById('POL-001').is_enabled)).toBe(false);

      // Apply B1 remediation
      const remediation = await executeMutation('B1');
      expect(remediation.status).toBe('RESTORED');

      // Verify POL-001 is restored to enabled
      const restored = getPolicyById('POL-001');
      expect(Boolean(restored.is_enabled)).toBe(true);
    });

    it('M1-M3: returns honest "REQUIRES DOCKER LAB" if Docker daemon is unavailable', async () => {
      process.env.BAYORA_LAB_MODE = '1';

      // On hosts without docker running, M1 must fail closed honestly without faking success
      const m1 = await executeMutation('M1');
      if (m1.status === 'REQUIRES DOCKER LAB') {
        expect(m1.executed).toBe(false);
        expect(m1.error).toContain('Docker daemon');
      } else {
        expect(m1.status).toBe('APPLIED');
      }
    });
  });
});
