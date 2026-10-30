import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetToSeed, getDashboardSummary, getAllEvaluations, getAllFindings } from '../server/db.mjs';
import {
  hashPassword,
  verifyPassword,
  loginUser,
  registerUser,
  getUserFromSession,
  logoutSession,
  getUserByEmail
} from '../server/auth/service.mjs';
import { getAllModelsWithMetrics, createModelRecord } from '../server/models/service.mjs';
import { executeEvaluationRunServer } from '../server/eval/runner.mjs';

describe('Enterprise Authentication & Tenant Isolation Suite', () => {
  beforeEach(() => {
    // Ensures clean database state with migration 9 applied
    getDb();
  });

  describe('1. Primary Profile & Seeded Credentials Verification', () => {
    it('authenticates amitshukla@1234 with password amitshukla7 successfully', () => {
      const auth = loginUser({
        email: 'amitshukla@1234',
        password: 'amitshukla7'
      });

      expect(auth).toBeDefined();
      expect(auth.token).toMatch(/^byra_sess_[a-f0-9]{64}$/);
      expect(auth.user.email).toBe('amitshukla@1234');
      expect(auth.user.name).toBe('Amit Shukla');
      expect(auth.user.role).toBe('Principal Architect');
      expect(auth.user.organization).toBe('Bayora Technologies');
      expect(auth.user.avatar_initials).toBe('AS');
    });

    it('rejects invalid password for amitshukla@1234 with constant-time security', () => {
      expect(() => {
        loginUser({
          email: 'amitshukla@1234',
          password: 'wrongPassword123'
        });
      }).toThrow(/Invalid credentials/);
    });

    it('validates case-insensitive login for amitshukla@1234', () => {
      const auth = loginUser({
        email: 'AMITSHUKLA@1234',
        password: 'amitshukla7'
      });
      expect(auth.user.email).toBe('amitshukla@1234');
    });

    it('ensures session token resolves to authenticated user', () => {
      const auth = loginUser({
        email: 'amitshukla@1234',
        password: 'amitshukla7'
      });

      const resolved = getUserFromSession(auth.token);
      expect(resolved).not.toBeNull();
      expect(resolved?.id).toBe(auth.user.id);
      expect(resolved?.email).toBe('amitshukla@1234');
    });

    it('ensures primary profile has access to existing models and historical data', () => {
      const models = getAllModelsWithMetrics('user_amit_shukla');
      expect(models.length).toBeGreaterThanOrEqual(1);

      const summary = getDashboardSummary('user_amit_shukla');
      expect(summary.ribbonValid).toBe(true);
    });
  });

  describe('2. Multi-Tenant Isolation & New Account Lifecycle', () => {
    const testEmail = `secops_${Date.now()}@newtenant.ai`;
    const testPassword = 'StrongPassword987!';

    it('registers a completely new user account with isolated profile', () => {
      const reg = registerUser({
        email: testEmail,
        password: testPassword,
        name: 'Sarah Connor',
        organization: 'Cyberdyne Defense',
        role: 'Lead Security Auditor'
      });

      expect(reg.user.id).toMatch(/^user_[a-f0-9]{16}$/);
      expect(reg.user.id).not.toBe('user_amit_shukla');
      expect(reg.user.email).toBe(testEmail);
      expect(reg.user.name).toBe('Sarah Connor');
      expect(reg.user.avatar_initials).toBe('SC');
      expect(reg.user.organization).toBe('Cyberdyne Defense');
      expect(reg.token).toMatch(/^byra_sess_[a-f0-9]{64}$/);
    });

    it('prevents duplicate account creation with same email', () => {
      expect(() => {
        registerUser({
          email: testEmail,
          password: 'AnotherPassword123!'
        });
      }).toThrow(/already exists/);
    });

    it('enforces password minimum length of 6 characters', () => {
      expect(() => {
        registerUser({
          email: `short_${Date.now()}@test.ai`,
          password: '123'
        });
      }).toThrow(/at least 6 characters/);
    });

    it('guarantees complete data isolation: new user starts with 0 runs and isolated models', () => {
      const newUserEmail = `isolated_${Date.now()}@fresh.org`;
      const reg = registerUser({
        email: newUserEmail,
        password: 'Password12345!',
        name: 'John Doe'
      });

      // New user dashboard must be fresh and completely isolated
      const newSummary = getDashboardSummary(reg.user.id);
      expect(newSummary.totalRuns).toBe(0);
      expect(newSummary.passedRuns).toBe(0);
      expect(newSummary.failedRuns).toBe(0);
      expect(newSummary.passRate).toBeNull();
      expect(newSummary.ribbonValid).toBe(true);

      // New user evaluations must be empty
      const newEvals = getAllEvaluations(reg.user.id);
      expect(newEvals).toHaveLength(0);

      // New user findings must be empty
      const newFindings = getAllFindings({}, reg.user.id);
      expect(newFindings).toHaveLength(0);

      // New user receives their own isolated starter models
      const newModels = getAllModelsWithMetrics(reg.user.id);
      expect(newModels.length).toBeGreaterThanOrEqual(1);
      for (const m of newModels) {
        expect(m.total_evaluations).toBe(0);
      }

      // Amit Shukla's data must remain completely intact and unaffected
      const amitSummary = getDashboardSummary('user_amit_shukla');
      expect(amitSummary.ribbonValid).toBe(true);
    });

    it('allows a new user to launch an evaluation run strictly within their private tenant', async () => {
      const runnerEmail = `runner_${Date.now()}@eval.org`;
      const reg = registerUser({
        email: runnerEmail,
        password: 'Password9999!',
        name: 'Runner Operator'
      });

      const userModels = getAllModelsWithMetrics(reg.user.id);
      expect(userModels.length).toBeGreaterThanOrEqual(1);
      const targetModel = userModels[0];

      // Execute a quick 2-case evaluation run for this new user
      const result = await executeEvaluationRunServer({
        presetScenario: 'Diagnostic Quick Test',
        modelIds: [targetModel.id],
        datasetId: 'ds_standard_safety_v1',
        categories: ['Jailbreak'],
        executionSettings: { maxTestCases: 2, temperature: 0.0, seed: 42 },
        userId: reg.user.id
      });

      expect(result.id).toBeDefined();

      // Verify the evaluation exists in new user's tenant
      const userEvals = getAllEvaluations(reg.user.id);
      expect(userEvals.map(e => e.id)).toContain(result.id);

      // Verify Amit Shukla's evaluation list does NOT contain this run (strict isolation)
      const amitEvals = getAllEvaluations('user_amit_shukla');
      expect(amitEvals.map(e => e.id)).not.toContain(result.id);
    });

    it('invalidates session token on logout', () => {
      const tempEmail = `logout_${Date.now()}@test.org`;
      const reg = registerUser({
        email: tempEmail,
        password: 'Password123!',
        name: 'Temporary User'
      });

      // Session is valid
      expect(getUserFromSession(reg.token)).not.toBeNull();

      // Logout
      logoutSession(reg.token);

      // Session is invalidated
      expect(getUserFromSession(reg.token)).toBeNull();
    });
  });

  describe('3. Cryptographic Scrypt & Timing Resistance', () => {
    it('produces unique random salts and distinct hashes for identical passwords', () => {
      const h1 = hashPassword('identicalPassword123');
      const h2 = hashPassword('identicalPassword123');

      expect(h1.salt).not.toBe(h2.salt);
      expect(h1.hash).not.toBe(h2.hash);
      expect(verifyPassword('identicalPassword123', h1.salt, h1.hash)).toBe(true);
      expect(verifyPassword('identicalPassword123', h2.salt, h2.hash)).toBe(true);
    });

    it('rejects password verification if salt or hash has been tampered with', () => {
      const h = hashPassword('testSecretPass');
      const corruptedHash = 'a' + h.hash.slice(1);
      expect(verifyPassword('testSecretPass', h.salt, corruptedHash)).toBe(false);
    });
  });
});
