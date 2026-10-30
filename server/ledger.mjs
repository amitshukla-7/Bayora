import { canonicalJson, sha256Hex, GENESIS_HASH, constantTimeEqual } from './canonical.mjs';
import { generateSigningKeyPair, signDataP256, verifySignatureP256 } from './signing.mjs';
import { getLatestEvent, insertEvent, getAllEvents, getDb, getAuditEvidence } from './db.mjs';
import { computeCanonicalPolicyFingerprint } from './attestation.mjs';

let defaultKeyPair = null;

export async function getSigningKey() {
  if (!defaultKeyPair) {
    defaultKeyPair = await generateSigningKeyPair('key-sentinelflow-authority-01');
  }
  return defaultKeyPair;
}

/**
 * Appends a new event to the SQLite database with guaranteed SHA-256 hash chaining.
 */
export async function appendLedgerEvent({
  runId,
  eventType,
  toolName = null,
  resource = null,
  decision = 'NONE',
  payload = {},
}) {
  const latest = getLatestEvent();
  const previousEventHash = latest ? latest.event_hash : GENESIS_HASH;
  const timestamp = new Date().toISOString();

  const nextSeq = latest ? latest.sequence + 1 : 1;

  const eventForHashing = {
    sequence: nextSeq,
    run_id: runId,
    timestamp,
    event_type: eventType,
    tool_name: toolName,
    resource: resource,
    decision: decision,
    payload: payload,
    previous_event_hash: previousEventHash,
  };

  const canonicalString = canonicalJson(eventForHashing);
  const eventHash = await sha256Hex(canonicalString);

  const inserted = insertEvent({
    run_id: runId,
    timestamp,
    event_type: eventType,
    tool_name: toolName,
    resource: resource,
    decision: decision,
    payload: payload,
    previous_event_hash: previousEventHash,
    event_hash: eventHash,
  });

  return inserted;
}

/**
 * Exports a cryptographically signed evidence bundle.
 */
export async function exportEvidenceBundle() {
  const legacyEvents = getAllEvents(5000).reverse();
  const rawAudit = getAuditEvidence(5000);
  let events = [];

  if (legacyEvents.length > 0) {
    events = legacyEvents.map(e => ({
      sequence: e.sequence,
      run_id: e.run_id,
      timestamp: e.timestamp,
      event_type: e.event_type,
      tool_name: e.tool_name,
      resource: e.resource,
      decision: e.decision,
      payload: typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload,
      previous_event_hash: e.previous_event_hash,
      event_hash: e.event_hash
    }));
  } else {
    events = rawAudit.map(e => ({
      sequence: e.sequence,
      event_id: e.event_id,
      run_id: e.run_id,
      timestamp: e.timestamp,
      event_type: e.event_type,
      tool_name: e.tool_name,
      resource: e.resource,
      decision: e.decision,
      payload_canonical: e.payload_canonical,
      payload: typeof e.payload_canonical === 'string' ? JSON.parse(e.payload_canonical || '{}') : e.payload_canonical,
      previous_event_hash: e.previous_event_hash,
      event_hash: e.event_hash
    }));
  }

  const keyPair = await getSigningKey();
  const policyFingerprint = await computeCanonicalPolicyFingerprint();

  const manifest = {
    bundle_version: '2.0.0',
    generated_at: new Date().toISOString(),
    event_count: events.length,
    first_event_hash: events.length > 0 ? events[0].event_hash : GENESIS_HASH,
    latest_event_hash: events.length > 0 ? events[events.length - 1].event_hash : GENESIS_HASH,
    policy_fingerprint: policyFingerprint,
    key_id: keyPair.keyId,
    key_label: keyPair.keyLabel,
  };

  const manifestCanonical = canonicalJson(manifest);
  const signatureHex = await signDataP256(manifestCanonical, keyPair.privateKeyJwk);

  return {
    manifest,
    manifest_signature: signatureHex,
    public_key_jwk: keyPair.publicKeyJwk,
    events,
  };
}

/**
 * Verifies an evidence bundle offline:
 * 1. Validates digital signature on manifest using public JWK
 * 2. Checks sequential indexing (#1, #2, #3...)
 * 3. Verifies previous_event_hash continuity link from genesis
 * 4. Recomputes SHA-256 for each block and asserts exact match
 */
export async function verifyEvidenceBundle(bundle) {
  if (!bundle || !bundle.manifest) {
    return {
      status: 'TAMPERED',
      valid: false,
      details: 'Malformed evidence bundle: missing manifest.'
    };
  }

  const events = bundle.events || [];

  // Verify ECDSA P-256 digital signature if signature & public key present
  if (bundle.manifest_signature && bundle.public_key_jwk) {
    const manifestCanonical = canonicalJson(bundle.manifest);
    const isSigValid = await verifySignatureP256(
      manifestCanonical,
      bundle.manifest_signature,
      bundle.public_key_jwk
    );
    if (!isSigValid) {
      return {
        status: 'TAMPERED',
        valid: false,
        details: 'Manifest digital signature verification failed: signature does not match public key.'
      };
    }
  }

  if (events.length === 0) {
    return {
      status: 'VERIFIED',
      valid: true,
      totalEvents: 0,
      details: 'Audit ledger is currently empty. Genesis state intact.',
    };
  }

  let expectedPreviousHash = GENESIS_HASH;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];

    // Check sequence
    if (e.sequence !== i + 1) {
      return {
        status: 'INCOMPLETE',
        valid: false,
        failedSequence: e.sequence,
        expectedSequence: i + 1,
        details: `Sequence mismatch at index ${i}: expected #${i + 1}, found #${e.sequence}. Missing block detected.`,
      };
    }

    // Check chain link
    if (!constantTimeEqual(e.previous_event_hash, expectedPreviousHash)) {
      return {
        status: 'TAMPERED',
        valid: false,
        failedSequence: e.sequence,
        recordedPreviousHash: e.previous_event_hash,
        expectedPreviousHash,
        details: `Hash continuity broken at sequence #${e.sequence}. Previous hash link does not match predecessor digest.`,
      };
    }

    // Recomputed digest check
    let recomputed;
    if (e.payload !== undefined && e.payload_canonical === undefined) {
      // Legacy Sentinelflow format
      const eventForHashing = {
        sequence: e.sequence,
        run_id: e.run_id,
        timestamp: e.timestamp,
        event_type: e.event_type,
        tool_name: e.tool_name,
        resource: e.resource,
        decision: e.decision,
        payload: e.payload,
        previous_event_hash: e.previous_event_hash,
      };
      recomputed = await sha256Hex(canonicalJson(eventForHashing));
    } else {
      // Phase 2/7 format: sha256(previous_event_hash + payload_canonical + timestamp)
      const payloadStr = typeof e.payload_canonical === 'string'
        ? e.payload_canonical
        : canonicalJson(e.payload || {});
      const raw = (e.previous_event_hash || '') + payloadStr + (e.timestamp || '');
      recomputed = await sha256Hex(raw);
    }

    if (!constantTimeEqual(recomputed, e.event_hash)) {
      return {
        status: 'TAMPERED',
        valid: false,
        failedSequence: e.sequence,
        recordedHash: e.event_hash,
        recomputedHash: recomputed,
        details: `Cryptographic digest mismatch at block #${e.sequence}: Payload integrity failure. Payload has been altered.`,
      };
    }

    expectedPreviousHash = e.event_hash;
  }

  return {
    status: 'VERIFIED',
    valid: true,
    totalEvents: events.length,
    latestEventHash: expectedPreviousHash,
    details: `All ${events.length} cryptographic audit blocks verified with zero errors.`,
  };
}
