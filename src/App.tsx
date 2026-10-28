import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Shield,
  SlidersHorizontal,
  Lock,
  FileCode,
  LayoutGrid,
  BarChart3,
} from 'lucide-react';
import type {
  AssuranceState,
  ChainVerificationReport,
  EvidenceEvent,
  GateEvaluationResult,
  GuaranteeDigestMap,
  GuaranteeId,
  SimulatedConfig,
  TestExecutionResult,
  TestId,
  DecoupledAssuranceSnapshot,
  BenchmarkMetrics,
  ConfigurationStatus,
  PolicyTestStatus,
  EvidenceIntegrityStatus,
  EvidenceCompletenessStatus,
} from './types';
import {
  BASELINE_CONFIG,
  GUARANTEES,
  GUARANTEE_MAP,
  TEST_TO_GUARANTEE,
  executeSimulatedTest,
} from './services/simulation';
import {
  computeConfigFingerprint,
  computeGuaranteeDigests,
  buildCanonicalManifest,
  signCheckpointDigest,
  GENESIS_HASH,
  hashEventPayload,
  verifyEvidenceChain,
} from './utils/crypto';
import { StatusBanner } from './components/StatusBanner';
import { GuaranteesTable } from './components/GuaranteesTable';
import { MutationLab } from './components/MutationLab';
import { RunControls } from './components/RunControls';
import { EvidenceLogTable } from './components/EvidenceLogTable';
import { FailClosedGate } from './components/FailClosedGate';
import { ThreatModelPanel } from './components/ThreatModelPanel';
import { BenchmarkPanel } from './components/BenchmarkPanel';

