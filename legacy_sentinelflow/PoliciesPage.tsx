import React, { useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import type { Policy } from '../types';
import { updatePolicy } from '../services/api';

interface PoliciesPageProps {
  policies: Policy[];
  policyFingerprint: string;
  onRefreshPolicies: () => Promise<void>;
}

export const PoliciesPage: React.FC<PoliciesPageProps> = ({
  policies,
  policyFingerprint,
  onRefreshPolicies,
}) => {
  const [copied, setCopied] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    policy: Policy | null;
    targetState: boolean;
  }>({
    isOpen: false,
    policy: null,
    targetState: false,
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleCopyFingerprint = () => {
    if (policyFingerprint) {
      navigator.clipboard.writeText(policyFingerprint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleClick = (policy: Policy) => {
    // If disabling a policy, prompt confirmation modal because it weakens security
    if (policy.is_enabled) {
      setConfirmModal({
        isOpen: true,
        policy,
        targetState: false,
      });
    } else {
      // Re-enabling policy is safe, execute directly
      executeToggle(policy.id, true);
    }
  };

  const executeToggle = async (policyId: string, newState: boolean) => {
    setUpdatingId(policyId);
    try {
      await updatePolicy(policyId, newState);
      await onRefreshPolicies();
    } catch (err: any) {
      alert(`Policy update failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
      setConfirmModal({ isOpen: false, policy: null, targetState: false });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Policy Security Header */}
      <div className="p-6 rounded-xl bg-[#0f1422] border border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[11px] font-mono font-semibold">
              DETERMINISTIC RULESET
            </span>
            <span className="text-slate-400 text-xs font-mono">v1.0.0</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight font-sans">
            Gateway Policy Governance
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">
            Policies define the strict boundaries within which autonomous models are authorized to invoke tools.
            Modifications recalculate the cryptographic configuration fingerprint and write to the audit ledger.
          </p>
        </div>

        {/* Live Policy Fingerprint Display */}
        <div className="p-3.5 rounded-lg bg-[#0a0d16] border border-slate-800/80 shrink-0 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Config Fingerprint (SHA-256):</span>
            <button
              onClick={handleCopyFingerprint}
              className="text-slate-400 hover:text-white p-0.5 transition"
              title="Copy Fingerprint"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-sky-300 font-semibold truncate max-w-xs" title={policyFingerprint}>
            {policyFingerprint || 'Calculating...'}
          </div>
        </div>
      </div>

      {/* 5 Core Policy Cards */}
      <div className="grid grid-cols-1 gap-4">
        {policies.map((policy) => {
          const isUpdating = updatingId === policy.id;
          return (
            <div
              key={policy.id}
              className={`p-5 rounded-xl border transition shadow-xs ${
                policy.is_enabled
                  ? 'bg-[#0f1422] border-slate-800 hover:border-slate-700'
                  : 'bg-[#0a0d16]/70 border-slate-800/60 opacity-75'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {policy.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        policy.effect === 'ALLOW'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {policy.effect}
                    </span>
                    <h3 className="text-sm font-semibold text-white font-sans">{policy.name}</h3>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {policy.description}
                  </p>

                  {/* Rule Parameters Summary */}
                  <div className="pt-2 flex items-center gap-4 text-[11px] font-mono text-slate-400 flex-wrap">
                    <div>
                      <span className="text-slate-500">Target Tool: </span>
                      <span className="text-sky-300 font-semibold">{policy.tool}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Version: </span>
                      <span className="text-slate-300">{policy.version}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Scope: </span>
                      <span className="text-slate-300 truncate">
                        {JSON.stringify(policy.rule_config).slice(0, 60)}...
                      </span>
                    </div>
                  </div>
                </div>

                {/* Enable/Disable Toggle Switch */}
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <span
                    className={`text-xs font-mono font-semibold ${
                      policy.is_enabled ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {policy.is_enabled ? 'ENFORCED' : 'DISABLED'}
                  </span>
                  <button
                    onClick={() => handleToggleClick(policy)}
                    disabled={isUpdating}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer disabled:opacity-50 ${
                      policy.is_enabled ? 'bg-sky-500 justify-end' : 'bg-slate-700 justify-start'
                    }`}
                    aria-label={`Toggle ${policy.id}`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal when Disabling Policy (Weakening Protection) */}
      {confirmModal.isOpen && confirmModal.policy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#0f1422] border border-amber-500/40 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2 rounded-lg bg-amber-500/15">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Weaken Security Boundary?</h3>
                <p className="text-xs text-slate-400 font-mono">Policy ID: {confirmModal.policy.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Disabling <strong className="text-white">{confirmModal.policy.name}</strong> will remove
              this zero-trust restriction from the SentinelFlow gateway. The policy configuration fingerprint
              will be recalculated and an immutable administrative event will be written to the audit ledger.
            </p>

            <div className="p-3 rounded-lg bg-[#080d18] border border-slate-800 text-[11px] font-mono text-slate-400">
              <span className="text-rose-400 font-semibold block mb-1">Potential Risk:</span>
              <span>Autonomous models may attempt unauthorized operations on previously quarantined resources.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ isOpen: false, policy: null, targetState: false })}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => executeToggle(confirmModal.policy!.id, false)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold tracking-wide transition cursor-pointer shadow-lg shadow-rose-600/25"
              >
                Confirm Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
