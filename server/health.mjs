import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './db.mjs';
import { getSigningKeyPair } from './attestation.mjs';
import { checkDockerAvailable } from './probes/runner.mjs';

/**
 * Perform Comprehensive System Health & Diagnostics Check
 * Evaluates: Node 24+, SQLite database, ECDSA signing key,
 * workspace writability, free disk space, Ollama reachability, and Docker daemon.
 */
export async function checkSystemHealth() {
  const checks = {};

  // 1. Node.js version check (>= 22, preferably 24)
  const nodeVer = process.version;
  const major = parseInt(nodeVer.slice(1).split('.')[0], 10);
  checks.node = {
    version: nodeVer,
    required: '>=22.0.0 (Node 24 recommended)',
    ok: major >= 22,
    message: major >= 24 ? `Node.js ${nodeVer} verified (Node 24 LTS)` : `Node.js ${nodeVer} active`
  };

  // 2. SQLite Database connectivity & WAL mode
  try {
    const db = getDb();
    const row = db.prepare("SELECT 1 AS alive, sqlite_version() AS ver").get();
    checks.database = {
      ok: Boolean(row && row.alive === 1),
      sqliteVersion: row?.ver || 'unknown',
      path: path.resolve(process.cwd(), 'workspace', 'bayora.db'),
      message: 'SQLite database connection active (WAL mode enabled)'
    };
  } catch (err) {
    checks.database = {
      ok: false,
      error: err.message,
      message: 'SQLite database connection failed'
    };
  }

  // 3. ECDSA P-256 Authority Signing Key
  try {
    const key = await getSigningKeyPair();
    checks.signingKey = {
      ok: Boolean(key && key.keyId && key.publicKeyJwk),
      keyId: key?.keyId || 'none',
      algorithm: 'ECDSA P-256 (SHA-256)',
      message: 'ECDSA P-256 cryptographic signing key loaded'
    };
  } catch (err) {
    checks.signingKey = {
      ok: false,
      error: err.message,
      message: 'ECDSA signing authority key unavailable'
    };
  }

  // 4. Writable Workspace & Free Disk Space
  try {
    const workspaceDir = path.resolve(process.cwd(), 'workspace');
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }
    fs.accessSync(workspaceDir, fs.constants.W_OK);

    const stat = fs.statfsSync(workspaceDir);
    const freeBytes = Number(stat.bavail) * Number(stat.bsize);
    const freeGb = Number((freeBytes / (1024 * 1024 * 1024)).toFixed(2));

    checks.workspace = {
      ok: true,
      path: workspaceDir,
      writable: true,
      freeDiskGb: freeGb,
      freeBytes,
      message: `Workspace directory writable (${freeGb} GB free disk space)`
    };
    if (freeGb < 0.5) {
      checks.workspace.warning = 'Low disk space warning: less than 500MB free';
    }
  } catch (err) {
    checks.workspace = {
      ok: false,
      error: err.message,
      message: 'Workspace directory is not writable'
    };
  }

  // 5. Ollama Local Endpoint Reachability
  const ollamaHost = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${ollamaHost}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models.map(m => m.name) : [];
      checks.ollama = {
        ok: true,
        host: ollamaHost,
        reachable: true,
        models,
        message: `Ollama service reachable (${models.length} local models detected: ${models.slice(0, 3).join(', ') || 'none'})`
      };
    } else {
      checks.ollama = {
        ok: false,
        host: ollamaHost,
        reachable: false,
        statusCode: res.status,
        message: `Ollama returned HTTP ${res.status}`
      };
    }
  } catch (err) {
    checks.ollama = {
      ok: false,
      host: ollamaHost,
      reachable: false,
      error: err.name === 'AbortError' ? 'Connection timed out (>1500ms)' : err.message,
      hint: 'Start Ollama service via `ollama serve` or configure OLLAMA_HOST environment variable.',
      message: 'Ollama service is currently unreachable'
    };
  }

  // 6. Docker Daemon Reachability (for Container Isolation Probes & Lab)
  try {
    const dockerStatus = await checkDockerAvailable();
    checks.docker = {
      ok: dockerStatus.available,
      reachable: dockerStatus.available,
      error: dockerStatus.error || null,
      hint: dockerStatus.available
        ? undefined
        : 'Docker daemon offline. Start Docker Desktop or dockerd to enable Tier B container isolation lab.',
      message: dockerStatus.available
        ? 'Docker daemon online'
        : 'Docker daemon unreachable (Tier B mutations & container probes operate in fail-closed UNVERIFIED mode)'
    };
  } catch (err) {
    checks.docker = {
      ok: false,
      reachable: false,
      error: err.message,
      message: 'Docker daemon check error'
    };
  }

  // Overall status evaluation
  const isFatal = !checks.node.ok || !checks.database.ok || !checks.signingKey.ok || !checks.workspace.ok;
  const isOptionalMissing = !checks.ollama.ok || !checks.docker.ok;

  const status = isFatal ? 'UNHEALTHY' : (isOptionalMissing ? 'DEGRADED' : 'HEALTHY');

  return {
    status,
    timestamp: new Date().toISOString(),
    checks
  };
}
