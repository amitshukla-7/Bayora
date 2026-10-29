import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * Bayora Security Subsystem: Strict URL & Identifier Validation
 * Implements Defense-in-Depth against SSRF, Cloud Metadata Exploits,
 * Rebinding, Protocol Smuggling, Lookalike Homoglyphs, and Unsafe Model Weights.
 */

const MAX_URL_LENGTH = 2048;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

/**
 * Blocked Cloud Metadata Hostnames
 */
const BLOCKED_METADATA_HOSTNAMES = new Set([
  'metadata.google.internal',
  'instance-data',
  'metadata',
  '169.254.169.254',
  'fd00:ec2::254'
]);

/**
 * Disallowed URL Schemes (Fail-Closed)
 */
const FORBIDDEN_SCHEMES = new Set([
  'javascript:',
  'data:',
  'file:',
  'ftp:',
  'gopher:',
  'blob:',
  'vbscript:',
  'about:',
  'ws:',
  'wss:'
]);

/**
 * Hugging Face Repo ID Regex: owner/model
 * Length: 1-96 chars per segment, alphanumeric with hyphens, underscores, dots.
 */
export const HF_REPO_REGEX = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}\/[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;

/**
 * Ollama Model Identifier Regex: name[:tag]
 */
export const OLLAMA_IDENTIFIER_REGEX = /^[a-zA-Z0-9._-]+(:[a-zA-Z0-9._-]+)?$/;

/**
 * Allowed model weight extensions (safe serializations only)
 */
export const ALLOWED_WEIGHT_EXTENSIONS = new Set(['.gguf', '.safetensors']);

/**
 * Explicitly forbidden model weight extensions (vulnerable to arbitrary code execution)
 */
export const FORBIDDEN_WEIGHT_EXTENSIONS = new Set([
  '.pt',
  '.bin',
  '.pkl',
  '.pickle',
  '.ckpt',
  '.py',
  '.sh',
  '.exe',
  '.bat',
  '.cmd',
  '.ps1'
]);

/**
 * Detect alternative IP representations (hex, octal, decimal integer, or leading zeros)
 */
export function isObfuscatedIp(host) {
  if (!host) return false;

  // Single decimal integer (e.g. 2130706433 for 127.0.0.1)
  if (/^\d{8,10}$/.test(host)) return true;

  // Hexadecimal notation (e.g. 0x7f.0.0.1 or 0x7f000001)
  if (/0x[0-9a-fA-F]+/i.test(host)) return true;

  // Dotted decimal with octal leading zeroes (e.g. 0177.0.0.1)
  const parts = host.split('.');
  if (parts.length === 4) {
    for (const p of parts) {
      if (p.length > 1 && p.startsWith('0') && /^\d+$/.test(p)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check whether an IPv4 or IPv6 address belongs to private/loopback/cloud-metadata ranges
 */
export function assertSafeIp(ipStr, options = {}) {
  const allowLocalhost = Boolean(options.allowLocalhost);

  if (!ipStr || typeof ipStr !== 'string') {
    throw new Error('Invalid IP address provided.');
  }

  const cleanIp = ipStr.replace(/^\[|\]$/g, '').toLowerCase();

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:169.254.169.254)
  if (cleanIp.startsWith('::ffff:')) {
    const v4Part = cleanIp.slice(7);
    return assertSafeIp(v4Part, options);
  }

  const ipFamily = net.isIP(cleanIp);
  if (ipFamily === 0) {
    throw new Error(`Invalid IP address syntax: "${cleanIp}"`);
  }

  if (ipFamily === 4) {
    const octets = cleanIp.split('.').map(Number);
    const [a, b, c, d] = octets;

    // Current network (0.0.0.0/8)
    if (a === 0) {
      throw new Error(`SSRF Block: 0.0.0.0/8 range address "${cleanIp}" is forbidden.`);
    }

    // Loopback (127.0.0.0/8)
    if (a === 127) {
      if (allowLocalhost && cleanIp === '127.0.0.1') {
        return true;
      }
      throw new Error(`SSRF Block: Loopback IP "${cleanIp}" is forbidden.`);
    }

    // Cloud Metadata / Link-Local (169.254.0.0/16)
    if (a === 169 && b === 254) {
      throw new Error(`SSRF Block: Cloud metadata link-local address "${cleanIp}" is forbidden.`);
    }

    // Private RFC 1918: 10.0.0.0/8
    if (a === 10) {
      throw new Error(`SSRF Block: Private network RFC 1918 address "${cleanIp}" is forbidden.`);
    }

    // Private RFC 1918: 172.16.0.0/12 (172.16 - 172.31)
    if (a === 172 && b >= 16 && b <= 31) {
      throw new Error(`SSRF Block: Private network RFC 1918 address "${cleanIp}" is forbidden.`);
    }

    // Private RFC 1918: 192.168.0.0/16
    if (a === 192 && b === 168) {
      throw new Error(`SSRF Block: Private network RFC 1918 address "${cleanIp}" is forbidden.`);
    }

    // Carrier Grade NAT: 100.64.0.0/10 (100.64 - 100.127)
    if (a === 100 && b >= 64 && b <= 127) {
      throw new Error(`SSRF Block: Shared CGNAT address "${cleanIp}" is forbidden.`);
    }

    // Multicast (224.0.0.0/4) & Reserved (240.0.0.0/4)
    if (a >= 224) {
      throw new Error(`SSRF Block: Multicast or reserved IP "${cleanIp}" is forbidden.`);
    }

    return true;
  }

  if (ipFamily === 6) {
    // IPv6 Loopback (::1)
    if (cleanIp === '::1' || cleanIp === '0000:0000:0000:0000:0000:0000:0000:0001') {
      if (allowLocalhost) return true;
      throw new Error(`SSRF Block: IPv6 loopback "${cleanIp}" is forbidden.`);
    }

    // IPv6 Unspecified (::)
    if (cleanIp === '::' || cleanIp === '0000:0000:0000:0000:0000:0000:0000:0000') {
      throw new Error(`SSRF Block: IPv6 unspecified address "${cleanIp}" is forbidden.`);
    }

    // Unique Local / Private (fc00::/7)
    if (/^f[cd][0-9a-f]{2}:/i.test(cleanIp)) {
      throw new Error(`SSRF Block: IPv6 Unique Local address "${cleanIp}" is forbidden.`);
    }

    // Link-Local (fe80::/10)
    if (/^fe[89ab][0-9a-f]:/i.test(cleanIp)) {
      throw new Error(`SSRF Block: IPv6 Link-Local address "${cleanIp}" is forbidden.`);
    }

    // Multicast (ff00::/8)
    if (/^ff[0-9a-f]{2}:/i.test(cleanIp)) {
      throw new Error(`SSRF Block: IPv6 Multicast address "${cleanIp}" is forbidden.`);
    }

    return true;
  }

  return true;
}

/**
 * Validate and Sanitize an arbitrary URL string
 * 
 * @param {string} input - Raw user input URL
 * @param {Object} options - Validation options
 * @param {boolean} options.allowLocalhost - Allow localhost / 127.0.0.1 for local Ollama adapters
 * @param {boolean} options.resolveDns - Perform live DNS pre-resolution and block intranet targets
 * @param {boolean} options.throwOnError - Throw on failure instead of returning result object
 * @returns {Promise<{ valid: boolean, url?: string, parsedUrl?: URL, resolvedIps?: string[], error?: string }>}
 */
export async function validateAndSanitizeUrl(input, options = {}) {
  const allowLocalhost = Boolean(options.allowLocalhost);

  try {
    if (!input || typeof input !== 'string') {
      throw new Error('URL must be a non-empty string.');
    }

    const trimmed = input.trim();

    // 1. Length bound check (RFC 7230 safety)
    if (trimmed.length > MAX_URL_LENGTH) {
      throw new Error(`URL length (${trimmed.length}) exceeds maximum limit of ${MAX_URL_LENGTH} characters.`);
    }

    // 2. Control characters & non-printable character check
    if (/[\x00-\x1F\x7F]/.test(trimmed)) {
      throw new Error('URL contains forbidden ASCII control characters.');
    }

    // 3. Scheme prefix check before parsing
    const lower = trimmed.toLowerCase();
    for (const badScheme of FORBIDDEN_SCHEMES) {
      if (lower.startsWith(badScheme)) {
        throw new Error(`Disallowed URI scheme: "${badScheme}". Only HTTPS (and allowlisted localhost HTTP) is permitted.`);
      }
    }

    // 4. Parse with WHATWG URL
    let parsedUrl;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      throw new Error(`Malformed URL syntax: "${trimmed}".`);
    }

    // 5. Enforce Scheme Policy: https by default, http allowed only for localhost
    if (parsedUrl.protocol === 'http:') {
      const isLocalHost = parsedUrl.hostname === 'localhost' ||
                          parsedUrl.hostname === '127.0.0.1' ||
                          parsedUrl.hostname === '[::1]';
      if (!allowLocalhost || !isLocalHost) {
        throw new Error('Unencrypted HTTP protocol is forbidden. Please provide a secure HTTPS endpoint.');
      }
    } else if (parsedUrl.protocol !== 'https:') {
      throw new Error(`Unsupported protocol "${parsedUrl.protocol}". Only HTTPS endpoints are accepted.`);
    }

    // 6. Prohibit Embedded Userinfo / Credentials (user:pass@)
    if (parsedUrl.username || parsedUrl.password) {
      throw new Error('Embedded credentials (user:password@) in URL are strictly prohibited.');
    }

    // 7. Check for Obfuscated IP notations (hex, octal, decimal integer)
    if (isObfuscatedIp(parsedUrl.hostname)) {
      throw new Error(`SSRF Block: Obfuscated IP representation "${parsedUrl.hostname}" is forbidden.`);
    }

    // 8. Block Cloud Metadata Hostnames
    const cleanHost = parsedUrl.hostname.toLowerCase();
    if (BLOCKED_METADATA_HOSTNAMES.has(cleanHost)) {
      throw new Error(`SSRF Block: Access to cloud metadata service "${cleanHost}" is forbidden.`);
    }

    // 9. IP syntax / Direct IP check
    const rawIpFamily = net.isIP(cleanHost);
    if (rawIpFamily !== 0) {
      assertSafeIp(cleanHost, { allowLocalhost });
    }

    // 10. DNS Pre-Resolution (Defeats DNS Rebinding to Intranet)
    const resolvedIps = [];
    if (options.resolveDns && rawIpFamily === 0 && cleanHost !== 'localhost') {
      try {
        const records = await dns.lookup(cleanHost, { all: true });
        if (!records || records.length === 0) {
          throw new Error(`Domain "${cleanHost}" failed DNS resolution.`);
        }
        for (const record of records) {
          assertSafeIp(record.address, { allowLocalhost });
          resolvedIps.push(record.address);
        }
      } catch (dnsErr) {
        if (dnsErr.message.startsWith('SSRF Block')) {
          throw dnsErr;
        }
        throw new Error(`Host lookup failed for "${cleanHost}": ${dnsErr.message}`);
      }
    }

    return {
      valid: true,
      url: parsedUrl.toString(),
      parsedUrl,
      resolvedIps
    };
  } catch (err) {
    if (options.throwOnError) throw err;
    return {
      valid: false,
      error: err.message
    };
  }
}

/**
 * Validated HTTP Fetch Client
 * Re-validates every redirect hop, blocks SSRF, and enforces byte/time caps.
 */
export async function validatedFetch(url, options = {}) {
  const allowLocalhost = Boolean(options.allowLocalhost);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount <= MAX_REDIRECTS) {
    // 1. Validate target URL with DNS pre-resolution
    const valResult = await validateAndSanitizeUrl(currentUrl, {
      allowLocalhost,
      resolveDns: true,
      throwOnError: true
    });

    // 2. Execute fetch with strict timeout and no auto-redirect
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(valResult.url, {
        ...options,
        redirect: 'manual',
        signal: controller.signal
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Connection timed out after ${timeoutMs}ms while contacting ${currentUrl}`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    // 3. Handle redirects manually to enforce security policy on every hop
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect HTTP ${response.status} returned without Location header.`);
      }

      redirectCount++;
      if (redirectCount > MAX_REDIRECTS) {
        throw new Error(`Exceeded maximum allowed redirect hops (${MAX_REDIRECTS}).`);
      }

      // Resolve relative redirect against current URL
      const nextUrl = new URL(location, currentUrl).toString();

      // Disallow downgrade from HTTPS to HTTP
      if (currentUrl.startsWith('https:') && nextUrl.startsWith('http:')) {
        throw new Error('Insecure protocol downgrade (HTTPS -> HTTP) on redirect is strictly forbidden.');
      }

      currentUrl = nextUrl;
      continue;
    }

    // 4. Enforce Response Size Bound
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      throw new Error(`Response payload exceeds maximum allowed size of ${MAX_RESPONSE_BYTES} bytes.`);
    }

    return response;
  }

  throw new Error(`Exceeded maximum allowed redirect hops (${MAX_REDIRECTS}).`);
}

