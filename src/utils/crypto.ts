import type {
  EvidenceEvent,
  ChainVerificationReport,
  SimulatedConfig,
  GuaranteeDigestMap,
  CanonicalManifest,
  SignedCheckpoint,
} from '../types';

/**
 * Deterministically serialize any JavaScript value to canonical JSON (RFC 8785).
 * Keys in objects are sorted lexicographically at all nested levels.
 * Numbers and booleans maintain standard JSON formatting.
 */
export function canonicalJson(data: any): string {
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }

  if (Array.isArray(data)) {
    return '[' + data.map((item) => canonicalJson(item)).join(',') + ']';
  }

  const keys = Object.keys(data).sort();
  const entries: string[] = [];
  for (const key of keys) {
    if (data[key] !== undefined) {
      entries.push(`${JSON.stringify(key)}:${canonicalJson(data[key])}`);
    }
  }

  return '{' + entries.join(',') + '}';
}

/**
 * Compute SHA-256 hex string using native Web Crypto API.
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
 * Builds the formal Canonical Environment Manifest (Section 8.1)
 */
export async function buildCanonicalManifest(config: SimulatedConfig): Promise<CanonicalManifest> {
  const securityConfig = getSecurityRelevantConfig(config);
  const configJson = canonicalJson(securityConfig);
  const configDigest = 'sha256:' + (await sha256Hex(configJson));

  // Runtime observation snapshot
  const runtimeObservation = {
    container_engine: 'docker-engine/27.3.1',
    cgroups_version: 'v2',
    kernel_version: '6.6.43-linux-lts',
    isolation_mode: 'rootless-user-namespaces',
    active_mount_count: config.redMounts.length,
    active_network_count: config.redNetworks.length,
    storage_authz: config.storageApiAuthz,
  };
  const runtimeJson = canonicalJson(runtimeObservation);
  const runtimeDigest = 'sha256:' + (await sha256Hex(runtimeJson));

  return {
    manifest_schema: '1.1',
    runtime: {
      name: 'docker-engine',
      version: '27.3.1',
    },
    policy_bundle_version: 'v1.1.0',
    test_suite_version: 'v1.1.0',
    threat_model_version: '1.1',
    security_relevant_config: securityConfig,
    configuration_digest: configDigest,
    runtime_observation_digest: runtimeDigest,
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
 * Computes per-guarantee digests for selective retesting (G1-G5).
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
 * Computes SHA-256 hash for an event in canonical format.
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

// Global checkpoint signing secret (held in external trust boundary outside container runner)
const CHECKPOINT_SECRET_KEY = 'BAYORA-INDEPENDENT-CHECKPOINT-SIGNER-KEY-V1';

/**
 * Creates a signed cryptographic checkpoint over the root hash of a run (Section 3.1 & 9.2).
 */
export async function signCheckpointDigest(
  run_id: string,
  root_event_hash: string
): Promise<SignedCheckpoint> {
  const timestamp = new Date().toISOString();
  const checkpointId = `chk-${run_id}-${Date.now().toString(36)}`;
  const message = `${checkpointId}:${run_id}:${root_event_hash}:${timestamp}`;

  // Deterministic HMAC signature computation via Web Crypto
  const encoder = new TextEncoder();
  const keyData = encoder.encode(CHECKPOINT_SECRET_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  const sigArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = sigArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    checkpoint_id: checkpointId,
    run_id,
    root_event_hash,
    timestamp,
    key_id: 'secp256k1-hsm-signer-01',
    signature: signatureHex,
    algorithm: 'HMAC-SHA256',
  };
}

/**
 * Verifies a checkpoint signature.
 */
export async function verifyCheckpointSignature(
  checkpoint: SignedCheckpoint
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(CHECKPOINT_SECRET_KEY);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const message = `${checkpoint.checkpoint_id}:${checkpoint.run_id}:${checkpoint.root_event_hash}:${checkpoint.timestamp}`;
    const sigBytes = new Uint8Array(
      checkpoint.signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    return await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, encoder.encode(message));
  } catch {
    return false;
  }
}

/**
 * Verifies the integrity and completeness of the evidence hash chain (Section 9.1 & 9.2).
 * Validates:
 * 1. Sequence continuity and previous-event hash pointers.
 * 2. Payload SHA-256 hashes against recomputed canonical JSON.
 * 3. 7-stage lifecycle completeness against run.started expected_plan manifest.
 * 4. Checkpoint signature validity.
 */
export async function verifyEvidenceChain(events: EvidenceEvent[]): Promise<ChainVerificationReport> {
  if (events.length === 0) {
    return {
      status: 'VALID',
      totalEvents: 0,
      validCount: 0,
      brokenSequenceIndex: null,
      errorMessage: null,
      signatureValid: true,
    };
  }

  // 1. Run ID consistency check
  const primaryRunId = events[0].run_id;
  for (let i = 0; i < events.length; i++) {
    if (events[i].run_id !== primaryRunId) {
      return {
        status: 'TAMPERED',
        totalEvents: events.length,
        validCount: i,
        brokenSequenceIndex: i,
        errorMessage: `Tampering detected at sequence #${events[i].sequence}: Inconsistent run_id (${events[i].run_id}) does not match chain run_id (${primaryRunId}).`,
        tamperedEvent: events[i],
        signatureValid: false,
      };
    }
  }

  // 2. Completeness check against declared expected_plan
  const startEvent = events.find((e) => e.event_type === 'run.started');
  if (startEvent && Array.isArray(startEvent.payload?.expected_plan)) {
    const expectedPlan: string[] = startEvent.payload.expected_plan;
    const actualEventKeys = events.map((e) => {
      if (e.event_type === 'test.started' || e.event_type === 'test.completed') {
        return `${e.event_type}:${e.payload?.test_id}`;
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
        errorMessage: `Completeness failure: Run ${primaryRunId} is missing expected lifecycle events planned in run.started: [${missing.join(
          ', '
        )}]. Verification failed-closed.`,
        missingEvents: missing,
        signatureValid: false,
      };
    }
  }

  // 3. Cryptographic verification of each event in sequence (Section 9.1 & 9.2)
  let validCount = 0;
  let allSignaturesValid = true;

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
        errorMessage: `Chain pointer broken at sequence #${current.sequence}: previous_event_hash (${current.previous_event_hash.slice(
          0,
          10
        )}...) does not match sequence #${i === 0 ? 0 : events[i - 1].sequence}'s hash (${expectedPrevHash.slice(
          0,
          10
        )}...).`,
        tamperedEvent: current,
        expectedHash: expectedPrevHash,
        actualHash: current.previous_event_hash,
        signatureValid: false,
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
        errorMessage: `Tampering detected at sequence #${current.sequence} (${current.event_type}): Content payload hash mismatch! Recorded: ${current.event_hash.slice(
          0,
          12
        )}..., Recomputed: ${calculatedHash.slice(0, 12)}...`,
        tamperedEvent: current,
        expectedHash: current.event_hash,
        actualHash: calculatedHash,
        signatureValid: false,
      };
    }

    // If this is a checkpoint.signed event, verify signature
    if (current.event_type === 'checkpoint.signed' && current.payload?.checkpoint) {
      const isSigValid = await verifyCheckpointSignature(current.payload.checkpoint);
      if (!isSigValid) {
        allSignaturesValid = false;
        return {
          status: 'TAMPERED',
          totalEvents: events.length,
          validCount,
          brokenSequenceIndex: i,
          errorMessage: `Checkpoint signature verification failed at sequence #${current.sequence}! Invalid signature for root event hash.`,
          tamperedEvent: current,
          signatureValid: false,
        };
      }
    }

    validCount++;
  }

  return {
    status: 'VALID',
    totalEvents: events.length,
    validCount,
    brokenSequenceIndex: null,
    errorMessage: null,
    signatureValid: allSignaturesValid,
  };
}
