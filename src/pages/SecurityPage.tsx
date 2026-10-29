import React, { useState } from 'react';
import {
  ShieldCheck,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  X,
  Lock
} from 'lucide-react';
import type { Policy, SecurityEvent, PageId } from '../types';
import { updatePolicy } from '../services/api';

interface SecurityPageProps {
  policies: Policy[];
  events: SecurityEvent[];
  onRefreshData: () => Promise<void>;
  onNavigate: (page: PageId) => void;
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

  const activeCount = policies.filter((p) => p.is_enabled === 1).length;

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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Security Governance & Guardrails
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure defensive policies, guardrail thresholds, and review live security enforcement events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{activeCount} of {policies.length} Policies Enforcing</span>
          </span>
        </div>
      </div>

      {/* Security Posture Cards */}
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
            <div className="text-xl font-extrabold text-slate-900 font-mono">1,842 Blocked</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Zero Secret Leaks</div>
          </div>
        </div>

        <div className="bayora-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400">Warning Incidents</div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">316 Monitored</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Toxicity & Drift Audit</div>
          </div>
        </div>
      </div>

      {/* Policy Management Table */}
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

      {/* Live Security Monitoring Log */}
      <div className="bayora-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Security Events Log</h2>
            <p className="text-xs text-slate-500">Live stream of policy checks and intercepted adversarial attempts</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        <div className="space-y-2">
          {events.map((evt) => (
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
          ))}
        </div>
      </div>

      {/* Edit Policy Drawer Modal */}
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