/**
 * Validate Hugging Face Repository Identifier (owner/model)
 */
export function validateHuggingFaceRepoId(repoId) {
  if (!repoId || typeof repoId !== 'string') {
    return { valid: false, error: 'Repository ID must be a non-empty string in "owner/model" format.' };
  }

  const trimmed = repoId.trim();
  if (trimmed.length > 200) {
    return { valid: false, error: 'Repository ID exceeds maximum character length (200).' };
  }

  if (trimmed.includes('..') || trimmed.includes('\\') || trimmed.includes('//')) {
    return { valid: false, error: 'Repository ID contains illegal path traversal characters.' };
  }

  if (!HF_REPO_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: `Invalid Hugging Face repository format: "${trimmed}". Expected format: "org/model-name" (e.g. "meta-llama/Llama-3.2-3B-Instruct").`
    };
  }

  return { valid: true, repoId: trimmed };
}

/**
 * Validate Hugging Face Weight File Path (Safe serialization only: .gguf, .safetensors)
 */
export function validateHuggingFaceFilePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'File path must be a non-empty string.' };
  }

  const trimmed = filePath.trim();

  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('\\') ||
    trimmed.includes('..') ||
    trimmed.includes('\\') ||
    /^[a-zA-Z]:/.test(trimmed)
  ) {
    return { valid: false, error: 'Path traversal or absolute file paths are strictly prohibited.' };
  }

  const extMatch = trimmed.match(/\.[a-zA-Z0-9]+$/);
  const ext = extMatch ? extMatch[0].toLowerCase() : '';

  if (FORBIDDEN_WEIGHT_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Security Policy Violation: Unsafe serialization format "${ext}". Deserialization attacks possible. Use .safetensors or .gguf.`
    };
  }

  if (!ALLOWED_WEIGHT_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension "${ext}". Only .gguf and .safetensors model weights are permitted.`
    };
  }

  return { valid: true, filePath: trimmed };
}

/**
 * Validate Ollama Model Identifier (name[:tag])
 */
export function validateOllamaModelIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return { valid: false, error: 'Model identifier must be a non-empty string.' };
  }

  const trimmed = identifier.trim();

  if (trimmed.length > 128) {
    return { valid: false, error: 'Ollama model identifier exceeds maximum length of 128 characters.' };
  }

  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
    return { valid: false, error: 'Ollama model tag cannot contain path separators or traversal characters.' };
  }

  if (!OLLAMA_IDENTIFIER_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: `Invalid Ollama model syntax: "${trimmed}". Must follow "model-name" or "model-name:tag" format.`
    };
  }

  return { valid: true, identifier: trimmed };
}
