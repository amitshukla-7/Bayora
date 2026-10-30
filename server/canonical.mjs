import crypto from 'node:crypto';

/**
 * Pure Canonical JSON (RFC 8785) and Hashing Core for Backend Server
 */

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function canonicalJson(data) {
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }

  if (Array.isArray(data)) {
    return '[' + data.map((item) => canonicalJson(item)).join(',') + ']';
  }

  const keys = Object.keys(data).sort();
  const entries = [];
  for (const key of keys) {
    if (data[key] !== undefined) {
      entries.push(`${JSON.stringify(key)}:${canonicalJson(data[key])}`);
    }
  }

  return '{' + entries.join(',') + '}';
}

export async function sha256Hex(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}
