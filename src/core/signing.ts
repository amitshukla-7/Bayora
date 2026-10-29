import { canonicalJson } from './canonical.ts';

export const KEY_LABEL = 'Software signing key';

export interface SigningKeyPair {
  keyId: string;
  keyLabel: typeof KEY_LABEL;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  createdAt: string;
}

/**
 * Generates an ECDSA P-256 keypair via Web Crypto and exports as JWK.
 * Labeled explicitly as "Software signing key".
 */
export async function generateSigningKeyPair(keyId?: string): Promise<SigningKeyPair> {
  const cryptoSubtle = globalThis.crypto.subtle;
  const keyPair = await cryptoSubtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const publicKeyJwk = await cryptoSubtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await cryptoSubtle.exportKey('jwk', keyPair.privateKey);

  const id = keyId || `key-bayora-p256-${Date.now().toString(36)}`;

  return {
    keyId: id,
    keyLabel: KEY_LABEL,
    publicKeyJwk,
    privateKeyJwk,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Converts a Uint8Array buffer to a lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a hex string to Uint8Array.
 */
function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.replace(/^0x/, '').trim();
  const len = cleanHex.length;
  const bytes = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Signs data using ECDSA P-256 and SHA-256 via Web Crypto.
 * Returns a hex signature string.
 */
export async function signDataP256(
  data: unknown,
  privateKeyJwk: JsonWebKey
): Promise<string> {
  const cryptoSubtle = globalThis.crypto.subtle;
  const text = typeof data === 'string' ? data : canonicalJson(data);
  const encoded = new TextEncoder().encode(text);

  const privateKey = await cryptoSubtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const sigBuffer = await cryptoSubtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    encoded
  );

  return bufferToHex(sigBuffer);
}

/**
 * Verifies an ECDSA P-256 signature using the provided public JWK.
 */
export async function verifySignatureP256(
  data: unknown,
  signatureHex: string,
  publicKeyJwk: JsonWebKey
): Promise<boolean> {
  try {
    const cryptoSubtle = globalThis.crypto.subtle;
    const text = typeof data === 'string' ? data : canonicalJson(data);
    const encoded = new TextEncoder().encode(text);
    const signatureBytes = hexToUint8Array(signatureHex);

    const publicKey = await cryptoSubtle.importKey(
      'jwk',
      publicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    return await cryptoSubtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      signatureBytes as unknown as BufferSource,
      encoded
    );
  } catch {
    return false;
  }
}
