import { useState, useEffect, useRef } from 'react';
import {
  Shield,
  SlidersHorizontal,
  Lock,
  FileCode,
  Info,
  LayoutGrid,
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

export function App() {
  // Core simulated lab state
  const [config, setConfig] = useState<SimulatedConfig>(BASELINE_CONFIG);
  const [currentFingerprint, setCurrentFingerprint] = useState<string>('');
  const [currentDigests, setCurrentDigests] = useState<GuaranteeDigestMap | null>(null);

  // Assurance State & Verification Baselines
  const [assuranceState, setAssuranceState] = useState<AssuranceState>('UNVERIFIED');
  const [verifiedFingerprint, setVerifiedFingerprint] = useState<string | null>(null);
  const [verifiedDigests, setVerifiedDigests] = useState<GuaranteeDigestMap | null>(null);
  const [staleGuarantees, setStaleGuarantees] = useState<Set<GuaranteeId>>(new Set());

  // Active Tab View
  const [activeTab, setActiveTab] = useState<'all' | 'guarantees' | 'mutations' | 'gate' | 'audit' | 'architecture'>('all');

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
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [lastRunDurationMs, setLastRunDurationMs] = useState<number | null>(null);

  // Evidence Log (Real SHA-256 Hash Chain)
  const [evidenceEvents, setEvidenceEvents] = useState<EvidenceEvent[]>([]);
  const [verificationReport, setVerificationReport] = useState<ChainVerificationReport | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Ref to track latest events for async chain appending
  const eventsRef = useRef<EvidenceEvent[]>([]);
  eventsRef.current = evidenceEvents;

  // Initialize and compute initial fingerprint on load
  useEffect(() => {
    async function initHashes() {
      const fp = await computeConfigFingerprint(BASELINE_CONFIG);
      const digests = await computeGuaranteeDigests(BASELINE_CONFIG);
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
   */
  const handleConfigChange = async (newConfig: SimulatedConfig) => {
    setConfig(newConfig);
    const newFingerprint = await computeConfigFingerprint(newConfig);
    const newDigests = await computeGuaranteeDigests(newConfig);

    setCurrentFingerprint(newFingerprint);
    setCurrentDigests(newDigests);

    // If fingerprint is unchanged (benign label change B1), do nothing to assurance state
    if (newFingerprint === currentFingerprint) {
      return;
    }

    // Determine which guarantees drifted compared to verified digests
    const affected = new Set<GuaranteeId>();
    if (verifiedDigests) {
      if (newDigests.G1 !== verifiedDigests.G1) affected.add('G1');
      if (newDigests.G2 !== verifiedDigests.G2) affected.add('G2');
      if (newDigests.G3 !== verifiedDigests.G3) affected.add('G3');
      if (newDigests.G4 !== verifiedDigests.G4) affected.add('G4');
      if (newDigests.G5 !== verifiedDigests.G5) affected.add('G5');
    } else {
      affected.add('G1');
      affected.add('G2');
      affected.add('G3');
      affected.add('G4');
      affected.add('G5');
    }

    setStaleGuarantees(affected);

    // State Transitions
    if (assuranceState === 'VERIFIED') {
      if (affected.size > 0) {
        setAssuranceState('STALE');
      }
    } else if (assuranceState === 'BREACHED') {
      setAssuranceState('RECOVERING');
    }
  };

  /**
   * Run verification suite for specific tests
   */
  const runVerificationSuite = async (testsToRun: TestId[], runType: 'full' | 'selective') => {
    if (isRunning) return;
    setIsRunning(true);
    setProgressPercent(0);
    const runStartTime = performance.now();
    const runId = `run-${Date.now().toString(36)}`;

    // Build planned events manifest
    const expectedPlan: string[] = [];
    for (const tid of testsToRun) {
      expectedPlan.push(`test.started:${tid}`);
      expectedPlan.push(`test.completed:${tid}`);
    }
    expectedPlan.push('policy.decision');
    expectedPlan.push('run.completed');

    await appendEvent(runId, 'run.started', {
      run_type: runType,
      tests_planned: testsToRun,
      expected_plan: expectedPlan,
      config_fingerprint: currentFingerprint,
    });

    const currentResultsCopy = { ...testResults };
    let hasFailure = false;

    // Sequentially execute tests with measured realistic latency
    for (let i = 0; i < testsToRun.length; i++) {
      const tid = testsToRun[i];
      const gid = TEST_TO_GUARANTEE[tid];
      setCurrentRunningTest(tid);
      setProgressPercent((i / testsToRun.length) * 100);

      await appendEvent(runId, 'test.started', {
        test_id: tid,
        guarantee_id: gid,
      });

      const res = await executeSimulatedTest(tid, config);
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
      });

      setProgressPercent(((i + 1) / testsToRun.length) * 100);
    }

    const runEndTime = performance.now();
    const totalDuration = Math.round(runEndTime - runStartTime);
    setLastRunDurationMs(totalDuration);
    setCurrentRunningTest(null);

    // Calculate new assurance state
    let nextState: AssuranceState;
    if (hasFailure) {
      nextState = 'BREACHED';
    } else {
      const allPassed = GUARANTEES.every((g) => {
        const tr = currentResultsCopy[g.testId];
        return tr && tr.status === 'PASS';
      });

      if (allPassed) {
        nextState = 'VERIFIED';
        setVerifiedFingerprint(currentFingerprint);
        setVerifiedDigests(currentDigests);
        setStaleGuarantees(new Set());
      } else {
        nextState = assuranceState === 'RECOVERING' ? 'RECOVERING' : 'STALE';
      }
    }

    setAssuranceState(nextState);

    const passedCount = GUARANTEES.filter((g) => currentResultsCopy[g.testId]?.status === 'PASS').length;
    await appendEvent(runId, 'policy.decision', {
      assurance_state: nextState,
      fingerprint: currentFingerprint,
      guarantees_passed: passedCount,
      has_failures: hasFailure,
    });

    await appendEvent(runId, 'run.completed', {
      summary: `Run ${runId} finalized with state ${nextState}`,
      total_duration_ms: totalDuration,
      tests_executed: testsToRun.length,
    });

    const report = await verifyEvidenceChain(eventsRef.current);
    setVerificationReport(report);

    setIsRunning(false);
  };

  const handleRunFullVerification = () => {
    const allTests: TestId[] = ['T01', 'T02', 'T03', 'T04', 'T05'];
    runVerificationSuite(allTests, 'full');
  };

  const handleRunSelectiveRetest = () => {
    const testsToRun: TestId[] = [];
    staleGuarantees.forEach((gid) => {
      const g = GUARANTEES.find((item) => item.id === gid);
      if (g) testsToRun.push(g.testId);
    });

    if (testsToRun.length === 0) return;
    runVerificationSuite(testsToRun, 'selective');
  };

  const handleRunSingleTest = (testId: TestId) => {
    runVerificationSuite([testId], 'selective');
  };

  const handleApplyMutation = (type: 'M1' | 'M2' | 'M3' | 'M4' | 'B1' | 'REMEDIATE') => {
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

    handleConfigChange(next);
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

    const targetIdx = list.findIndex((e) => e.event_type === 'test.completed' || e.event_type === 'policy.decision');
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
      reasons.push(`Cryptographic audit ledger validation failed: ${verificationReport.status}. Tampering or missing event detected.`);
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

  const testsPassedCount = GUARANTEES.filter((g) => testResults[g.testId]?.status === 'PASS').length;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
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
        onRunFullVerification={handleRunFullVerification}
        onRunSelectiveRetest={handleRunSelectiveRetest}
        isRunning={isRunning}
        selectiveTestsCount={selectiveTestsToRun.length}
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
              Guarantees Matrix
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
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeTab === 'architecture'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              Threat Model & Scope
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 w-full space-y-6 flex-1">
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
            isVerifying={isVerifying}
          />
        )}

        {/* Threat Model & Architectural Scope */}
        {(activeTab === 'all' || activeTab === 'architecture') && (
          <ThreatModelPanel />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070b14] py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Bayora Sentinel · Adversarial AI Infrastructure Security Verification</span>
          <span>Continuous Zero Trust Posture Engine · Enterprise v1.4</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
