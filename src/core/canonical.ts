/**
 * Pure Canonical JSON (RFC 8785) and Hashing Core
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

export async function sha256Hex(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
