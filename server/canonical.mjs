import crypto from 'node:crypto';

/**
 * Pure Canonical JSON (RFC 8785) and Hashing Core for Backend Server
 */

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_CANONICAL_DEPTH = 64;

export function canonicalJson(data, depth = 0) {
  if (depth > MAX_CANONICAL_DEPTH) {
    throw new Error('Maximum canonicalization depth exceeded (depth limit 64)');
  }

  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }

  if (Array.isArray(data)) {
    return '[' + data.map((item) => canonicalJson(item, depth + 1)).join(',') + ']';
  }

  const keys = Object.keys(data).filter((k) => !PROTOTYPE_POLLUTION_KEYS.has(k)).sort();
  const entries = [];
  for (const key of keys) {
    if (data[key] !== undefined) {
      entries.push(`${JSON.stringify(key)}:${canonicalJson(data[key], depth + 1)}`);
    }
  }

  return '{' + entries.join(',') + '}';
}

export async function sha256Hex(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Constant-time equality comparison using crypto.timingSafeEqual (CWE-208)
 */
export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
