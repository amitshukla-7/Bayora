import type {
  GuaranteeDefinition,
  GuaranteeId,
  SimulatedConfig,
  TestExecutionResult,
  TestId,
} from '../types';


export const BASELINE_CONFIG: SimulatedConfig = {
  redMounts: ['/opt/red/workspace'],
  redNetworks: ['red-isolated-net'],
  storageApiAuthz: 'strict',
  gatewaySessionIsolation: 'strict',
  hardeningFlags: {
    readOnlyRoot: true,
    dropCapabilities: ['ALL'],
    noNewPrivileges: true,
    seccompProfile: 'docker/default',
  },
  labels: {
    'env': 'eval-sandbox-us-east',
    'tier': 'safety-sandbox',
    'audit.tag': 'baseline-v1',
  },
};

export const GUARANTEES: GuaranteeDefinition[] = [
  {
    id: 'G1',
    name: 'Storage Isolation',
    testId: 'T01',
    testName: 'Filesystem Boundary Check',
    description: 'Ensures adversary test container has zero mount or directory visibility into blue evaluation artifacts or host volumes.',
    targetRole: 'red',
    threatModelRisk: 'Adversarial agent reads secret prompt evaluations or overwrites gold-standard scoring models.',
  },
  {
    id: 'G2',
    name: 'Network Isolation',
    testId: 'T02',
    testName: 'Network Boundary Scan',
    description: 'Enforces strict egress/ingress microsegmentation between red runner and blue control planes.',
    targetRole: 'red',
    threatModelRisk: 'Untrusted jailbreak payloads pivot across internal subnets to reach unauthenticated admin interfaces.',
  },
  {
    id: 'G3',
    name: 'API Authorization',
    testId: 'T03',
    testName: 'Storage API Authz Assertion',
    description: 'Verifies storage API token scope enforcement and rejects unauthenticated or relaxed cross-tenant object access.',
    targetRole: 'infrastructure',
    threatModelRisk: 'Stolen or synthesized service tokens bypass object access-control lists on evaluation datasets.',
  },
  {
    id: 'G4',
    name: 'Model Session Confidentiality',
    testId: 'T04',
    testName: 'Canary Token Leak Test',
    description: 'Injects high-entropy canary tokens into blue evaluation prompts and verifies complete isolation from red-team inference cache.',
    targetRole: 'model-gateway',
    threatModelRisk: 'KV-cache re-use or shared token prefix cache in vLLM/TGI leaks system prompts between evaluation tenants.',
  },
  {
    id: 'G5',
    name: 'Workload Hardening',
    testId: 'T05',
    testName: 'Workload Hardening Check',
    description: 'Validates immutable root filesystem (readOnlyRoot), no-new-privileges, seccomp filters, and dropped Linux capabilities.',
    targetRole: 'red',
    threatModelRisk: 'Adversary leverages host device nodes or privileged escalation to subvert container sandbox.',
  },
];

export const GUARANTEE_MAP: Record<GuaranteeId, GuaranteeDefinition> = GUARANTEES.reduce(
  (acc, g) => ({ ...acc, [g.id]: g }),
  {} as Record<GuaranteeId, GuaranteeDefinition>
);

export const TEST_TO_GUARANTEE: Record<TestId, GuaranteeId> = {
  T01: 'G1',
  T02: 'G2',
  T03: 'G3',
  T04: 'G4',
  T05: 'G5',
};

/**
 * Execute a specific test against the current simulated configuration.
 * Returns PASS or FAIL based on precise security guarantees.
 */
