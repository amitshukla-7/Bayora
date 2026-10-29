import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetAllDemoData } from '../server/db.mjs';
import { reduceAssuranceState, runAllProbes, checkDockerAvailable } from '../server/probes/runner.mjs';

describe('Phase 6: Real Isolation Probes T01-T05 & State Machine Reducer', () => {
  beforeEach(() => {
    resetAllDemoData();
  });

  describe('1. Pure State Machine Reducer (Property & State Transition Tests)', () => {
    it('transitions UNVERIFIED -> VERIFIED when all probes PASS under fresh configuration', () => {
      const probes = [
        { probeId: 'T01', status: 'PASS' },
        { probeId: 'T02', status: 'PASS' },
        { probeId: 'T03', status: 'PASS' },
        { probeId: 'T04', status: 'PASS' },
        { probeId: 'T05', status: 'PASS' }
      ];
      const state = reduceAssuranceState('UNVERIFIED', probes, {
        ticketExpired: false,
        configChanged: false,
        ledgerValid: true
      });
      expect(state).toBe('VERIFIED');
    });

    it('stays UNVERIFIED if any probe is UNVERIFIED (e.g. Docker unavailable)', () => {
      const probes = [
        { probeId: 'T01', status: 'PASS' },
        { probeId: 'T02', status: 'UNVERIFIED' },
        { probeId: 'T03', status: 'PASS' }
      ];
      const state = reduceAssuranceState('UNVERIFIED', probes, {
        ticketExpired: false,
        configChanged: false,
        ledgerValid: true
      });
      expect(state).toBe('UNVERIFIED');
    });

    it('transitions immediately to BREACHED if any probe FAILS', () => {
      const probes = [
        { probeId: 'T01', status: 'PASS' },
        { probeId: 'T02', status: 'FAIL' },
        { probeId: 'T03', status: 'PASS' }
      ];
      const stateFromVerified = reduceAssuranceState('VERIFIED', probes);
      expect(stateFromVerified).toBe('BREACHED');

      const stateFromUnverified = reduceAssuranceState('UNVERIFIED', probes);
      expect(stateFromUnverified).toBe('BREACHED');
    });

    it('transitions VERIFIED -> STALE when ticket expires or policy config drifts', () => {
      const probes = [
        { probeId: 'T01', status: 'PASS' },
        { probeId: 'T02', status: 'PASS' }
      ];

      // Ticket expired (> 5 min)
      const staleByExpiry = reduceAssuranceState('VERIFIED', probes, { ticketExpired: true });
      expect(staleByExpiry).toBe('STALE');

      // Policy configuration changed
      const staleByDrift = reduceAssuranceState('VERIFIED', probes, { configChanged: true });
      expect(staleByDrift).toBe('STALE');
    });

    it('transitions BREACHED -> RECOVERING -> VERIFIED during remediation lifecycle', () => {
      const failedProbes = [{ probeId: 'T01', status: 'FAIL' }];
      const cleanProbes = [{ probeId: 'T01', status: 'PASS' }];

      // In breach
      expect(reduceAssuranceState('BREACHED', failedProbes)).toBe('BREACHED');

      // Remediation initiated
      const recovering = reduceAssuranceState('BREACHED', cleanProbes, { isRemediated: true });
      expect(recovering).toBe('VERIFIED'); // Clean probes + remediated -> restored

      // Remediation in progress with unverified probes -> stays RECOVERING
      const inProgress = reduceAssuranceState('BREACHED', [{ probeId: 'T01', status: 'UNVERIFIED' }], { isRemediated: true });
      expect(inProgress).toBe('RECOVERING');
    });

    it('property test: ledger tampering always forces UNVERIFIED regardless of probes', () => {
      const allStates = ['UNVERIFIED', 'VERIFIED', 'STALE', 'BREACHED', 'RECOVERING'];
      const cleanProbes = [{ probeId: 'T01', status: 'PASS' }];

      for (const st of allStates) {
        const state = reduceAssuranceState(st, cleanProbes, { ledgerValid: false });
        expect(state).toBe('UNVERIFIED');
      }
    });
  });

  describe('2. Isolation Probe Runner & Fail-Closed Enforcement', () => {
    it('reports NOT RUN -> UNVERIFIED when Docker is unavailable, never faking PASS', async () => {
      const dockerStatus = await checkDockerAvailable();
      const runResult = await runAllProbes();

      expect(runResult.runId).toBeDefined();
      expect(runResult.timestamp).toBeDefined();
      expect(runResult.results).toHaveLength(5);

      if (!dockerStatus.available) {
        // Must fail closed with UNVERIFIED
        expect(runResult.overallStatus).toBe('UNVERIFIED');
        for (const probe of runResult.results) {
          expect(probe.status).toBe('UNVERIFIED');
          expect(probe.evidence.status).toBe('NOT RUN -> UNVERIFIED');
        }
      }

      // Verify persistence in SQLite probe_runs and probe_results
      const db = getDb();
      const savedRun = db.prepare('SELECT * FROM probe_runs WHERE id = ?').get(runResult.runId);
      expect(savedRun).toBeDefined();

      const savedResults = db.prepare('SELECT * FROM probe_results WHERE run_id = ?').all(runResult.runId);
      expect(savedResults).toHaveLength(5);
    });
  });
});

