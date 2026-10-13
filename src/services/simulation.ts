import type {
  GuaranteeDefinition,
  GuaranteeId,
  SimulatedConfig,
  TestExecutionResult,
  TestId,
  AssuranceState,
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
    description: 'Ensures adversary test container has zero mount or directory visibility into blue evaluation artifacts or host root.',
    targetRole: 'red',
    threatModelRisk: 'Adversarial agent traverses bind mounts to read secret prompt evaluations or overwrite gold-standard scoring models.',
  },
  {
    id: 'G2',
    name: 'Network Isolation',
    testId: 'T02',
    testName: 'Network Boundary Scan',
    description: 'Enforces strict egress/ingress microsegmentation between red runner and blue control planes.',
    targetRole: 'red',
    threatModelRisk: 'Untrusted jailbreak payloads pivot across internal docker bridges to reach unauthenticated admin interfaces.',
  },
  {
    id: 'G3',
    name: 'API Authorization',
    testId: 'T03',
    testName: 'Storage API Scope Assertion',
    description: 'Verifies storage API token scope enforcement and rejects unauthenticated or relaxed cross-tenant object access.',
    targetRole: 'infrastructure',
    threatModelRisk: 'Stolen or synthesized service tokens bypass object access-control lists on ground-truth evaluation datasets.',
  },
  {
    id: 'G4',
    name: 'Model Session Confidentiality',
    testId: 'T04',
    testName: 'Canary Token Leak Test',
    description: 'Injects high-entropy 128-bit canary tokens into blue evaluation prompts and verifies complete isolation from red inference cache.',
    targetRole: 'model-gateway',
    threatModelRisk: 'KV-cache re-use or shared token prefix cache in vLLM/TGI leaks system prompts and rubrics across evaluation tenants.',
  },
  {
    id: 'G5',
    name: 'Workload Hardening',
    testId: 'T05',
    testName: 'Container Security Context Check',
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

export const GUARANTEE_TO_TEST: Record<GuaranteeId, TestId> = {
  G1: 'T01',
  G2: 'T02',
  G3: 'T03',
  G4: 'T04',
  G5: 'T05',
};

/**
 * Machine-Readable Mutation Benchmark Specifications (Section 12)
 */
export interface MutationScenarioDefinition {
  id: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'B1' | 'REMEDIATE';
  code: string;
  name: string;
  targetBoundary: 'storage_api' | 'filesystem' | 'network' | 'model_gateway' | 'hardening' | 'metadata' | 'all';
  affectedGuarantee: GuaranteeId | null;
  mappedProbe: TestId | null;
  expectedStatus: AssuranceState;
  isNegativeControl: boolean;
  description: string;
}

export const MUTATION_DEFINITIONS: Record<string, MutationScenarioDefinition> = {
  M1: {
    id: 'M1',
    code: 'M1_RELAX_AUTHZ',
    name: 'Storage API Authorization Relaxation',
    targetBoundary: 'storage_api',
    affectedGuarantee: 'G3',
    mappedProbe: 'T03',
    expectedStatus: 'BREACHED',
    isNegativeControl: false,
    description: 'Simulates storage proxy scope check relaxation allowing anonymous read probes for tenant blobs.',
  },
  M2: {
    id: 'M2',
    code: 'M2_MOUNT_LEAK',
    name: 'Cross-Tenant Bind Mount Exposure',
    targetBoundary: 'filesystem',
    affectedGuarantee: 'G1',
    mappedProbe: 'T01',
    expectedStatus: 'BREACHED',
    isNegativeControl: false,
    description: 'Mounts blue evaluation volume (/opt/blue/data) into red test runner container filesystem.',
  },
  M3: {
    id: 'M3',
    code: 'M3_BRIDGE_NETWORK',
    name: 'Cross-Tenant Network Subnet Attachment',
    targetBoundary: 'network',
    affectedGuarantee: 'G2',
    mappedProbe: 'T02',
    expectedStatus: 'BREACHED',
    isNegativeControl: false,
    description: 'Attaches red container to blue-private-net bridge, enabling inter-tenant packet traversal.',
  },
  M4: {
    id: 'M4',
    code: 'M4_GATEWAY_CACHE',
    name: 'Model Gateway Shared Context Pool',
    targetBoundary: 'model_gateway',
    affectedGuarantee: 'G4',
    mappedProbe: 'T04',
    expectedStatus: 'BREACHED',
    isNegativeControl: false,
    description: 'Enables shared KV prefix-cache in model proxy, allowing red queries to leak blue canary tokens.',
  },
  M5: {
    id: 'M5',
    code: 'M5_WORKLOAD_HARDENING',
    name: 'Container Workload Hardening Relaxation',
    targetBoundary: 'hardening',
    affectedGuarantee: 'G5',
    mappedProbe: 'T05',
    expectedStatus: 'BREACHED',
    isNegativeControl: false,
    description: 'Weakens container isolation: disables readOnlyRoot and retains excess capabilities (CAP_SYS_ADMIN).',
  },
  B1: {
    id: 'B1',
    code: 'B1_METADATA_LABEL',
    name: 'Benign Metadata Label Modification (Negative Control)',
    targetBoundary: 'metadata',
    affectedGuarantee: null,
    mappedProbe: null,
    expectedStatus: 'VERIFIED',
    isNegativeControl: true,
    description: 'Modifies benign operator labels without altering security posture. Cryptographic security fingerprint remains invariant.',
  },
  REMEDIATE: {
    id: 'REMEDIATE',
    code: 'REMEDIATE_BASELINE',
    name: 'Remediate to Baseline Configuration',
    targetBoundary: 'all',
    affectedGuarantee: null,
    mappedProbe: null,
    expectedStatus: 'RECOVERING',
    isNegativeControl: false,
    description: 'Restores all container mounts, networks, authz modes, and hardening flags to certified baseline.',
  },
};

/**
 * Execute a specific test against the current simulated configuration.
 * Returns PASS or FAIL with high-precision measured duration.
 */
export async function executeSimulatedTest(
  testId: TestId,
  config: SimulatedConfig,
  forcedDelayMs?: number
): Promise<TestExecutionResult> {
  const guaranteeId = TEST_TO_GUARANTEE[testId];
  const startTime = performance.now();

  // Simulated execution latency between 350ms and 550ms to emulate realistic I/O & probe runs
  const simulatedDelay = forcedDelayMs !== undefined ? forcedDelayMs : Math.floor(Math.random() * 200) + 350;
  if (simulatedDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, simulatedDelay));
  }

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
          details: `Active red mounts: [${config.redMounts.join(', ')}]. Expected isolation to /opt/red/* only. Inode leak detected.`,
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
        details: `Active networks: [${config.redNetworks.join(', ')}]. ARP and routing isolation verified.`,
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
          details: `Scope checks bypassed. Synthetic unauthorized GET request returned HTTP 200 OK with ground-truth payload.`,
          evaluatedAt,
        };
      }
      return {
        testId,
        guaranteeId,
        status: 'PASS',
        durationMs,
        message: 'Storage API authorization verified: Strict cryptographic token validation active.',
        details: `Unauthorized synthetic probe rejected with HTTP 403 Forbidden. Signed JWT tenant claims enforced.`,
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
          details: `128-bit canary payload (CANARY-7X9B-4D1E-8F2A) injected into Blue tenant was retrieved by Red harness prefix query!`,
          evaluatedAt,
        };
      }
      return {
        testId,
        guaranteeId,
        status: 'PASS',
        durationMs,
        message: 'Canary test passed: Zero context bleed between Blue evaluation and Red test sessions.',
        details: `Injected 128-bit canary payload (CANARY-7X9B-4D1E-8F2A) into Blue tenant. Red harness prefix queries returned zero matches (0 ppm leakage).`,
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