export async function executeSimulatedTest(
  testId: TestId,
  config: SimulatedConfig
): Promise<TestExecutionResult> {
  const guaranteeId = TEST_TO_GUARANTEE[testId];
  const startTime = performance.now();

  // Simulated execution latency between 350ms and 650ms to emulate realistic I/O & probe runs
  const simulatedDelay = Math.floor(Math.random() * 300) + 350;
  await new Promise((resolve) => setTimeout(resolve, simulatedDelay));

  const endTime = performance.now();
  const durationMs = Math.round(endTime - startTime);
  const evaluatedAt = new Date().toISOString();

  switch (testId) {
    case 'T01': {
      // G1: Storage Isolation (redMounts check)
      const hasBlueMount = config.redMounts.some((m) => m.includes('/opt/blue') || m === '/');
      if (hasBlueMount) {
        return {
          testId,
          guaranteeId,
          status: 'FAIL',
          durationMs,
          message: 'Boundary violation: Red container contains unauthorized mount to Blue volume or root directory.',
          details: `Active red mounts: [${config.redMounts.join(', ')}]. Expected isolation to /opt/red/* only.`,
          evaluatedAt,
        };
      }
      return {
        testId,
        guaranteeId,
        status: 'PASS',
        durationMs,
        message: 'Storage isolation verified: Mount points confined strictly to /opt/red/workspace.',
        details: `Verified ${config.redMounts.length} mount path(s). No overlapping inode boundaries detected with blue tenant.`,
        evaluatedAt,
      };
    }

    case 'T02': {
      // G2: Network Isolation (redNetworks check)
      const hasBlueNet = config.redNetworks.some(
        (net) => net.includes('blue') || net.includes('host') || net.includes('admin')
      );
      if (hasBlueNet) {
        return {
          testId,
          guaranteeId,
          status: 'FAIL',
          durationMs,
          message: 'Network boundary violation: Red runner container joined Blue private subnet.',
          details: `Attached networks: [${config.redNetworks.join(', ')}]. Cross-tenant L2/L3 packet traversal detected.`,
          evaluatedAt,
        };
      }
      return {
        testId,
        guaranteeId,
        status: 'PASS',
        durationMs,
        message: 'Network boundary intact: Ingress/egress isolated to dedicated red runner bridge.',
        details: `Active networks: [${config.redNetworks.join(', ')}]. DNS and ARP isolation filters active.`,
        evaluatedAt,
      };
    }

    case 'T03': {
      // G3: API Authorization (storageApiAuthz check)
      if (config.storageApiAuthz === 'relaxed') {
        return {
          testId,
          guaranteeId,
          status: 'FAIL',
          durationMs,
          message: 'API Authorization breach: Storage API is operating in RELAXED authorization mode.',
          details: `Scope checks bypassed. Anonymous read probes for tenant blobs succeeded with HTTP 200 OK.`,
          evaluatedAt,
        };
      }
      return {
        testId,
        guaranteeId,
        status: 'PASS',
        durationMs,
        message: 'Storage API authorization verified: Strict cryptographic token validation active.',
        details: `Unauthorized synthetic request rejected with HTTP 403 Forbidden. Signed JWT tenant claims enforced.`,
        evaluatedAt,
      };
    }

    case 'T04': {
      // G4: Model Session Confidentiality (gatewaySessionIsolation check)
      if (config.gatewaySessionIsolation === 'shared') {
        return {
          testId,
          guaranteeId,
          status: 'FAIL',
          durationMs,
          message: 'Canary leak detected: Model gateway context cache is configured with SHARED session pool.',
          details: `High-entropy canary string (CANARY-7X9B...) injected into Blue tenant was retrieved by Red harness inference query!`,
          evaluatedAt,
        };
      }
      return {
        testId,
        guaranteeId,
        status: 'PASS',
        durationMs,
        message: 'Canary test passed: Zero context bleed between Blue evaluation and Red test sessions.',
        details: `Injected 128-bit canary payload into Blue tenant. Red harness prefix queries returned zero matches (0 ppm leakage).`,
        evaluatedAt,
      };
    }

    case 'T05': {
      // G5: Workload Hardening (hardeningFlags check)
      const flags = config.hardeningFlags;
      const issues: string[] = [];
      if (!flags.readOnlyRoot) issues.push('Root filesystem is writable (readOnlyRoot=false)');
      if (!flags.noNewPrivileges) issues.push('noNewPrivileges is disabled');
      if (!flags.dropCapabilities.includes('ALL')) issues.push('Linux capabilities not dropped to ALL');

      if (issues.length > 0) {
        return {
          testId,
          guaranteeId,
          status: 'FAIL',
          durationMs,
          message: 'Workload hardening failure: Container security parameters weakened.',
          details: issues.join('; '),
          evaluatedAt,
        };
      }
      return {
        testId,
        guaranteeId,
        status: 'PASS',
        durationMs,
        message: 'Workload hardening verified: Read-only rootfs, dropped capabilities, and default seccomp profile enforced.',
        details: `ReadOnlyRoot=true, Capabilities=[${flags.dropCapabilities.join(',')}], NoNewPrivileges=true, Seccomp=${flags.seccompProfile}.`,
        evaluatedAt,
      };
    }

    default:
      throw new Error(`Unknown test ID: ${testId}`);
  }
}
