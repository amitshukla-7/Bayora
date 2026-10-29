import Docker from 'dockerode';
import { getDb, updatePolicy, resetToSeed } from './db.mjs';
import { checkDockerAvailable, runAllProbes } from './probes/runner.mjs';

/**
 * Mutation Lab Controller (M1-M5, B1)
 * Requires BAYORA_LAB_MODE=1 to run mutations.
 * If Docker is unavailable, returns REQUIRES DOCKER LAB.
 */
export async function executeMutation(mutationId) {
  if (process.env.BAYORA_LAB_MODE !== '1') {
    throw new Error('Access Denied: Mutation Lab is disabled. Set BAYORA_LAB_MODE=1 environment variable to enable.');
  }

  const dockerStatus = await checkDockerAvailable();
  const db = getDb();

  switch (mutationId) {
    case 'M1': {
      // M1: Kill model-gateway container
      if (!dockerStatus.available) {
        return {
          mutationId: 'M1',
          name: 'Kill Model-Gateway Container',
          executed: false,
          status: 'REQUIRES DOCKER LAB',
          error: 'Docker daemon is not available on this host.'
        };
      }
      try {
        const docker = new Docker();
        const container = docker.getContainer('sentinelflow_gateway');
        await container.stop({ t: 2 });
        return {
          mutationId: 'M1',
          name: 'Kill Model-Gateway Container',
          executed: true,
          status: 'APPLIED',
          details: 'Container sentinelflow_gateway stopped successfully.'
        };
      } catch (err) {
        return {
          mutationId: 'M1',
          name: 'Kill Model-Gateway Container',
          executed: false,
          status: 'ERROR',
          error: err.message
        };
      }
    }

    case 'M2': {
      // M2: Simulate network partition (disconnect blue container from network)
      if (!dockerStatus.available) {
        return {
          mutationId: 'M2',
          name: 'Simulate Network Partition',
          executed: false,
          status: 'REQUIRES DOCKER LAB',
          error: 'Docker daemon is not available on this host.'
        };
      }
      try {
        const docker = new Docker();
        const network = docker.getNetwork('blue_net');
        await network.disconnect({ Container: 'sentinelflow_blue', Force: true });
        return {
          mutationId: 'M2',
          name: 'Simulate Network Partition',
          executed: true,
          status: 'APPLIED',
          details: 'Container sentinelflow_blue disconnected from blue_net.'
        };
      } catch (err) {
        return {
          mutationId: 'M2',
          name: 'Simulate Network Partition',
          executed: false,
          status: 'ERROR',
          error: err.message
        };
      }
    }

    case 'M3': {
      // M3: Drop MinIO storage accessibility
      if (!dockerStatus.available) {
        return {
          mutationId: 'M3',
          name: 'Drop Object Storage Access',
          executed: false,
          status: 'REQUIRES DOCKER LAB',
          error: 'Docker daemon is not available on this host.'
        };
      }
      try {
        const docker = new Docker();
        const container = docker.getContainer('sentinelflow_minio');
        await container.stop({ t: 2 });
        return {
          mutationId: 'M3',
          name: 'Drop Object Storage Access',
          executed: true,
          status: 'APPLIED',
          details: 'Container sentinelflow_minio stopped to simulate storage failure.'
        };
      } catch (err) {
        return {
          mutationId: 'M3',
          name: 'Drop Object Storage Access',
          executed: false,
          status: 'ERROR',
          error: err.message
        };
      }
    }

    case 'M4': {
      // M4: Corrupt cryptographic audit log in SQLite
      // Demonstrates trigger blocking OR bypass for audit test
      try {
        db.exec('DROP TRIGGER IF EXISTS trg_audit_events_no_update');
        const res = db.prepare(`
          UPDATE audit_events
          SET payload_canonical = '{"tampered":true,"injected_at":1730000000}'
          WHERE sequence = (SELECT MAX(sequence) FROM audit_events)
        `).run();

        // Restore trigger
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_update
          BEFORE UPDATE ON audit_events
          BEGIN
            SELECT RAISE(FAIL, 'audit_events is strictly append-only: UPDATE is prohibited');
          END;
        `);

        return {
          mutationId: 'M4',
          name: 'Corrupt Audit Hash Chain Block',
          executed: true,
          status: 'APPLIED',
          rowsAffected: res.changes,
          details: 'Altered canonical payload of latest audit event. Offline verifier will now report TAMPERED.'
        };
      } catch (err) {
        return {
          mutationId: 'M4',
          name: 'Corrupt Audit Hash Chain Block',
          executed: false,
          status: 'BLOCKED_BY_TRIGGER',
          error: err.message
        };
      }
    }

    case 'M5': {
      // M5: Modify active policy pack (causes instant attestation drift)
      try {
        updatePolicy('POL-001', { is_enabled: 0 });
        return {
          mutationId: 'M5',
          name: 'Disable Gateway Policy POL-001',
          executed: true,
          status: 'APPLIED',
          details: 'Disabled POL-001. Attestation tickets now drifted; state is STALE.'
        };
      } catch (err) {
        return {
          mutationId: 'M5',
          name: 'Disable Gateway Policy POL-001',
          executed: false,
          status: 'ERROR',
          error: err.message
        };
      }
    }

    case 'B1': {
      // B1: Remediate / restore baseline
      // Reset policies to default, restart containers if docker available, re-run probes
      resetToSeed();

      let dockerRemediated = false;
      if (dockerStatus.available) {
        try {
          const docker = new Docker();
          const gw = docker.getContainer('sentinelflow_gateway');
          await gw.start().catch(() => {});
          const minio = docker.getContainer('sentinelflow_minio');
          await minio.start().catch(() => {});
          const net = docker.getNetwork('blue_net');
          await net.connect({ Container: 'sentinelflow_blue' }).catch(() => {});
          dockerRemediated = true;
        } catch {}
      }

      const freshProbes = await runAllProbes();

      return {
        mutationId: 'B1',
        name: 'Remediate & Restore Baseline',
        executed: true,
        status: 'RESTORED',
        dockerRemediated,
        probes: freshProbes,
        details: 'Baseline configuration restored. Schema and default policies reset.'
      };
    }

    default:
      throw new Error(`Unknown mutation identifier: ${mutationId}`);
  }
}
