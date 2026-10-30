import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sliders,
  AlertTriangle,
  Edit2,
  X,
  RefreshCw,
  AlertOctagon,
  History,
  ArrowRight
} from 'lucide-react';
import type {
  Policy,
  PolicyMode,
  PolicyHistoryItem,
  CriticalStatusResponse,
  SecurityEvent,
  PageId
} from '../types';
import {
  updatePolicy,
  fetchPolicyHistory,
  fetchCriticalStatus
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

  // Critical status & disable modal
  const [criticalStatus, setCriticalStatus] = useState<CriticalStatusResponse | null>(null);
  const [disableModalPolicy, setDisableModalPolicy] = useState<Policy | null>(null);
  const [disableReason, setDisableReason] = useState('');
  const [disableError, setDisableError] = useState('');
  const [isSubmittingDisable, setIsSubmittingDisable] = useState(false);

  // Policy history modal
  const [historyModalPolicy, setHistoryModalPolicy] = useState<Policy | null>(null);
  const [policyHistory, setPolicyHistory] = useState<PolicyHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadCriticalStatus = async () => {
    try {
      const status = await fetchCriticalStatus();
      setCriticalStatus(status);
    } catch {
      // Fail silently on status polling
    }
  };

  useEffect(() => {
    loadCriticalStatus();
  }, []);

  const activeCount = policies.filter((p) => (p.mode ? p.mode !== 'OFF' : p.is_enabled === 1)).length;
  const blockedCount = events.filter((e) => e.blocked === 1 || (e.blocked as any) === true).length;
  const warningCount = events.filter((e) => e.blocked === 0 || (e.blocked as any) === false).length;

  const handleModeChange = async (policy: Policy, targetMode: PolicyMode) => {
    const isCritical = policy.id === 'POL-001' || policy.id === 'POL-002';

    if (targetMode === 'OFF' && isCritical) {
      setDisableModalPolicy(policy);
      setDisableReason('');
      setDisableError('');
      return;
    }

    setUpdatingId(policy.id);
    try {
      await updatePolicy(policy.id, {
        mode: targetMode,
        actor: 'security_operator'
      });
      await onRefreshData();
      await loadCriticalStatus();
    } catch (err: any) {
      alert(`Policy update failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmDisable = async () => {
    if (!disableModalPolicy) return;
    if (!disableReason.trim() || disableReason.trim().length < 5) {
      setDisableError('A valid operational justification (minimum 5 characters) is required.');
      return;
    }

    setIsSubmittingDisable(true);
    setDisableError('');
    try {
      await updatePolicy(disableModalPolicy.id, {
        mode: 'OFF',
        reason: disableReason.trim(),
        actor: 'security_operator'
      });
      setDisableModalPolicy(null);
      await onRefreshData();
      await loadCriticalStatus();
    } catch (err: any) {
      setDisableError(err.message || 'Failed to update policy mode.');
    } finally {
      setIsSubmittingDisable(false);
    }
  };

  const handleOpenHistory = async (policy: Policy) => {
    setHistoryModalPolicy(policy);
    setIsLoadingHistory(true);
    try {
      const res = await fetchPolicyHistory(policy.id);
      setPolicyHistory(res.history || []);
    } catch (err: any) {
      alert(`Failed to load policy history: ${err.message}`);
      setPolicyHistory([]);
    } finally {
      setIsLoadingHistory(false);
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Security Governance & Policy Control
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage deterministic guardrails, enforcement modes, threshold parameters, and real-time perimeter events.
        </p>
      </div>

      {/* Critical Status Banner */}
      {criticalStatus && criticalStatus.anyDisabled && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-900">
                Critical Policy Warning: Enforcement Degraded
              </div>
              <div className="text-[11px] text-amber-700 mt-0.5">
                {criticalStatus.disabled.length} critical security guardrail(s) currently set to OFF (
                {criticalStatus.disabled.map((p) => p.policyId).join(', ')}). Containment boundaries are relaxed.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Level Governance Metrics */}
      <div className="bayora-card p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400">Enforced Guardrails</div>
            <div className="text-xl font-extrabold text-[#7952D8] font-mono">
              {activeCount} / {policies.length} Active
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Strict Fail-Closed</div>
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400">Monitored Policies</div>
            <div className="text-xl font-extrabold text-amber-600 font-mono">
              {policies.filter((p) => p.mode === 'MONITOR').length} Monitored
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Telemetry & Auditing</div>
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400">High-Risk Interceptions</div>
            <div className="text-xl font-extrabold text-red-600 font-mono">
              {blockedCount > 0 ? `${blockedCount} Blocked` : '0 Intercepted'}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Adversarial Defense</div>
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

      {/* ACTIVE DEFENSIVE POLICIES TABLE */}
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
            const effectiveMode: PolicyMode = policy.mode || (policy.is_enabled === 1 ? 'ENFORCE' : 'OFF');
            const isUpdating = updatingId === policy.id;
            return (
              <div
                key={policy.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      effectiveMode === 'ENFORCE'
                        ? 'bg-emerald-50 text-emerald-600'
                        : effectiveMode === 'MONITOR'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800">{policy.id}</span>
                      <h3 className="font-bold text-slate-900 text-sm">{policy.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {policy.category}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          policy.severity === 'Critical'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}
                      >
                        {policy.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                      {policy.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {/* Mode Selector */}
                  <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleModeChange(policy, 'ENFORCE')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        effectiveMode === 'ENFORCE'
                          ? 'bg-white text-emerald-700 shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Enforce
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleModeChange(policy, 'MONITOR')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        effectiveMode === 'MONITOR'
                          ? 'bg-white text-amber-700 shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Monitor
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleModeChange(policy, 'OFF')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        effectiveMode === 'OFF'
                          ? 'bg-white text-slate-800 shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Off
                    </button>
                  </div>

                  {/* Version Audit History */}
                  <button
                    type="button"
                    onClick={() => handleOpenHistory(policy)}
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#8762E0] cursor-pointer"
                    title="Audit Version History"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>

                  {/* Edit Rules Button */}
                  <button
                    type="button"
                    onClick={() => handleStartEdit(policy)}
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#8762E0] cursor-pointer"
                    title="Configure Policy Parameters"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LIVE SECURITY MONITORING LOG */}
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

      {/* MODAL 3: CONFIRM CRITICAL POLICY DISABLE */}
      {disableModalPolicy && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-red-300 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-red-600 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-600" />
                <span>Disable Critical Guardrail</span>
              </h3>
              <button
                onClick={() => setDisableModalPolicy(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed">
              <p className="font-bold">⚠️ High Risk Operator Action:</p>
              <p className="mt-1">
                You are setting <span className="font-mono font-bold">{disableModalPolicy.id} ({disableModalPolicy.name})</span> to <span className="font-bold">OFF</span>.
                Adversarial evaluation cases and proxy calls will bypass {disableModalPolicy.category.toLowerCase()} containment.
                A mandatory justification reason (min 5 characters) is required for audit compliance.
              </p>
            </div>

            {disableError && (
              <div className="p-2.5 rounded-xl bg-red-100 text-red-700 text-xs font-semibold">
                {disableError}
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">
                Reason / Justification <span className="text-red-500">* (Mandatory)</span>
              </label>
              <textarea
                rows={3}
                value={disableReason}
                onChange={(e) => {
                  setDisableReason(e.target.value);
                  setDisableError('');
                }}
                placeholder="e.g., Authorized red team stress test per approved security ticket SEC-1049"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-hidden focus:border-red-400 text-slate-800"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDisableModalPolicy(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisable}
                disabled={isSubmittingDisable || disableReason.trim().length < 5}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingDisable ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>Confirm Disable (Set to OFF)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: POLICY VERSION & AUDIT HISTORY DRAWER */}
      {historyModalPolicy && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#8762E0]" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Audit Version History: {historyModalPolicy.id}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    {historyModalPolicy.name} · RFC 8785 Canonical Fingerprint Tracking
                  </div>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalPolicy(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#8762E0]" />
                  <span>Loading policy audit history from SQLite...</span>
                </div>
              ) : policyHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  No policy configuration modifications recorded yet. Current configuration matches default seed.
                </div>
              ) : (
                policyHistory.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                          {item.previous_mode}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          item.new_mode === 'ENFORCE' ? 'bg-emerald-100 text-emerald-800' :
                          item.new_mode === 'MONITOR' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-700 text-white'
                        }`}>
                          {item.new_mode}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(item.created_at).toLocaleString()} by <span className="font-semibold text-slate-700">{item.actor}</span>
                      </div>
                    </div>

                    {item.reason && (
                      <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                        <strong className="text-slate-700">Justification:</strong> {item.reason}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
                      <div className="truncate">
                        FP Before: <span className="text-slate-700 font-bold">{item.fingerprint_before.slice(0, 16)}...</span>
                      </div>
                      <div className="truncate">
                        FP After: <span className="text-slate-700 font-bold">{item.fingerprint_after.slice(0, 16)}...</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryModalPolicy(null)}
                className="bayora-btn-primary px-5 py-2 text-xs font-semibold cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
