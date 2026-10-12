import type { EvidenceEvent, ChainVerificationReport, SimulatedConfig, GuaranteeDigestMap } from '../types';

/**
 * Deterministically serialize any JavaScript value to canonical JSON.
 * Keys in objects are sorted lexicographically at all nested levels.
 */
export function canonicalJson(data: any): string {
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }

  if (Array.isArray(data)) {
    return '[' + data.map((item) => canonicalJson(item)).join(',') + ']';
  }

  const keys = Object.keys(data).sort();
  const entries = keys.map((key) => {
    return `${JSON.stringify(key)}:${canonicalJson(data[key])}`;
  });

  return '{' + entries.join(',') + '}';
}

/**
 * Compute SHA-256 hex string using Web Crypto API.
 */
export async function sha256Hex(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract only security-relevant config fields, ignoring benign metadata like labels.
 * Normalizes list items for canonical comparison.
 */
export function getSecurityRelevantConfig(config: SimulatedConfig) {
  return {
    gatewaySessionIsolation: config.gatewaySessionIsolation,
    hardeningFlags: {
      dropCapabilities: [...config.hardeningFlags.dropCapabilities].sort(),
      noNewPrivileges: config.hardeningFlags.noNewPrivileges,
      readOnlyRoot: config.hardeningFlags.readOnlyRoot,
      seccompProfile: config.hardeningFlags.seccompProfile,
    },
    redMounts: [...config.redMounts].sort(),
    redNetworks: [...config.redNetworks].sort(),
    storageApiAuthz: config.storageApiAuthz,
  };
}

/**
 * Computes full SHA-256 fingerprint of the security-relevant configuration.
 */
export async function computeConfigFingerprint(config: SimulatedConfig): Promise<string> {
  const securityFields = getSecurityRelevantConfig(config);
  const canonical = canonicalJson(securityFields);
  return await sha256Hex(canonical);
}

/**
 * Computes per-guarantee digests for selective retesting.
 */
export async function computeGuaranteeDigests(config: SimulatedConfig): Promise<GuaranteeDigestMap> {
  const g1 = canonicalJson([...config.redMounts].sort());
  const g2 = canonicalJson([...config.redNetworks].sort());
  const g3 = canonicalJson(config.storageApiAuthz);
  const g4 = canonicalJson(config.gatewaySessionIsolation);
  const g5 = canonicalJson({
    dropCapabilities: [...config.hardeningFlags.dropCapabilities].sort(),
    noNewPrivileges: config.hardeningFlags.noNewPrivileges,
    readOnlyRoot: config.hardeningFlags.readOnlyRoot,
    seccompProfile: config.hardeningFlags.seccompProfile,
  });

  const [h1, h2, h3, h4, h5] = await Promise.all([
    sha256Hex(g1),
    sha256Hex(g2),
    sha256Hex(g3),
    sha256Hex(g4),
    sha256Hex(g5),
  ]);

  return {
    G1: h1,
    G2: h2,
    G3: h3,
    G4: h4,
    G5: h5,
  };
}

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes SHA-256 hash for an event.
 * Canonical representation of { sequence, run_id, timestamp, event_type, payload, previous_event_hash }.
 */
export async function hashEventPayload(
  sequence: number,
  run_id: string,
  timestamp: string,
  event_type: string,
  payload: Record<string, any>,
  previous_event_hash: string
): Promise<string> {
  const eventBody = {
    event_type,
    payload,
    previous_event_hash,
    run_id,
    sequence,
    timestamp,
  };
  return await sha256Hex(canonicalJson(eventBody));
}

/**
 * Verifies the integrity of the evidence hash chain and run plan completeness.
 */
export async function verifyEvidenceChain(events: EvidenceEvent[]): Promise<ChainVerificationReport> {
  if (events.length === 0) {
    return {
      status: 'VALID',
      totalEvents: 0,
      validCount: 0,
      brokenSequenceIndex: null,
      errorMessage: null,
    };
  }

  // Group events by run_id to check completeness against run.started plans
  const runs: Record<string, EvidenceEvent[]> = {};
  for (const ev of events) {
    if (!runs[ev.run_id]) {
      runs[ev.run_id] = [];
    }
    runs[ev.run_id].push(ev);
  }

  // 1. Check for missing events against run plans (INCOMPLETE check)
  for (const runId in runs) {
    const runEvents = runs[runId];
    const startEvent = runEvents.find((e) => e.event_type === 'run.started');
    if (startEvent && Array.isArray(startEvent.payload.expected_plan)) {
      const expectedPlan: string[] = startEvent.payload.expected_plan;
      const actualEventKeys = runEvents.map((e) => {
        if (e.event_type === 'test.started' || e.event_type === 'test.completed') {
          return `${e.event_type}:${e.payload.test_id}`;
        }
        return e.event_type;
      });

      const missing: string[] = [];
      for (const expectedKey of expectedPlan) {
        if (!actualEventKeys.includes(expectedKey)) {
          missing.push(expectedKey);
        }
      }

      if (missing.length > 0) {
        return {
          status: 'INCOMPLETE',
          totalEvents: events.length,
          validCount: 0,
          brokenSequenceIndex: null,
          errorMessage: `Run ${runId} is missing expected evidence events planned in run.started: [${missing.join(', ')}]. Verification failed-closed.`,
          missingEvents: missing,
        };
      }
    }
  }

  // 2. Cryptographic verification of each event in sequence
  let validCount = 0;
  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const expectedPrevHash = i === 0 ? GENESIS_HASH : events[i - 1].event_hash;

    // Check pointer integrity
    if (current.previous_event_hash !== expectedPrevHash) {
      return {
        status: 'TAMPERED',
        totalEvents: events.length,
        validCount,
        brokenSequenceIndex: i,
        errorMessage: `Chain broken at sequence #${current.sequence}: previous_event_hash does not match sequence #${i === 0 ? 0 : events[i - 1].sequence}'s hash.`,
        tamperedEvent: current,
        expectedHash: expectedPrevHash,
        actualHash: current.previous_event_hash,
      };
    }

    // Recompute actual hash of the event contents
    const calculatedHash = await hashEventPayload(
      current.sequence,
      current.run_id,
      current.timestamp,
      current.event_type,
      current.payload,
      current.previous_event_hash
    );

    if (calculatedHash !== current.event_hash) {
      return {
        status: 'TAMPERED',
        totalEvents: events.length,
        validCount,
        brokenSequenceIndex: i,
        errorMessage: `Tampering detected at sequence #${current.sequence} (${current.event_type}): Content payload hash mismatch!`,
        tamperedEvent: current,
        expectedHash: current.event_hash,
        actualHash: calculatedHash,
      };
    }

    validCount++;
  }

  return {
    status: 'VALID',
    totalEvents: events.length,
    validCount,
    brokenSequenceIndex: null,
    errorMessage: null,
  };
}
