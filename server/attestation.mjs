import crypto from 'node:crypto';
import { canonicalJson, sha256Hex } from './canonical.mjs';
import { generateSigningKeyPair, signDataP256, verifySignatureP256 } from './signing.mjs';
import { getAllPolicies, getDb } from './db.mjs';

// Attestation Ticket TTL: 5 minutes (300,000 ms)
export const TICKET_TTL_MS = 5 * 60 * 1000;

let cachedKeyPair = null;

/**
 * Get or initialize the ECDSA P-256 signing keypair
 */
export async function getSigningKeyPair() {
  if (!cachedKeyPair) {
    cachedKeyPair = await generateSigningKeyPair('key-sentinelflow-attestation');
  }
  return cachedKeyPair;
}

/**
 * Computes the RFC 8785 canonical policy pack fingerprint
 */
export async function computeCanonicalPolicyFingerprint() {
  const policies = getAllPolicies();
  // Canonical representation of all policies sorted deterministically
  const canonicalPack = policies
    .map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      severity: p.severity,
      effect: p.effect,
      mode: (p.is_enabled === 0) ? 'OFF' : (p.mode || 'ENFORCE'),
      tool: p.tool,
      rules: typeof p.rules === 'string' ? JSON.parse(p.rules || '{}') : p.rules,
      version: p.version
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return await sha256Hex(canonicalJson(canonicalPack));
}

/**
 * Issues a signed ECDSA P-256 attestation ticket with 5-minute expiry
 */
export async function issueAttestationTicket() {
  const keyPair = await getSigningKeyPair();
  const fingerprint = await computeCanonicalPolicyFingerprint();
  const now = Date.now();
  const ticketId = `tkt_${now}_${crypto.randomBytes(4).toString('hex')}`;
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + TICKET_TTL_MS).toISOString();

  const ticketPayload = {
    ticketId,
    issuedAt,
    expiresAt,
    manifestFingerprint: fingerprint,
    keyId: keyPair.keyId
  };

  const signature = await signDataP256(ticketPayload, keyPair.privateKeyJwk);

  const signedTicket = {
    ...ticketPayload,
    signature,
    publicKeyJwk: keyPair.publicKeyJwk
  };

  // Persist to SQLite attestations table
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO attestations (id, config_fingerprint, state, nonce, signature, public_key, valid_until, is_synthetic, created_at)
      VALUES (?, ?, 'VERIFIED', ?, ?, ?, ?, 0, ?)
    `).run(
      ticketId,
      fingerprint,
      crypto.randomBytes(8).toString('hex'),
      signature,
      JSON.stringify(keyPair.publicKeyJwk),
      expiresAt,
      issuedAt
    );
  } catch (err) {
    console.warn('Failed to persist attestation ticket to database:', err.message);
  }

  return signedTicket;
}

/**
 * Verifies an attestation ticket
 * Enforces:
 * 1. Valid signature using ECDSA P-256
 * 2. Unexpired (issued within 5 minutes)
 * 3. Exact match against current live policy fingerprint (instant revocation on policy drift)
 */
export async function verifyAttestationTicket(ticket) {
  if (!ticket) {
    return { valid: false, reason: 'Missing attestation ticket' };
  }

  if (typeof ticket === 'string') {
    try {
      ticket = JSON.parse(Buffer.from(ticket, 'base64').toString('utf8'));
    } catch {
      try {
        ticket = JSON.parse(ticket);
      } catch {
        return { valid: false, reason: 'Malformed attestation ticket format' };
      }
    }
  }

  const { ticketId, issuedAt, expiresAt, manifestFingerprint, keyId, signature, publicKeyJwk } = ticket;
  if (!ticketId || !issuedAt || !expiresAt || !manifestFingerprint || !signature) {
    return { valid: false, reason: 'Incomplete ticket fields' };
  }

  const now = Date.now();
  const expiresAtMs = Date.parse(expiresAt);
  if (isNaN(expiresAtMs) || now > expiresAtMs) {
    return { valid: false, reason: `Attestation ticket expired at ${expiresAt}` };
  }

  const currentFingerprint = await computeCanonicalPolicyFingerprint();
  if (manifestFingerprint !== currentFingerprint) {
    return {
      valid: false,
      reason: `Attestation invalid: policy fingerprint drift detected (ticket: ${manifestFingerprint.slice(0, 8)}..., current: ${currentFingerprint.slice(0, 8)}...)`
    };
  }

  // Cryptographic signature verification
  const keyPair = await getSigningKeyPair();
  const pubKey = publicKeyJwk || keyPair.publicKeyJwk;

  const payloadToVerify = {
    ticketId,
    issuedAt,
    expiresAt,
    manifestFingerprint,
    keyId: keyId || keyPair.keyId
  };

  const isSigValid = await verifySignatureP256(payloadToVerify, signature, pubKey);
  if (!isSigValid) {
    return { valid: false, reason: 'Cryptographic signature verification failed' };
  }

  return {
    valid: true,
    ticketId,
    fingerprint: manifestFingerprint,
    expiresAt
  };
}

