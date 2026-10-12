import { useState } from 'react';
import {
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Terminal,
  Zap,
} from 'lucide-react';
import type { AssuranceState, GateEvaluationResult } from '../types';

interface FailClosedGateProps {
  state: AssuranceState;
  currentFingerprint: string;
  onRequestEvaluation: () => GateEvaluationResult;
}

export const FailClosedGate: React.FC<FailClosedGateProps> = ({
  state,
  currentFingerprint,
  onRequestEvaluation,
}) => {
  const [evaluationResult, setEvaluationResult] = useState<GateEvaluationResult | null>(null);

  const handleRequest = () => {
    const res = onRequestEvaluation();
    setEvaluationResult(res);
  };

  return (
    <div className="bg-[#0e1320] rounded-lg border border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1a]">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Evaluation Policy Gate (Fail-Closed Zero Trust Arbiter)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Default-deny access enforcement. Adversarial evaluation harness execution is strictly blocked unless the sandbox is cryptographically verified.
          </p>
        </div>

        <button
          onClick={handleRequest}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm"
        >
          <Terminal className="w-3.5 h-3.5" />
          Request Evaluation Access
        </button>
      </div>

      <div className="p-4">
        {!evaluationResult ? (
          <div className="p-6 rounded-md bg-[#090d16] border border-slate-800 text-center text-xs font-sans text-slate-400 flex flex-col items-center justify-center gap-2">
            <Lock className="w-6 h-6 text-slate-600" />
            <p>
              Click <strong className="text-slate-200">"Request Evaluation Access"</strong> to test policy gate enforcement against current state.
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Current state: <span className="text-slate-300 font-semibold">{state}</span> · Fingerprint:{' '}
              <span>{currentFingerprint.slice(0, 12)}...</span>
            </p>
          </div>
        ) : evaluationResult.decision === 'GRANTED' ? (
          /* GRANTED Attestation Certificate */
          <div className="p-4 rounded-md bg-[#081711] border border-emerald-500/30 text-emerald-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                  <Unlock className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                    Access Granted (Policy Verdict: ALLOW)
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Adversarial Red-Teaming Harness Authorized
                  </div>
                </div>
              </div>

              <div className="font-mono text-right text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                  {evaluationResult.ticketId}
                </span>
                <div className="text-[10px] text-emerald-400/70 mt-1">
                  Attested: {new Date(evaluationResult.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#050e0a] p-3 rounded border border-emerald-500/20 space-y-1.5 font-mono text-[11px]">
                <div className="text-slate-400">Cryptographic Attestation:</div>
                <div className="text-emerald-300">
                  State: <strong>VERIFIED</strong>
                </div>
                <div className="text-emerald-300 truncate">
                  Fingerprint: {evaluationResult.currentFingerprint}
                </div>
                <div className="text-emerald-300">
                  Ledger Status: <strong>VALID (Tamper-Free)</strong>
                </div>
              </div>

              <div className="bg-[#050e0a] p-3 rounded border border-emerald-500/20 text-slate-300 text-xs flex flex-col justify-center">
                <div className="font-medium text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Isolation Boundaries Certified
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Sandbox parameters strictly match baseline. Filesystem, network, and gateway session isolation guarantees hold.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* DENIED Policy Rejection Card */
          <div className="p-4 rounded-md bg-[#160a0f] border border-rose-500/40 text-rose-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-rose-500/10 border border-rose-500/30">
                  <Lock className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                    Access Denied (Policy Verdict: DENY · Fail-Closed)
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Evaluation Harness Execution Blocked
                  </div>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-[11px] font-semibold">
                POLICY STATE: {state}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-mono text-rose-300 font-semibold">
                Enforcement Rationales:
              </div>
              <ul className="space-y-1 text-xs">
                {evaluationResult.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-rose-200 bg-[#0c0508] p-2 rounded border border-rose-950">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {evaluationResult.requiredTests.length > 0 && (
              <div className="bg-[#0c0508] p-2.5 rounded border border-rose-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-mono text-amber-300 flex items-center gap-1.5 text-[11px]">
                  <Zap className="w-3.5 h-3.5" />
                  Required Remedial Probes: [{evaluationResult.requiredTests.join(', ')}]
                </div>
                <span className="text-[11px] text-slate-400">
                  Execute retest suite above to restore verification.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
