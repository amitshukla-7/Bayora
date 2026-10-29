import { canonicalJson, sha256Hex, GENESIS_HASH } from '../src/core/canonical.ts';
import { generateSigningKeyPair } from '../src/core/signing.ts';
import { getLatestEvent, insertEvent, getAllEvents } from './db.mjs';

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

  // Temporary object to compute hash (sequence will be latest.sequence + 1 or 1)
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
  const events = getAllEvents(1000).reverse(); // chronological order
  const keyPair = await getSigningKey();

  const manifest = {
    bundle_version: '1.0.0',
    generated_at: new Date().toISOString(),
    event_count: events.length,
    first_event_hash: events.length > 0 ? events[0].event_hash : GENESIS_HASH,
    latest_event_hash: events.length > 0 ? events[events.length - 1].event_hash : GENESIS_HASH,
    key_id: keyPair.keyId,
    key_label: keyPair.keyLabel,
  };

  const manifestHash = await sha256Hex(canonicalJson(manifest));

  // Sign manifestHash using ECDSA P-256
  const cryptoSubtle = globalThis.crypto.subtle;
  const privateKey = await cryptoSubtle.importKey(
    'jwk',
    keyPair.privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const signatureBuffer = await cryptoSubtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    encoder.encode(manifestHash)
  );

  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    manifest,
    manifest_signature: signatureHex,
    public_key_jwk: keyPair.publicKeyJwk,
    events,
  };
}

/**
 * Verifies any evidence bundle (or the current ledger).
 * Checks:
 * 1. Sequence order & unbroken previous_event_hash chain
 * 2. Recomputed SHA-256 match for every individual block
 * 3. Cryptographic signature over manifest
 */
export async function verifyEvidenceBundle(bundle) {
  const events = bundle.events || [];
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
        details: `Sequence mismatch at index ${i}: expected #${i + 1}, found #${e.sequence}. Missing lifecycle block detected.`,
      };
    }

    // Check chain link
    if (e.previous_event_hash !== expectedPreviousHash) {
      return {
        status: 'TAMPERED',
        valid: false,
        failedSequence: e.sequence,
        details: `Hash chain continuity broken at event #${e.sequence}. Previous hash recorded does not match preceding block's hash.`,
        expectedPreviousHash,
        actualPreviousHash: e.previous_event_hash,
      };
    }

    // Recompute event hash
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

    const recomputed = await sha256Hex(canonicalJson(eventForHashing));
    if (recomputed !== e.event_hash) {
      return {
        status: 'TAMPERED',
        valid: false,
        failedSequence: e.sequence,
        details: `Payload integrity failure at event #${e.sequence} (${e.event_type}). Recomputed digest does not match recorded event hash.`,
        recordedHash: e.event_hash,
        recomputedHash: recomputed,
      };
    }

    expectedPreviousHash = e.event_hash;
  }

  // Verify Signature if present
  let signatureValid = true;
  if (bundle.manifest_signature && bundle.public_key_jwk) {
    try {
      const cryptoSubtle = globalThis.crypto.subtle;
      const publicKey = await cryptoSubtle.importKey(
        'jwk',
        bundle.public_key_jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
      );

      const manifestHash = await sha256Hex(canonicalJson(bundle.manifest));
      const sigBytes = new Uint8Array(
        bundle.manifest_signature.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
      );

      signatureValid = await cryptoSubtle.verify(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        publicKey,
        sigBytes,
        new TextEncoder().encode(manifestHash)
      );
    } catch {
      signatureValid = false;
    }
  }

  if (!signatureValid) {
    return {
      status: 'TAMPERED',
      valid: false,
      details: 'Cryptographic signature verification failed: bundle manifest was modified after attestation.',
    };
  }

  return {
    status: 'VERIFIED',
    valid: true,
    totalEvents: events.length,
    firstEventHash: events[0].event_hash,
    latestEventHash: events[events.length - 1].event_hash,
    signatureVerified: Boolean(bundle.manifest_signature),
    details: `All ${events.length} cryptographic events verified. Hash chain and digital signature are 100% intact.`,
  };
}
