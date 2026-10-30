/**
 * Pure Canonical JSON (RFC 8785) and Hashing Core
 */

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_CANONICAL_DEPTH = 64;

export function canonicalJson(data: any, depth = 0): string {
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
  const entries: string[] = [];
  for (const key of keys) {
    if (data[key] !== undefined) {
      entries.push(`${JSON.stringify(key)}:${canonicalJson(data[key], depth + 1)}`);
    }
  }

  return '{' + entries.join(',') + '}';
}

export async function sha256Hex(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time string equality comparison to prevent timing side channels (CWE-208)
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aLen = a.length;
  const bLen = b.length;
  let mismatch = aLen ^ bLen;
  const maxLen = Math.max(aLen, bLen);
  for (let i = 0; i < maxLen; i++) {
    const charA = i < aLen ? a.charCodeAt(i) : 0;
    const charB = i < bLen ? b.charCodeAt(i) : 0;
    mismatch |= (charA ^ charB);
  }
  return mismatch === 0;
}