export function App() {
  // Core simulated lab state
  const [config, setConfig] = useState<SimulatedConfig>(BASELINE_CONFIG);
  const [baselineFingerprint, setBaselineFingerprint] = useState<string>('');
  const [currentFingerprint, setCurrentFingerprint] = useState<string>('');
  const [currentDigests, setCurrentDigests] = useState<GuaranteeDigestMap | null>(null);

  // Assurance State & Verification Baselines
  const [assuranceState, setAssuranceState] = useState<AssuranceState>('UNVERIFIED');
  const [verifiedFingerprint, setVerifiedFingerprint] = useState<string | null>(null);
  const [verifiedDigests, setVerifiedDigests] = useState<GuaranteeDigestMap | null>(null);
  const [staleGuarantees, setStaleGuarantees] = useState<Set<GuaranteeId>>(new Set());

  // Active Tab View
  const [activeTab, setActiveTab] = useState<
    'all' | 'guarantees' | 'mutations' | 'gate' | 'audit' | 'benchmarks'
  >('all');

  // Test Results
  const [testResults, setTestResults] = useState<Record<TestId, TestExecutionResult | undefined>>({
    T01: undefined,
    T02: undefined,
    T03: undefined,
    T04: undefined,
    T05: undefined,
  });

  // Runner execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentRunningTest, setCurrentRunningTest] = useState<TestId | null>(null);
  const [probeTrialProgress, setProbeTrialProgress] = useState<{ current: number; total: number } | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [lastRunDurationMs, setLastRunDurationMs] = useState<number | null>(null);

  // Evidence Log (Real SHA-256 Hash Chain)
  const [evidenceEvents, setEvidenceEvents] = useState<EvidenceEvent[]>([]);
  const [verificationReport, setVerificationReport] = useState<ChainVerificationReport | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Benchmark Metrics (Section 18.1)
  const [metrics, setMetrics] = useState<BenchmarkMetrics>({
    mutationDetectionRate: 100,
    falsePositiveRate: 0.0,
    selectiveRetestReduction: 0.72,
    fullRunDurationMs: 2400,
    selectiveRunDurationMs: 480,
    timeToDetectMs: 8,
    recoveryLatencyMs: 480,
    lastMutationApplied: null,
  });

  // Remediation timestamp for latency tracking
  const remediationTimestampRef = useRef<number | null>(null);

  // Theme State (Dark / Light) with LocalStorage persistence
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bayora-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('bayora-theme', theme);
    } catch {
      // Local storage may be restricted in sandboxed environments
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Ref to track latest events for async chain appending (updated cleanly in useEffect)
  const eventsRef = useRef<EvidenceEvent[]>([]);
  useEffect(() => {
    eventsRef.current = evidenceEvents;
  }, [evidenceEvents]);

  // Initialize and compute initial fingerprint on load
  useEffect(() => {
    async function initHashes() {
      const fp = await computeConfigFingerprint(BASELINE_CONFIG);
      const digests = await computeGuaranteeDigests(BASELINE_CONFIG);
      setBaselineFingerprint(fp);
      setCurrentFingerprint(fp);
      setCurrentDigests(digests);
    }
    initHashes();
  }, []);

  /**
   * Helper to append an event to the cryptographic SHA-256 hash chain
   */
  const appendEvent = async (
    runId: string,
    eventType: EvidenceEvent['event_type'],
    payload: Record<string, any>
  ): Promise<EvidenceEvent> => {
    const currentEvents = eventsRef.current;
    const nextSeq = currentEvents.length + 1;
    const prevHash = currentEvents.length === 0 ? GENESIS_HASH : currentEvents[currentEvents.length - 1].event_hash;
    const timestamp = new Date().toISOString();

    const eventHash = await hashEventPayload(nextSeq, runId, timestamp, eventType, payload, prevHash);

    const newEvent: EvidenceEvent = {
      sequence: nextSeq,
      run_id: runId,
      timestamp,
      event_type: eventType,
      payload,
      previous_event_hash: prevHash,
      event_hash: eventHash,
    };

    const updated = [...currentEvents, newEvent];
    eventsRef.current = updated;
    setEvidenceEvents(updated);
    return newEvent;
  };

  /**
   * Evaluates config drift against the last verified state.
   * Strictly enforces Precedence Rules (Section 4.1).
   */
  const handleConfigChange = async (newConfig: SimulatedConfig, mutationType?: string) => {
    const driftTriggerTime = performance.now();
    setConfig(newConfig);

    const newFingerprint = await computeConfigFingerprint(newConfig);
    const newDigests = await computeGuaranteeDigests(newConfig);

    setCurrentFingerprint(newFingerprint);
    setCurrentDigests(newDigests);

    // If fingerprint is unchanged (benign label change B1), do nothing to assurance state
    if (newFingerprint === currentFingerprint) {
      if (mutationType === 'B1') {
        setMetrics((prev) => ({
          ...prev,
          lastMutationApplied: 'B1_METADATA_LABEL',
          falsePositiveRate: 0.0,
        }));
      }
      return;
    }

    // Measure TTD (Time to Detect)
    const ttd = Math.round(performance.now() - driftTriggerTime);

    // Determine which guarantees drifted compared to verified digests (or current if unverified)
    const referenceDigests = verifiedDigests || currentDigests;
    const affected = new Set<GuaranteeId>();
    if (referenceDigests) {
      if (newDigests.G1 !== referenceDigests.G1) affected.add('G1');
      if (newDigests.G2 !== referenceDigests.G2) affected.add('G2');
      if (newDigests.G3 !== referenceDigests.G3) affected.add('G3');
      if (newDigests.G4 !== referenceDigests.G4) affected.add('G4');
      if (newDigests.G5 !== referenceDigests.G5) affected.add('G5');
    } else {
      affected.add('G1');
      affected.add('G2');
      affected.add('G3');
      affected.add('G4');
      affected.add('G5');
    }

    setStaleGuarantees(affected);

    // Invalidate prior test results for guarantees that drifted (Precedence Rule 3: No inheritance across config drift)
    if (affected.size > 0) {
      setTestResults((prev) => {
        const updated = { ...prev };
        affected.forEach((gid) => {
          const tid = GUARANTEE_MAP[gid]?.testId;
          if (tid) {
            updated[tid] = undefined;
          }
        });
        return updated;
      });
    }

    // Check if configuration matches baseline
    const baseFp = baselineFingerprint || (await computeConfigFingerprint(BASELINE_CONFIG));
    const matchesBaseline = newFingerprint === baseFp;

    // When transitioning to RECOVERING, ensure guarantees that failed during the breach
    // are included in affected / staleGuarantees so selective retesting targets them
    if (mutationType === 'REMEDIATE' || (assuranceState === 'BREACHED' && matchesBaseline)) {
      GUARANTEES.forEach((g) => {
        if (testResults[g.testId]?.status === 'FAIL') {
          affected.add(g.id);
        }
      });
      remediationTimestampRef.current = performance.now();
      setAssuranceState('RECOVERING');
    } else if (assuranceState === 'VERIFIED' || assuranceState === 'RECOVERING') {
      if (affected.size > 0) {
        setAssuranceState('STALE');
      }
    }
    // Note: BREACHED stays BREACHED unless restored to baseline.
    // STALE stays STALE until retest passes.
    // UNVERIFIED stays UNVERIFIED until full suite passes.

    setMetrics((prev) => ({
      ...prev,
      timeToDetectMs: Math.max(ttd, 4),
      lastMutationApplied: mutationType || 'CONFIG_DRIFT',
    }));
  };

  /**
   * Run verification suite executing the full 7-stage declared lifecycle (Section 9.2).
   */
  const runVerificationSuite = async (testsToRun: TestId[], runType: 'full' | 'selective') => {
    if (isRunning) return;
    setIsRunning(true);
    setProgressPercent(0);
    const runStartTime = performance.now();
    const runId = `run-${Date.now().toString(36)}`;

    // Build planned events manifest (Section 9.2 Seven-Stage Declared Lifecycle Protocol)
    const expectedPlan: string[] = ['manifest.captured'];
    for (const tid of testsToRun) {
      expectedPlan.push(`test.started:${tid}`);
      expectedPlan.push(`test.completed:${tid}`);
    }
    expectedPlan.push('policy.decision');
    expectedPlan.push('checkpoint.signed');
    expectedPlan.push('run.completed');

    // Stage 1: run.started
    await appendEvent(runId, 'run.started', {
      run_type: runType,
      tests_planned: testsToRun,
      expected_plan: expectedPlan,
      config_fingerprint: currentFingerprint,
    });

    // Stage 2: manifest.captured
    const canonicalManifest = await buildCanonicalManifest(config);
    await appendEvent(runId, 'manifest.captured', {
      canonical_manifest: canonicalManifest,
      digests: currentDigests,
    });

    const currentResultsCopy = { ...testResults };
    let hasFailure = false;

    // Stage 3 & 4: test.started and test.completed for each test
    for (let i = 0; i < testsToRun.length; i++) {
      const tid = testsToRun[i];
      const gid = TEST_TO_GUARANTEE[tid];
      setCurrentRunningTest(tid);
      setProgressPercent((i / testsToRun.length) * 100);

      await appendEvent(runId, 'test.started', {
        test_id: tid,
        guarantee_id: gid,
      });

      const res = await executeSimulatedTest(
        tid,
        config,
        undefined,
        currentDigests?.[gid],
        (trialNumber, total) => {
          setProbeTrialProgress({ current: trialNumber, total });
        }
      );
      setProbeTrialProgress(null);
      currentResultsCopy[tid] = res;
      setTestResults({ ...currentResultsCopy });

      if (res.status === 'FAIL') {
        hasFailure = true;
      }

      await appendEvent(runId, 'test.completed', {
        test_id: tid,
        guarantee_id: gid,
        status: res.status,
        duration_ms: res.durationMs,
        details: res.details,
        ...(res.trials
          ? {
              trials_total: res.totalTrials || res.trials.length,
              leak_count: res.leakCount ?? (res.status === 'FAIL' ? 5 : 0),
              source: res.source,
              tag: res.tag,
              trials: res.trials.map((t) => ({
                trial: t.trialNumber,
                leaked: t.leaked,
                duration_ms: t.durationMs,
                canary_token: t.canaryToken,
                excerpt: t.excerpt,
                transcript_sha256: t.transcriptSha256,
              })),
            }
          : {}),
      });

      setProgressPercent(((i + 1) / testsToRun.length) * 100);
    }

    const runEndTime = performance.now();
    const totalDuration = Math.round(runEndTime - runStartTime);
    setLastRunDurationMs(totalDuration);
    setCurrentRunningTest(null);

    // Calculate new assurance state enforcing inviolable precedence rules (Section 4.1)
    let nextState: AssuranceState;
    if (hasFailure) {
      // Precedence Rule 1: Confirmed boundary violation forces BREACHED
      nextState = 'BREACHED';
    } else {
      // Remove passed tests from stale guarantees
      const updatedStale = new Set(staleGuarantees);
      testsToRun.forEach((tid) => {
        if (currentResultsCopy[tid]?.status === 'PASS') {
          updatedStale.delete(TEST_TO_GUARANTEE[tid]);
        }
      });
      setStaleGuarantees(updatedStale);

      const allPassed = GUARANTEES.every((g) => {
        const tr = currentResultsCopy[g.testId];
        return tr && tr.status === 'PASS';
      });

      if (allPassed && updatedStale.size === 0) {
        nextState = 'VERIFIED';
        setVerifiedFingerprint(currentFingerprint);
        setVerifiedDigests(currentDigests);
        setStaleGuarantees(new Set());
      } else if (assuranceState === 'UNVERIFIED') {
        // If we were UNVERIFIED and only a subset of tests ran/passed, remain UNVERIFIED
        nextState = 'UNVERIFIED';
      } else {
        nextState = assuranceState === 'RECOVERING' ? 'RECOVERING' : 'STALE';
      }
    }

    setAssuranceState(nextState);

    // Track Recovery Latency (T_rec) if recovering
    if (remediationTimestampRef.current && nextState === 'VERIFIED') {
      const trec = Math.round(performance.now() - remediationTimestampRef.current);
      setMetrics((prev) => ({ ...prev, recoveryLatencyMs: trec }));
      remediationTimestampRef.current = null;
    }

    // Stage 5: policy.decision
    const passedCount = GUARANTEES.filter((g) => currentResultsCopy[g.testId]?.status === 'PASS').length;
    await appendEvent(runId, 'policy.decision', {
      assurance_state: nextState,
      fingerprint: currentFingerprint,
      guarantees_passed: passedCount,
      has_failures: hasFailure,
      policy_verdict: nextState === 'VERIFIED' ? 'GRANTED' : 'DENIED',
    });

    // Stage 6: checkpoint.signed (Ed25519 / HMAC signature outside container runner)
    const latestEvents = eventsRef.current;
    const rootHash = latestEvents.length > 0 ? latestEvents[latestEvents.length - 1].event_hash : GENESIS_HASH;
    const signedCheckpoint = await signCheckpointDigest(runId, rootHash);
    await appendEvent(runId, 'checkpoint.signed', {
      checkpoint: signedCheckpoint,
    });

    // Stage 7: run.completed
    await appendEvent(runId, 'run.completed', {
      summary: `Run ${runId} finalized with state ${nextState}`,
      total_duration_ms: totalDuration,
      tests_executed: testsToRun.length,
    });

    // Update Benchmark Metrics (Section 18.1)
    setMetrics((prev) => {
      let fullDur = prev.fullRunDurationMs;
      let selDur = prev.selectiveRunDurationMs;
      if (runType === 'full') {
        fullDur = totalDuration;
      } else {
        selDur = totalDuration;
      }
      const r = fullDur > 0 ? Math.max(0, 1 - selDur / fullDur) : 0.72;
      return {
        ...prev,
        fullRunDurationMs: fullDur,
        selectiveRunDurationMs: selDur,
        selectiveRetestReduction: Math.round(r * 100) / 100,
      };
    });

    // Verify Evidence Chain immediately
    const report = await verifyEvidenceChain(eventsRef.current);
    setVerificationReport(report);

    setIsRunning(false);
  };

  const handleRunFullVerification = () => {
    const allTests: TestId[] = ['T01', 'T02', 'T03', 'T04', 'T05'];
    return runVerificationSuite(allTests, 'full');
  };

  const handleRunSelectiveRetest = () => {
    const testsToRun: TestId[] = [];
    staleGuarantees.forEach((gid) => {
      const g = GUARANTEES.find((item) => item.id === gid);
      if (g && !testsToRun.includes(g.testId)) testsToRun.push(g.testId);
    });

    if (assuranceState === 'RECOVERING' || assuranceState === 'BREACHED') {
      GUARANTEES.forEach((g) => {
        if (testResults[g.testId]?.status === 'FAIL' && !testsToRun.includes(g.testId)) {
          testsToRun.push(g.testId);
        }
      });
    }

    if (testsToRun.length === 0) return Promise.resolve();
    return runVerificationSuite(testsToRun, 'selective');
  };

  const handleRunSingleTest = (testId: TestId) => {
    return runVerificationSuite([testId], 'selective');
  };

  const handleApplyMutation = (type: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'B1' | 'REMEDIATE') => {
    let next = { ...config };

    switch (type) {
      case 'M1':
        next.storageApiAuthz = next.storageApiAuthz === 'strict' ? 'relaxed' : 'strict';
        break;
      case 'M2':
        if (next.redMounts.includes('/opt/blue/data')) {
          next.redMounts = next.redMounts.filter((m) => m !== '/opt/blue/data');
        } else {
          next.redMounts = [...next.redMounts, '/opt/blue/data'];
        }
        break;
      case 'M3':
        if (next.redNetworks.includes('blue-private-net')) {
          next.redNetworks = next.redNetworks.filter((n) => n !== 'blue-private-net');
        } else {
          next.redNetworks = [...next.redNetworks, 'blue-private-net'];
        }
        break;
      case 'M4':
        next.gatewaySessionIsolation = next.gatewaySessionIsolation === 'strict' ? 'shared' : 'strict';
        break;
      case 'M5':
        if (next.hardeningFlags.readOnlyRoot) {
          next.hardeningFlags = {
            ...next.hardeningFlags,
            readOnlyRoot: false,
            dropCapabilities: ['CAP_SYS_ADMIN'],
          };
        } else {
          next.hardeningFlags = {
            ...BASELINE_CONFIG.hardeningFlags,
          };
        }
        break;
      case 'B1':
        next.labels = {
          ...next.labels,
          'audit.note': `annotation-${Math.floor(Math.random() * 900 + 100)}`,
          'operator.session': 'sec-ops-77',
        };
        break;
      case 'REMEDIATE':
        next = {
          ...BASELINE_CONFIG,
          labels: { ...BASELINE_CONFIG.labels },
        };
        break;
    }

    return handleConfigChange(next, type);
  };

  const handleVerifyEvidence = async () => {
    setIsVerifying(true);
    const report = await verifyEvidenceChain(eventsRef.current);
    setVerificationReport(report);
    setIsVerifying(false);

    if (report.status !== 'VALID') {
      setAssuranceState('UNVERIFIED');
    }
  };

  const handleSimulateTampering = () => {
    const list = [...eventsRef.current];
    if (list.length === 0) return;

    const targetIdx = list.findIndex(
      (e) => e.event_type === 'test.completed' || e.event_type === 'policy.decision'
    );
    const idxToTamper = targetIdx !== -1 ? targetIdx : list.length - 1;

    const tampered = { ...list[idxToTamper] };
    tampered.payload = {
      ...tampered.payload,
      tampered_by_attacker: true,
      status: tampered.payload.status === 'FAIL' ? 'PASS' : 'FORGED_PASS',
      details: 'ADVERSARY INJECTED FORGERY: Tampered status without updating cryptographic hash.',
    };

    list[idxToTamper] = tampered;
    eventsRef.current = list;
    setEvidenceEvents(list);

    verifyEvidenceChain(list).then((r) => setVerificationReport(r));
    setAssuranceState('UNVERIFIED');
  };

  const handleSimulateMissingEvent = () => {
    const list = [...eventsRef.current];
    if (list.length < 3) return;

    const removeIdx = list.findIndex((e) => e.event_type === 'test.completed');
    if (removeIdx !== -1) {
      list.splice(removeIdx, 1);
    } else {
      list.splice(list.length - 2, 1);
    }

    eventsRef.current = list;
    setEvidenceEvents(list);

    verifyEvidenceChain(list).then((r) => setVerificationReport(r));
    setAssuranceState('UNVERIFIED');
  };

  const handleResetLog = () => {
    eventsRef.current = [];
    setEvidenceEvents([]);
    setVerificationReport(null);
    setAssuranceState('UNVERIFIED');
    setTestResults({
      T01: undefined,
      T02: undefined,
      T03: undefined,
      T04: undefined,
      T05: undefined,
    });
  };

  const handleImportLedger = (importedEvents: EvidenceEvent[]) => {
    eventsRef.current = importedEvents;
    setEvidenceEvents(importedEvents);
    verifyEvidenceChain(importedEvents).then((r) => setVerificationReport(r));
  };

  // Construct Decoupled Assurance Snapshot (Section 4.3)
  const isBaseline = baselineFingerprint ? currentFingerprint === baselineFingerprint : false;
  const configStatus: ConfigurationStatus = isBaseline
    ? 'BASELINE'
    : assuranceState === 'RECOVERING'
    ? 'REMEDIATED'
    : 'DRIFTED';
  const hasFailTest = Object.values(testResults).some((r) => r?.status === 'FAIL');
  const allPassTest = GUARANTEES.every((g) => testResults[g.testId]?.status === 'PASS');
  const policyTestStatus: PolicyTestStatus = hasFailTest
    ? 'FAIL'
    : staleGuarantees.size > 0 || !allPassTest
    ? 'PENDING'
    : 'PASS';
  const integrityStatus: EvidenceIntegrityStatus = verificationReport
    ? verificationReport.status === 'VALID'
      ? 'VALID'
      : 'TAMPERED'
    : 'UNCHECKED';
  // Completeness can only be asserted when the chain is structurally VALID.
  // If TAMPERED, the chain is broken so completeness cannot be determined → UNCHECKED.
  // If INCOMPLETE, the plan check explicitly detected missing events → INCOMPLETE.
  const completenessStatus: EvidenceCompletenessStatus = verificationReport
    ? verificationReport.status === 'INCOMPLETE'
      ? 'INCOMPLETE'
      : verificationReport.status === 'TAMPERED'
      ? 'UNCHECKED'
      : 'COMPLETE'
    : 'UNCHECKED';

  const decoupledSnapshot = useMemo<DecoupledAssuranceSnapshot>(() => {
    return {
      run_id: `run-${currentFingerprint.slice(0, 8) || 'init'}`,
      environment_id: 'eval-sandbox-us-east',
      manifest_digest: currentFingerprint ? `sha256:${currentFingerprint}` : 'pending',
      configuration_status: configStatus,
      policy_test_status: policyTestStatus,
      evidence_integrity_status: integrityStatus,
      evidence_completeness_status: completenessStatus,
      assurance_state: assuranceState,
      drift_details: {
        affected_guarantees: Array.from(staleGuarantees),
        required_retests: Array.from(staleGuarantees).map((g) => GUARANTEE_MAP[g]?.testId).filter(Boolean) as TestId[],
      },
      gate_evaluation: {
        decision: assuranceState === 'VERIFIED' ? 'GRANTED' : 'DENIED',
        reasons:
          assuranceState === 'VERIFIED'
            ? [
                'All boundaries cryptographically attested.',
                'Zero Trust evaluation access granted with signed ticket.',
              ]
            : [
                `Assurance state is ${assuranceState}. Fail-closed default deny active.`,
                ...(staleGuarantees.size > 0
                  ? [`Configuration drift detected on: [${Array.from(staleGuarantees).join(', ')}]. Retest required.`]
                  : []),
                ...(hasFailTest
                  ? GUARANTEES.filter((g) => testResults[g.testId]?.status === 'FAIL').map(
                      (g) => `Active boundary failure on ${g.id} (${g.testId}: ${testResults[g.testId]?.message})`
                    )
                  : []),
              ],
        required_retests: Array.from(staleGuarantees).map((g) => GUARANTEE_MAP[g]?.testId).filter(Boolean) as TestId[],
        ticket_id:
          assuranceState === 'VERIFIED'
            ? `TKT-BAYORA-${currentFingerprint.slice(0, 8).toUpperCase()}-OK`
            : undefined,
      },
    };
  }, [
    currentFingerprint,
    configStatus,
    policyTestStatus,
    integrityStatus,
    completenessStatus,
    assuranceState,
    staleGuarantees,
    hasFailTest,
    testResults,
  ]);

  const handleRequestEvaluation = (): GateEvaluationResult => {
    const reasons: string[] = [];
    const requiredTestsList: TestId[] = [];

    if (assuranceState !== 'VERIFIED') {
      reasons.push(`Assurance state is ${assuranceState} (Required: VERIFIED). Fail-closed gate blocks access.`);
    }

    if (!verifiedFingerprint || currentFingerprint !== verifiedFingerprint) {
      reasons.push(
        `Current configuration fingerprint (${currentFingerprint.slice(0, 10)}...) differs from verified baseline (${
          verifiedFingerprint ? verifiedFingerprint.slice(0, 10) + '...' : 'none'
        }).`
      );
    }

    if (verificationReport && verificationReport.status !== 'VALID') {
      reasons.push(
        `Cryptographic audit ledger validation failed: ${verificationReport.status}. Tampering or missing event detected.`
      );
    }

    if (staleGuarantees.size > 0) {
      staleGuarantees.forEach((gid) => {
        const g = GUARANTEE_MAP[gid];
        if (g) {
          reasons.push(`Guarantee ${gid} (${g.name}) is drifted and requires re-evaluation.`);
          requiredTestsList.push(g.testId);
        }
      });
    }

    GUARANTEES.forEach((g) => {
      const res = testResults[g.testId];
      if (!res) {
        if (!requiredTestsList.includes(g.testId)) requiredTestsList.push(g.testId);
      } else if (res.status === 'FAIL') {
        reasons.push(`Active boundary failure on ${g.id} (${g.testId}: ${res.message})`);
        if (!requiredTestsList.includes(g.testId)) requiredTestsList.push(g.testId);
      }
    });

    const isGranted = reasons.length === 0;

    return {
      decision: isGranted ? 'GRANTED' : 'DENIED',
      timestamp: new Date().toISOString(),
      currentFingerprint,
      verifiedFingerprint,
      reasons,
      requiredTests: requiredTestsList,
      ticketId: isGranted ? `TKT-BAYORA-${currentFingerprint.slice(0, 8).toUpperCase()}-OK` : undefined,
    };
  };

  const selectiveTestsToRun: TestId[] = [];
  staleGuarantees.forEach((gid) => {
    const g = GUARANTEE_MAP[gid];
    if (g && !selectiveTestsToRun.includes(g.testId)) {
      selectiveTestsToRun.push(g.testId);
    }
  });

  if (assuranceState === 'RECOVERING' || assuranceState === 'BREACHED') {
    GUARANTEES.forEach((g) => {
      if (testResults[g.testId]?.status === 'FAIL' && !selectiveTestsToRun.includes(g.testId)) {
        selectiveTestsToRun.push(g.testId);
      }
    });
  }

  const testsPassedCount = GUARANTEES.filter((g) => testResults[g.testId]?.status === 'PASS').length;

  return (
    <div
      data-theme={theme}
      className={`min-h-screen ${
        theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#090d16] text-slate-100'
      } flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200 transition-colors duration-150`}
    >
      {/* Executive Status Header */}
      <StatusBanner
        state={assuranceState}
        currentFingerprint={currentFingerprint}
        verifiedFingerprint={verifiedFingerprint}
        affectedGuarantees={Array.from(staleGuarantees)}
        totalEventsCount={evidenceEvents.length}
        lastRunDurationMs={lastRunDurationMs}
        testsPassedCount={testsPassedCount}
        totalTestsCount={GUARANTEES.length}
        chainValidStatus={verificationReport ? verificationReport.status : 'VALID'}
        decoupledSnapshot={decoupledSnapshot}
        metrics={metrics}
        onRunFullVerification={handleRunFullVerification}
        onRunSelectiveRetest={handleRunSelectiveRetest}
        isRunning={isRunning}
        selectiveTestsCount={selectiveTestsToRun.length}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Subnav / Dashboard Tabs */}
      <div className="border-b border-slate-800 bg-[#0a0f1c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between overflow-x-auto">
          <nav className="flex space-x-1 py-2 text-xs font-medium">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Full Workbench
            </button>
            <button
              onClick={() => setActiveTab('guarantees')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeTab === 'guarantees'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Guarantees Matrix (G1–G5)
            </button>
            <button
              onClick={() => setActiveTab('mutations')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeTab === 'mutations'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Drift & Mutation Lab
            </button>
            <button
              onClick={() => setActiveTab('gate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeTab === 'gate'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Policy Gate Arbiter
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeTab === 'audit'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Audit Hash Chain
            </button>
            <button
              onClick={() => setActiveTab('benchmarks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeTab === 'benchmarks'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Benchmarks & Demo (5-Min)
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 w-full space-y-6 flex-1">
        {/* Benchmarks & 5-Minute Demo Script Walkthrough */}
        {(activeTab === 'all' || activeTab === 'benchmarks') && (
          <BenchmarkPanel
            metrics={metrics}
            assuranceState={assuranceState}
            onRunFullVerification={handleRunFullVerification}
            onRunSelectiveRetest={handleRunSelectiveRetest}
            onApplyMutation={handleApplyMutation}
            onVerifyLedger={handleVerifyEvidence}
            onSimulateTamper={handleSimulateTampering}
            onSimulateDrop={handleSimulateMissingEvent}
            onRequestGate={handleRequestEvaluation}
            isRunning={isRunning}
          />
        )}

        {/* Probing Progress & Execution controls */}
        {(activeTab === 'all' || activeTab === 'guarantees') && (
          <RunControls
            isRunning={isRunning}
            currentRunningTest={currentRunningTest}
            testsToRunCount={GUARANTEES.length}
            selectiveTests={selectiveTestsToRun}
            onRunFullVerification={handleRunFullVerification}
            onRunSelectiveRetest={handleRunSelectiveRetest}
            progressPercent={progressPercent}
            probeTrialProgress={probeTrialProgress}
          />
        )}

        {/* Guarantees Matrix */}
        {(activeTab === 'all' || activeTab === 'guarantees') && (
          <GuaranteesTable
            guarantees={GUARANTEES}
            testResults={testResults}
            staleGuarantees={staleGuarantees}
            isRunning={isRunning}
            onRunSingleTest={handleRunSingleTest}
          />
        )}

        {/* Mutation Lab & Topologies */}
        {(activeTab === 'all' || activeTab === 'mutations') && (
          <MutationLab
            config={config}
            baselineConfig={BASELINE_CONFIG}
            onApplyMutation={handleApplyMutation}
            isRunning={isRunning}
            affectedGuarantees={Array.from(staleGuarantees)}
          />
        )}

        {/* Fail-Closed Policy Gate */}
        {(activeTab === 'all' || activeTab === 'gate' || activeTab === 'guarantees') && (
          <FailClosedGate
            state={assuranceState}
            currentFingerprint={currentFingerprint}
            decoupledSnapshot={decoupledSnapshot}
            onRequestEvaluation={handleRequestEvaluation}
          />
        )}

        {/* Cryptographic Audit Ledger */}
        {(activeTab === 'all' || activeTab === 'audit') && (
          <EvidenceLogTable
            events={evidenceEvents}
            verificationReport={verificationReport}
            onVerifyEvidence={handleVerifyEvidence}
            onSimulateTampering={handleSimulateTampering}
            onSimulateMissingEvent={handleSimulateMissingEvent}
            onResetLog={handleResetLog}
            onImportLedger={handleImportLedger}
            isVerifying={isVerifying}
          />
        )}

        {/* Limits and Non-Claims (Folded into Evidence / Audit Screen) */}
        {(activeTab === 'all' || activeTab === 'audit') && (
          <ThreatModelPanel />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070b14] py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Bayora · Adversarial AI Infrastructure Security Verification</span>
          <span>Continuous Verification Engine · Version 1.4</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
