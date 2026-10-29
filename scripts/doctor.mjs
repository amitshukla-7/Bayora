import { checkSystemHealth } from '../server/health.mjs';

// ANSI color codes for terminal output
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

async function main() {
  console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   BAYORA INTELLIGENCE CENTER — SYSTEM DOCTOR & DIAGNOSTICS   ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

  const report = await checkSystemHealth();
  const checks = report.checks;

  console.log(`System Status: ${report.status === 'HEALTHY' ? `${GREEN}${BOLD}HEALTHY${RESET}` : report.status === 'DEGRADED' ? `${YELLOW}${BOLD}DEGRADED${RESET}` : `${RED}${BOLD}UNHEALTHY${RESET}`}`);
  console.log(`Evaluated At : ${GRAY}${report.timestamp}${RESET}\n`);

  console.log(`${BOLD}${'CHECK ITEM'.padEnd(28)} | ${'STATUS'.padEnd(10)} | DETAILS${RESET}`);
  console.log('-'.repeat(80));

  const items = [
    {
      name: '1. Node.js Runtime',
      ok: checks.node.ok,
      statusText: checks.node.ok ? 'PASS' : 'FAIL',
      details: checks.node.message
    },
    {
      name: '2. SQLite Database & WAL',
      ok: checks.database.ok,
      statusText: checks.database.ok ? 'PASS' : 'FAIL',
      details: checks.database.ok ? `${checks.database.message} (SQLite v${checks.database.sqliteVersion})` : checks.database.error
    },
    {
      name: '3. ECDSA Signing Authority',
      ok: checks.signingKey.ok,
      statusText: checks.signingKey.ok ? 'PASS' : 'FAIL',
      details: checks.signingKey.ok ? `${checks.signingKey.message} [Key ID: ${checks.signingKey.keyId.slice(0, 12)}...]` : checks.signingKey.error
    },
    {
      name: '4. Workspace & Disk Space',
      ok: checks.workspace.ok,
      statusText: checks.workspace.ok ? 'PASS' : 'FAIL',
      details: checks.workspace.ok ? `${checks.workspace.freeDiskGb} GB free (${checks.workspace.path})` : checks.workspace.error
    },
    {
      name: '5. Ollama Local Endpoint',
      ok: checks.ollama.ok,
      statusText: checks.ollama.ok ? 'PASS' : 'OFFLINE',
      isWarning: !checks.ollama.ok,
      details: checks.ollama.ok ? checks.ollama.message : `${checks.ollama.message} (${checks.ollama.error || checks.ollama.hint})`
    },
    {
      name: '6. Docker Daemon',
      ok: checks.docker.ok,
      statusText: checks.docker.ok ? 'PASS' : 'OFFLINE',
      isWarning: !checks.docker.ok,
      details: checks.docker.ok ? 'Docker daemon running' : checks.docker.message
    }
  ];

  const remediations = [];

  for (const item of items) {
    let color = GREEN;
    if (!item.ok) {
      color = item.isWarning ? YELLOW : RED;
    }
    const coloredStatus = `${color}${BOLD}${item.statusText.padEnd(10)}${RESET}`;
    console.log(`${item.name.padEnd(28)} | ${coloredStatus} | ${item.details}`);

    if (!item.ok) {
      if (item.name.includes('Node.js')) {
        remediations.push({
          severity: 'FATAL',
          name: 'Node.js Version',
          remedy: 'Install Node.js 22 LTS or Node.js 24 LTS from https://nodejs.org/'
        });
      }
      if (item.name.includes('SQLite')) {
        remediations.push({
          severity: 'FATAL',
          name: 'SQLite Database',
          remedy: 'Check file permissions on workspace/bayora.db and ensure directory is writable.'
        });
      }
      if (item.name.includes('Signing Authority')) {
        remediations.push({
          severity: 'FATAL',
          name: 'Signing Authority Key',
          remedy: 'Run server initialization to auto-generate workspace/signing_authority.jwk or check key permissions.'
        });
      }
      if (item.name.includes('Workspace')) {
        remediations.push({
          severity: 'FATAL',
          name: 'Disk Space / Workspace',
          remedy: 'Free up disk space on the host drive (min 500MB required for model artifacts and eval databases).'
        });
      }
      if (item.name.includes('Ollama')) {
        remediations.push({
          severity: 'OPTIONAL',
          name: 'Ollama Service',
          remedy: 'Start Ollama service via `ollama serve` or ensure OLLAMA_HOST is reachable. Required for local model evaluation.'
        });
      }
      if (item.name.includes('Docker')) {
        remediations.push({
          severity: 'OPTIONAL',
          name: 'Docker Daemon',
          remedy: 'Start Docker Desktop or start dockerd. Required for Tier B container isolation lab mutations and container probes.'
        });
      }
    }
  }

  console.log('-'.repeat(80));

  if (remediations.length > 0) {
    console.log(`\n${BOLD}REMEDIATION & ACTION REQUIRED:${RESET}`);
    for (const r of remediations) {
      const tag = r.severity === 'FATAL' ? `${RED}[FATAL]${RESET}` : `${YELLOW}[WARNING]${RESET}`;
      console.log(`  ${tag} ${BOLD}${r.name}${RESET}: ${r.remedy}`);
    }
  } else {
    console.log(`\n${GREEN}${BOLD}✔ All system services and prerequisites are verified and healthy.${RESET}`);
  }

  console.log(`\n${BOLD}${CYAN}================================================================${RESET}\n`);

  if (report.status === 'UNHEALTHY') {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`${RED}Doctor execution failed:${RESET}`, err);
  process.exit(1);
});
