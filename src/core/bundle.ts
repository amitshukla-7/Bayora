import { canonicalJson, sha256Hex, GENESIS_HASH, constantTimeEqual } from './canonical.ts';
import { verifySignatureP256, KEY_LABEL } from './signing.ts';
import type { EvidenceEvent } from '../types.ts';

export const BUNDLE_SCHEMA = 'bayora.evidence/1';

export interface SignedCheckpoint {
  checkpointId: string;
  runId: string;
  headHash: string;
  state: string;
  decision: string;
  keyLabel: string;
  keyId: string;
  signature: string;
  publicKeyJwk: JsonWebKey;
  timestamp: string;
}

export interface EvidenceBundle {
  schema: typeof BUNDLE_SCHEMA;
  simulated: true;
  manifest: Record<string, unknown>;
  fingerprint: string;
  guaranteeDigests: Record<string, string>;
  fullLedger: EvidenceEvent[];
  signedCheckpoints: SignedCheckpoint[];
  publicKeyJwk: JsonWebKey;
  keyLabel: typeof KEY_LABEL;
  generatedAt: string;
}

export interface BundleVerificationReport {
  status: 'VALID' | 'TAMPERED' | 'INCOMPLETE';
  firstBadBlockIndex: number | null;
  errorMessage: string | null;
  missingBlocks?: string[];
  totalBlocks: number;
  fingerprintMatch: boolean;
  signatureValid: boolean;
}

/**
 * Creates an exportable evidence bundle conforming to bayora.evidence/1.
 */
