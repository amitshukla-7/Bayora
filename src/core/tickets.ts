/**
 * Pure Evaluation Ticket Verification and Expiry Core
 */

export interface SignedTicket {
  ticketId: string;
  issuedAt: string;
  expiresAt: string;
  manifestFingerprint: string;
  keyId: string;
  signature: string;
}

export interface TicketValidationResult {
  valid: boolean;
  reason?: string;
}

export const TICKET_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Validates an evaluation ticket against the current environment fingerprint and time.
 * Returns false the instant the fingerprint changes or 15-minute TTL expires.
 */
export function validateTicket(
  ticket: SignedTicket | null | undefined,
  currentManifestOrFingerprint: string | { fingerprint?: string },
  nowMs: number = Date.now()
): TicketValidationResult {
  const currentFingerprint =
    typeof currentManifestOrFingerprint === 'string'
      ? currentManifestOrFingerprint
      : currentManifestOrFingerprint?.fingerprint || '';
  if (!ticket) {
    return { valid: false, reason: 'No ticket provided' };
  }

  if (!ticket.ticketId || !ticket.issuedAt || !ticket.expiresAt || !ticket.manifestFingerprint) {
    return { valid: false, reason: 'Malformed ticket structure' };
  }

  // Instant invalidation on configuration fingerprint change
  if (ticket.manifestFingerprint !== currentFingerprint) {
    return {
      valid: false,
      reason: `Fingerprint mismatch: ticket was issued for ${ticket.manifestFingerprint.slice(0, 10)}..., current is ${currentFingerprint.slice(0, 10)}...`,
    };
  }

  // 15-minute TTL expiry check
  const expiresAtMs = Date.parse(ticket.expiresAt);
  if (isNaN(expiresAtMs) || nowMs > expiresAtMs) {
    return {
      valid: false,
      reason: `Ticket expired at ${ticket.expiresAt}`,
    };
  }

  const issuedAtMs = Date.parse(ticket.issuedAt);
  if (isNaN(issuedAtMs) || nowMs < issuedAtMs - 5000) {
    return {
      valid: false,
      reason: 'Ticket issued in the future (clock skew)',
    };
  }

  return { valid: true };
}
