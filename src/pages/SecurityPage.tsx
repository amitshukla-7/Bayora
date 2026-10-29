import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  X,
  Lock,
  Terminal,
  Activity,
  Play,
  RefreshCw,
  Server,
  AlertOctagon,
  Info,
  Database,
  Network,
  Cpu
} from 'lucide-react';
import type {
  Policy,
  SecurityEvent,
  PageId,
  ProbeRunResult,
  ProbeTestResult,
  LabStatus,
  LabMutationResult
} from '../types';
import {
  updatePolicy,
  runIsolationProbes,
  fetchLabStatus,
  applyLabMutation
} from '../services/api';

interface SecurityPageProps {
  policies: Policy[];
  events: SecurityEvent[];
  onRefreshData: () => Promise<void>;
  onNavigate?: (page: PageId) => void;
}

export const SecurityPage: React.FC<SecurityPageProps> = ({
  policies,
  events,
  onRefreshData,
}) => {
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editRulesJson, setEditRulesJson] = useState('');
  const [editError, setEditError] = useState('');

  // Isolation Probes State
  const [probeResult, setProbeResult] = useState<ProbeRunResult | null>(null);
  const [isRunningProbes, setIsRunningProbes] = useState(false);
  const [selectedProbeEvidence, setSelectedProbeEvidence] = useState<ProbeTestResult | null>(null);

  // Mutation Lab State
  const [labStatus, setLabStatus] = useState<LabStatus | null>(null);
  const [activeMutationId, setActiveMutationId] = useState<string | null>(null);
  const [mutationFeedback, setMutationFeedback] = useState<LabMutationResult | null>(null);
  const [isApplyingMutation, setIsApplyingMutation] = useState(false);

  // Load Lab Status and initial probe run
  useEffect(() => {
    fetchLabStatus()
      .then((status) => setLabStatus(status))
      .catch(() => setLabStatus({ labModeEnabled: false, dockerAvailable: false }));
  }, []);

  const activeCount = policies.filter((p) => p.is_enabled === 1).length;
  const blockedCount = events.filter((e) => e.blocked === 1 || (e.blocked as any) === true).length;
  const warningCount = events.filter((e) => e.blocked === 0 || (e.blocked as any) === false).length;

  const handleTogglePolicy = async (policy: Policy) => {
    setUpdatingId(policy.id);
    try {
      await updatePolicy(policy.id, {
        is_enabled: policy.is_enabled === 1 ? 0 : 1,
      });
      await onRefreshData();
    } catch (err: any) {
      alert(`Policy update failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartEdit = (p: Policy) => {
    setEditingPolicy(p);
    setEditRulesJson(typeof p.rules === 'string' ? p.rules : JSON.stringify(p.rules, null, 2));
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    try {
      JSON.parse(editRulesJson); // Validate JSON
      await updatePolicy(editingPolicy.id, {
        name: editingPolicy.name,
        description: editingPolicy.description,
        severity: editingPolicy.severity,
        rules: editRulesJson
      });
      await onRefreshData();
      setEditingPolicy(null);
    } catch (err: any) {
      setEditError(err.message || 'Invalid JSON format in rules configuration.');
    }
  };

  const handleRunProbes = async () => {
    setIsRunningProbes(true);
    try {
      const result = await runIsolationProbes();
      setProbeResult(result);
    } catch (err: any) {
      alert(`Failed to execute isolation probes: ${err.message}`);
    } finally {
      setIsRunningProbes(false);
    }
  };

  const handleApplyMutation = async (id: string) => {
    setIsApplyingMutation(true);
    setActiveMutationId(id);
    try {
      const result = await applyLabMutation(id);
      setMutationFeedback(result);
      // Auto re-run probes to reflect mutated or remediated state
      const updatedProbes = await runIsolationProbes();
      setProbeResult(updatedProbes);
    } catch (err: any) {
      setMutationFeedback({
        mutationId: id,
        name: id,
        executed: false,
        status: 'ERROR',
        error: err.message
      });
    } finally {
      setIsApplyingMutation(false);
      setActiveMutationId(null);
    }
  };

  // Default probes catalog (G1-G5 / T01-T05)
  const probeCatalog = [
    {
      probeId: 'T01',
      guaranteeId: 'G1',
      name: 'Filesystem Boundary Check',
      target: 'Storage Isolation (Red Container)',
      description: 'Asserts adversary container has zero unauthorized bind mounts to host root or blue evaluation volume.',
      icon: Database
    },
    {
      probeId: 'T02',
      guaranteeId: 'G2',
      name: 'Network Boundary Scan',
      target: 'Network Isolation (L2/L3 Bridge)',
      description: 'Scans network egress to confirm complete microsegmentation between red runner and blue control planes.',
      icon: Network
    },
    {
      probeId: 'T03',
      guaranteeId: 'G3',
      name: 'Storage API Scope Assertion',
      target: 'API Authorization (MinIO / Storage Proxy)',
      description: 'Probes storage gateway endpoints to verify strict cryptographic token scope enforcement and prevent anonymous data access.',
      icon: Server
    },
    {
      probeId: 'T04',
      guaranteeId: 'G4',
      name: 'Canary Token Leak Test',
      target: 'Model Session Confidentiality (Gateway KV Cache)',
      description: 'Injects high-entropy canary tokens into private evaluation sessions and asserts 0 ppm retrieval from adversarial test prompts.',
      icon: Cpu
    },
    {
      probeId: 'T05',
      guaranteeId: 'G5',
      name: 'Container Security Context Check',
      target: 'Workload Hardening (Linux Capabilities & Seccomp)',
      description: 'Validates immutable root filesystem (readOnlyRoot), no-new-privileges, seccomp filters, and dropped Linux capabilities.',
      icon: Lock
    }
  ];

  const mutationCatalog = [
    {
      id: 'M1',
      code: 'M1: Kill Model Gateway',
      targetProbe: 'T04 / Gateway',
      description: 'Stops model-gateway container to test fail-closed behavior on unreachable inference proxy.'
    },
    {
      id: 'M2',
      code: 'M2: Network Partition',
      targetProbe: 'T02 / Network',
      description: 'Disconnects blue container from bridge network to simulate inter-service network partition.'
    },
    {
      id: 'M3',
      code: 'M3: Drop Storage Access',
      targetProbe: 'T03 / Storage',
      description: 'Stops object storage container to verify fail-closed authorization on storage unavailability.'
    },
    {
      id: 'M4',
      code: 'M4: Shared Gateway Cache',
      targetProbe: 'T04 / Canary',
      description: 'Forces gateway proxy into shared KV context cache mode to test canary bleed detection.'
    },
    {
      id: 'M5',
      code: 'M5: Relax Hardening',
      targetProbe: 'T05 / Workload',
      description: 'Simulates container configuration drift with writable root and excess capabilities.'
    },
    {
      id: 'B1',
      code: 'B1: Benign Label Drift',
      targetProbe: 'Negative Control',
      description: 'Modifies benign operator metadata labels without altering security posture (stays VERIFIED).'
    },
    {
      id: 'REMEDIATE',
      code: 'Remediate to Baseline',
      targetProbe: 'All Guarantees',
      description: 'Restores all container mounts, networks, authz modes, and hardening flags to certified baseline.'
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Security Governance & Guardrails
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure defensive policies, verify runtime isolation probes, and test boundary resilience in the mutation lab.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{activeCount} of {policies.length} Policies Enforcing</span>
          </span>
        </div>
      </div>

      {/* Security Posture Cards (Pure Live SQL Aggregates) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bayora-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#9B7DE8] to-[#C4B5FD] flex items-center justify-center text-white shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400">Security Posture</div>
            <div className="text-xl font-extrabold text-slate-900">Enforcing Gate</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Fail-Closed Boundary</div>
          </div>
        </div>

        <div className="bayora-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400">Total Interceptions</div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              {blockedCount > 0 ? `${blockedCount} Blocked` : '0 Blocked'}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Live SQL Event Counter</div>
          </div>
        </div>

        <div className="bayora-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400">Warning Incidents</div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              {warningCount > 0 ? `${warningCount} Monitored` : '0 Monitored'}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Toxicity & Drift Audit</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: ISOLATION PROBES (T01 - T05) */}
      <div className="bayora-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#8762E0]" />
              <h2 className="text-base font-bold text-slate-900">
                Isolation Assurance Probes (T01–T05)
              </h2>
              {probeResult && (
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    probeResult.overallStatus === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : probeResult.overallStatus === 'BREACHED'
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-amber-100 text-amber-700 border border-amber-300'
                  }`}
                >
                  State: {probeResult.overallStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active container isolation checks verifying filesystem, network, storage authorization, canary context isolation, and workload hardening.
            </p>
          </div>

          <button
            onClick={handleRunProbes}
            disabled={isRunningProbes}
            className="bayora-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningProbes ? 'animate-spin' : ''}`} />
            <span>{isRunningProbes ? 'Executing Probes...' : 'Run Probes (T01–T05)'}</span>
          </button>
        </div>

        {/* Probes Status Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {probeCatalog.map((item) => {
            const result = probeResult?.results.find((r) => r.probeId === item.probeId);
            const status = result?.status || 'UNVERIFIED';
            const Icon = item.icon;

            return (
              <div
                key={item.probeId}
                onClick={() => {
                  if (result) setSelectedProbeEvidence(result);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  result
                    ? 'hover:shadow-md hover:border-[#9B7DE8]'
                    : 'opacity-80'
                } ${
                  status === 'PASS'
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : status === 'FAIL'
                    ? 'bg-red-50/40 border-red-200'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800">
                      {item.probeId}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {item.guaranteeId}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      status === 'PASS'
                        ? 'bg-emerald-100 text-emerald-700'
                        : status === 'FAIL'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                  <Icon className="w-3.5 h-3.5 text-[#8762E0]" />
                  <span>{item.name}</span>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 text-[10px] text-slate-400">
                  <span>Latency: <strong className="font-mono text-slate-600">{result?.latencyMs !== undefined ? `${result.latencyMs}ms` : 'N/A'}</strong></span>
                  <span className="text-[#8762E0] font-semibold hover:underline flex items-center gap-1">
                    <Terminal className="w-2.5 h-2.5" /> Inspect Evidence
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Probe Execution Details Footnote */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[#8762E0]" />
            <span>
              {probeResult
                ? `Last evaluated: ${new Date(probeResult.timestamp).toLocaleTimeString()} · Score: ${probeResult.score}% · Docker Environment: ${probeResult.dockerAvailable ? 'Online' : 'Host daemon offline (fail-closed)'}`
                : 'Probes not yet executed in current session. Click "Run Probes" to measure live boundary integrity.'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: ADVERSARIAL MUTATION LAB (M1 - M5, B1) */}
      <div className="bayora-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                Adversarial Mutation Lab (M1–M5, B1)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Inject controlled faults to verify probe detection sensitivity and prove state machine recovery transitions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono px-2.5 py-1 rounded-xl border ${
                labStatus?.dockerAvailable && labStatus?.labModeEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {labStatus?.dockerAvailable && labStatus?.labModeEnabled
                ? 'LAB MODE ACTIVE'
                : 'REQUIRES DOCKER LAB (docker-compose.yml)'}
            </span>
          </div>
        </div>

        {/* Notice Banner if Docker is Unavailable */}
        {(!labStatus?.dockerAvailable || !labStatus?.labModeEnabled) && (
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-800 text-xs flex items-center gap-3">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="leading-relaxed">
              Mutation Lab controls require a running Docker lab environment (<code>docker compose up -d</code>) and <code>BAYORA_LAB_MODE=1</code>.
              When running without Docker, container fault injections are safely disabled to preserve platform integrity.
            </div>
          </div>
        )}

        {/* Mutation Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mutationCatalog.map((mut) => {
            const isRemediate = mut.id === 'REMEDIATE';
            const isNegative = mut.id === 'B1';
            const isRunning = isApplyingMutation && activeMutationId === mut.id;
            const isDisabled = (!labStatus?.dockerAvailable || !labStatus?.labModeEnabled) && !isRemediate;

            return (
              <div
                key={mut.id}
                className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{mut.code}</span>
                    <span className="text-[10px] font-mono text-slate-400">{mut.targetProbe}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                    {mut.description}
                  </p>
                </div>

                <button
                  onClick={() => handleApplyMutation(mut.id)}
                  disabled={isDisabled || isApplyingMutation}
                  className={`w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed ${
                    isRemediate
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : isNegative
                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                  } disabled:opacity-50`}
                >
                  <Play className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
                  <span>{isRunning ? 'Injecting Fault...' : isRemediate ? 'Remediate Baseline' : `Inject ${mut.id}`}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Mutation Execution Feedback */}
        {mutationFeedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border ${
              mutationFeedback.executed
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase font-mono">[{mutationFeedback.mutationId}]</span>
              <span>{mutationFeedback.details || mutationFeedback.error || mutationFeedback.status}</span>
            </div>
            <button
              onClick={() => setMutationFeedback(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* SECTION 3: ACTIVE DEFENSIVE POLICIES TABLE */}
      <div className="bayora-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Active Defensive Policies</h2>
            <p className="text-xs text-slate-500">
              Deterministic rules directly consumed by the Red Team evaluation engine
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#8762E0] bg-[#f4efff] px-2.5 py-1 rounded-xl">
            Live Synchronized
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {policies.map((policy) => {
            const isEnabled = policy.is_enabled === 1;
            const isUpdating = updatingId === policy.id;
            return (
              <div
                key={policy.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 p-3 rounded-2xl transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {policy.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{policy.name}</h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        policy.severity === 'Critical'
                          ? 'bg-red-50 text-red-600'
                          : policy.severity === 'High'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {policy.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {policy.description}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span>Category: <strong className="text-slate-600 font-medium">{policy.category}</strong></span>
                    <span>·</span>
                    <span>Version: <strong className="text-slate-600 font-mono">{policy.version}</strong></span>
                  </div>
                </div>

                {/* Right Action Controls: Toggle Switch & Edit Button */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleStartEdit(policy)}
                    className="p-2 rounded-xl text-slate-400 hover:text-[#7952D8] hover:bg-[#f4efff] border border-slate-200 transition-colors cursor-pointer"
                    title="Edit Rule Configuration"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold font-mono ${isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {isEnabled ? 'ACTIVE' : 'DISABLED'}
                    </span>
                    <button
                      onClick={() => handleTogglePolicy(policy)}
                      disabled={isUpdating}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: LIVE SECURITY MONITORING LOG */}
      <div className="bayora-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Security Events Log</h2>
            <p className="text-xs text-slate-500">Live stream of policy checks and intercepted adversarial attempts</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              No security events recorded yet in current audit log.
            </div>
          ) : (
            events.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      evt.severity === 'Critical' ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <span>{evt.description}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-500 border border-slate-200">
                        {evt.target}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-normal">
                      {evt.category} · {new Date(evt.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    evt.blocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {evt.blocked ? 'Interception Blocked' : 'Logged Warning'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL 1: RAW EVIDENCE INSPECTOR (T01 - T05) */}
      {selectedProbeEvidence && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-[#8762E0]" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Probe Evidence: {selectedProbeEvidence.probeId} ({selectedProbeEvidence.name})
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Deterministic Runtime Evidence Artifact · Latency: {selectedProbeEvidence.latencyMs}ms
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedProbeEvidence(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
              {/* Status Header */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-700">Evaluation Outcome:</span>
                <span
                  className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
                    selectedProbeEvidence.status === 'PASS'
                      ? 'bg-emerald-100 text-emerald-700'
                      : selectedProbeEvidence.status === 'FAIL'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {selectedProbeEvidence.status}
                </span>
              </div>

              {/* Exact Command */}
              {selectedProbeEvidence.evidence?.command && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-600 uppercase text-[10px]">
                    Executed Command / Assertion:
                  </span>
                  <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] break-all">
                    $ {selectedProbeEvidence.evidence.command}
                  </div>
                </div>
              )}

              {/* Exit Code & Process Info */}
              {(selectedProbeEvidence.evidence?.exitCode !== undefined || selectedProbeEvidence.evidence?.errno !== undefined) && (
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 uppercase text-[9px] block font-sans font-semibold">Exit Code</span>
                    <span className="font-bold text-slate-800">{selectedProbeEvidence.evidence.exitCode ?? 'N/A'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 uppercase text-[9px] block font-sans font-semibold">Errno / Return</span>
                    <span className="font-bold text-slate-800">{selectedProbeEvidence.evidence.errno ?? '0'}</span>
                  </div>
                </div>
              )}

              {/* Standard Output / Raw Evidence */}
              {selectedProbeEvidence.evidence?.stdout && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-600 uppercase text-[10px]">
                    Standard Output (stdout):
                  </span>
                  <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-40">
                    {selectedProbeEvidence.evidence.stdout}
                  </pre>
                </div>
              )}

              {/* Standard Error */}
              {selectedProbeEvidence.evidence?.stderr && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-600 uppercase text-[10px]">
                    Standard Error (stderr):
                  </span>
                  <pre className="p-3 rounded-xl bg-slate-900 text-rose-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-40">
                    {selectedProbeEvidence.evidence.stderr}
                  </pre>
                </div>
              )}

              {/* Error Details */}
              {selectedProbeEvidence.evidence?.error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <strong>Probe Error:</strong> {selectedProbeEvidence.evidence.error}
                </div>
              )}

              {/* Complete JSON Inspection */}
              <div className="space-y-1">
                <span className="font-semibold text-slate-600 uppercase text-[10px]">
                  Raw Evidence JSON Payload:
                </span>
                <pre className="p-3 rounded-xl bg-slate-100 text-slate-800 font-mono text-[10px] overflow-x-auto max-h-48 border border-slate-200">
                  {JSON.stringify(selectedProbeEvidence.evidence, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedProbeEvidence(null)}
                className="bayora-btn-primary px-5 py-2 text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT POLICY MODAL */}
      {editingPolicy && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#8762E0]" />
                <span>Edit Guardrail: {editingPolicy.id}</span>
              </h3>
              <button
                onClick={() => setEditingPolicy(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs">{editError}</div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Policy Name</label>
                <input
                  type="text"
                  value={editingPolicy.name}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-hidden focus:border-[#9B7DE8]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={editingPolicy.description}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-hidden focus:border-[#9B7DE8]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Rule Parameters (JSON)</label>
                <textarea
                  rows={4}
                  value={editRulesJson}
                  onChange={(e) => setEditRulesJson(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] outline-hidden focus:border-[#9B7DE8]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bayora-btn-primary px-5 py-2 font-semibold cursor-pointer"
                >
                  Save Guardrail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