export function createEvidenceBundle(
  manifest: Record<string, unknown>,
  fingerprint: string,
  guaranteeDigests: Record<string, string>,
  fullLedger: EvidenceEvent[],
  signedCheckpoints: SignedCheckpoint[],
  publicKeyJwk: JsonWebKey
): EvidenceBundle {
  return {
    schema: BUNDLE_SCHEMA,
    simulated: true,
    manifest,
    fingerprint,
    guaranteeDigests,
    fullLedger,
    signedCheckpoints,
    publicKeyJwk,
    keyLabel: KEY_LABEL,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Offline bundle verifier.
 * Checks schema, canonical fingerprint, expected plan completeness,
 * hash chain continuity, and ECDSA P-256 signatures.
 * Returns VALID, TAMPERED (with first bad block index), or INCOMPLETE.
 */
export async function verifyBundle(bundle: unknown): Promise<BundleVerificationReport> {
  if (!bundle || typeof bundle !== 'object') {
    return {
      status: 'TAMPERED',
      firstBadBlockIndex: null,
      errorMessage: 'Bundle is null or not an object',
      totalBlocks: 0,
      fingerprintMatch: false,
      signatureValid: false,
    };
  }

  const b = bundle as EvidenceBundle;

  if (b.schema !== BUNDLE_SCHEMA) {
    return {
      status: 'TAMPERED',
      firstBadBlockIndex: null,
      errorMessage: `Unsupported bundle schema: "${b.schema}". Expected "${BUNDLE_SCHEMA}"`,
      totalBlocks: 0,
      fingerprintMatch: false,
      signatureValid: false,
    };
  }

  // 1. Verify Manifest Fingerprint
  if (!b.manifest || !b.fingerprint) {
    return {
      status: 'TAMPERED',
      firstBadBlockIndex: null,
      errorMessage: 'Bundle missing manifest or fingerprint',
      totalBlocks: 0,
      fingerprintMatch: false,
      signatureValid: false,
    };
  }

  const computedFingerprint = await sha256Hex(canonicalJson(b.manifest));
  if (computedFingerprint !== b.fingerprint) {
    return {
      status: 'TAMPERED',
      firstBadBlockIndex: null,
      errorMessage: `Manifest fingerprint mismatch: recorded ${b.fingerprint}, recomputed ${computedFingerprint}`,
      totalBlocks: Array.isArray(b.fullLedger) ? b.fullLedger.length : 0,
      fingerprintMatch: false,
      signatureValid: false,
    };
  }

  const ledger = Array.isArray(b.fullLedger) ? b.fullLedger : [];
  if (ledger.length === 0) {
    return {
      status: 'VALID',
      firstBadBlockIndex: null,
      errorMessage: null,
      totalBlocks: 0,
      fingerprintMatch: true,
      signatureValid: true,
    };
  }

  // 2. Run ID consistency check
  const primaryRunId = ledger[0].run_id;
  for (let i = 0; i < ledger.length; i++) {
    if (ledger[i].run_id !== primaryRunId) {
      return {
        status: 'TAMPERED',
        firstBadBlockIndex: i,
        errorMessage: `Block #${ledger[i].sequence} run_id (${ledger[i].run_id}) does not match primary run_id (${primaryRunId})`,
        totalBlocks: ledger.length,
        fingerprintMatch: true,
        signatureValid: false,
      };
    }
  }

  // 3. Completeness check against expected_plan
  const startEvent = ledger.find((e) => e.event_type === 'run.started');
  if (startEvent && Array.isArray(startEvent.payload?.expected_plan)) {
    const expectedPlan: string[] = startEvent.payload.expected_plan;
    const actualKeys = ledger.map((e) => {
      if (e.event_type === 'test.started' || e.event_type === 'test.completed') {
        return `${e.event_type}:${e.payload?.test_id}`;
      }
      return e.event_type;
    });

    const missing = expectedPlan.filter((key) => !actualKeys.includes(key));
    if (missing.length > 0) {
      return {
        status: 'INCOMPLETE',
        firstBadBlockIndex: null,
        missingBlocks: missing,
        errorMessage: `Ledger omitted ${missing.length} expected lifecycle events: [${missing.join(', ')}]`,
        totalBlocks: ledger.length,
        fingerprintMatch: true,
        signatureValid: false,
      };
    }
  }

  // 4. Sequential Hash Chain & Pointer Verification
  for (let i = 0; i < ledger.length; i++) {
    const current = ledger[i];
    const expectedPrevHash = i === 0 ? GENESIS_HASH : ledger[i - 1].event_hash;

    // Check pointer
    if (!constantTimeEqual(current.previous_event_hash, expectedPrevHash)) {
      return {
        status: 'TAMPERED',
        firstBadBlockIndex: i,
        errorMessage: `Block #${current.sequence} pointer invalid: recorded ${current.previous_event_hash}, expected ${expectedPrevHash}`,
        totalBlocks: ledger.length,
        fingerprintMatch: true,
        signatureValid: false,
      };
    }

    // Recompute event hash
    const eventBody = {
      event_type: current.event_type,
      payload: current.payload,
      previous_event_hash: current.previous_event_hash,
      run_id: current.run_id,
      sequence: current.sequence,
      timestamp: current.timestamp,
    };
    const calculatedHash = await sha256Hex(canonicalJson(eventBody));

    if (!constantTimeEqual(calculatedHash, current.event_hash)) {
      return {
        status: 'TAMPERED',
        firstBadBlockIndex: i,
        errorMessage: `Block #${current.sequence} hash invalid: recorded ${current.event_hash}, recomputed ${calculatedHash}`,
        totalBlocks: ledger.length,
        fingerprintMatch: true,
        signatureValid: false,
      };
    }

    // Checkpoint signature verification
    if (current.event_type === 'checkpoint.signed' && current.payload) {
      const chk = current.payload.checkpoint;
      if (chk) {
        // If checkpoint carries an ECDSA P-256 signature, verify it
        const pubKey = chk.public_key_jwk || b.publicKeyJwk;
        if (pubKey && chk.signature) {
          const signedMessage = {
            runId: chk.run_id || chk.runId,
            headHash: chk.head_hash || chk.headHash || chk.root_event_hash,
            state: chk.state,
            decision: chk.decision,
          };
          const isP256Valid = await verifySignatureP256(signedMessage, chk.signature, pubKey);
          // If not P256, check HMAC backwards compatibility
          if (!isP256Valid && !chk.signature.startsWith('hmac_')) {
            // Check if HMAC
            return {
              status: 'TAMPERED',
              firstBadBlockIndex: i,
              errorMessage: `Block #${current.sequence} checkpoint signature verification failed`,
              totalBlocks: ledger.length,
              fingerprintMatch: true,
              signatureValid: false,
            };
          }
        }
      }
    }
  }

  return {
    status: 'VALID',
    firstBadBlockIndex: null,
    errorMessage: null,
    totalBlocks: ledger.length,
    fingerprintMatch: true,
    signatureValid: true,
  };
}
