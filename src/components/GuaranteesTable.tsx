import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Shield,
  Play,
  RotateCw,
  ChevronDown,
  ChevronRight,
  Bot,
} from 'lucide-react';
import type { GuaranteeDefinition, GuaranteeId, TestExecutionResult, TestId } from '../types';

interface GuaranteesTableProps {
  guarantees: GuaranteeDefinition[];
  testResults: Record<TestId, TestExecutionResult | undefined>;
  staleGuarantees: Set<GuaranteeId>;
  isRunning: boolean;
  onRunSingleTest: (testId: TestId) => void;
}

export const GuaranteesTable: React.FC<GuaranteesTableProps> = ({
  guarantees,
  testResults,
  staleGuarantees,
  isRunning,
  onRunSingleTest,
}) => {
  const [showTrials, setShowTrials] = useState<boolean>(true);

  const passedCount = guarantees.filter((g) => testResults[g.testId]?.status === 'PASS').length;
  const failedCount = guarantees.filter((g) => testResults[g.testId]?.status === 'FAIL').length;
  const staleCount = staleGuarantees.size;

  return (
    <div className="bg-[#0e1320] rounded-lg border border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1a]">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Isolation Guarantees and Verification Policy Matrix
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographic perimeter assertions binding container sandboxes to strict isolation guarantees (G1–G5).
          </p>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Total: <strong>5</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            Passing: <strong>{passedCount}</strong>
          </span>
          {failedCount > 0 && (
            <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
              Failing: <strong>{failedCount}</strong>
            </span>
          )}
          {staleCount > 0 && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
              Drifted: <strong>{staleCount}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#070b14] border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px] tracking-wider">
              <th className="py-2.5 px-4 font-medium">Guarantee</th>
              <th className="py-2.5 px-4 font-medium">Automated Probe</th>
              <th className="py-2.5 px-4 font-medium">Target Scope</th>
              <th className="py-2.5 px-4 font-medium">Evaluation Status</th>
              <th className="py-2.5 px-4 font-medium">State Freshness</th>
              <th className="py-2.5 px-4 font-medium">Observations</th>
              <th className="py-2.5 px-4 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-sans">
            {guarantees.map((g) => {
              const res = testResults[g.testId];
              const isStale = staleGuarantees.has(g.id);
              const hasTrials = Boolean(res?.trials && res.trials.length > 0);

              return (
                <tr
                  key={g.id}
                  className={`hover:bg-[#12192b] transition-colors ${
                    isStale ? 'bg-amber-950/10' : res?.status === 'FAIL' ? 'bg-rose-950/15' : ''
                  }`}
                >
                  {/* Guarantee Info */}
                  <td className="py-3 px-4 align-top">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-800/50">
                        {g.id}
                      </span>
                      <span className="font-semibold text-slate-200">{g.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">{g.description}</p>
                  </td>

                  {/* Probe / Test */}
                  <td className="py-3 px-4 align-top font-mono">
                    <div className="text-slate-200 font-medium">{g.testId}</div>
                    <div className="text-[11px] text-slate-400 font-sans">{g.testName}</div>
                    {res && (
                      <div className="text-[10px] text-slate-500 mt-1">
                        Measured: {res.durationMs}ms
                      </div>
                    )}
                  </td>

                  {/* Target Scope */}
                  <td className="py-3 px-4 align-top">
                    <span className="inline-block px-2 py-0.5 rounded font-mono text-[10px] bg-slate-900 border border-slate-800 text-slate-300">
                      role: {g.targetRole}
                    </span>
                  </td>

                  {/* Evaluation Result */}
                  <td className="py-3 px-4 align-top">
                    {!res ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900 border border-slate-800 text-slate-400">
                        <HelpCircle className="w-3 h-3 text-slate-500" />
                        Unchecked
                      </span>
                    ) : res.status === 'PASS' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Compliant
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        <XCircle className="w-3 h-3 text-rose-400" />
                        Violation
                      </span>
                    )}
                  </td>

                  {/* Freshness */}
                  <td className="py-3 px-4 align-top">
                    {isStale ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        <RotateCw className="w-3 h-3 text-amber-400 animate-spin" />
                        Drifted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Baseline
                      </span>
                    )}
                  </td>

                  {/* Diagnostic Details */}
                  <td className="py-3 px-4 align-top max-w-sm">
                    {res ? (
                      <div className="space-y-1.5">
                        <div className={`font-medium text-[11px] ${res.status === 'PASS' ? 'text-slate-300' : 'text-rose-300 font-semibold'}`}>
                          {res.message}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono leading-relaxed">
                          {res.details}
                        </div>

                        {/* Model / Gateway Evidence tag for G4 */}
                        {res.tag && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-950/60 border border-sky-800 text-sky-300">
                              <Bot className="w-3 h-3 text-sky-400" />
                              {res.tag}
                            </span>
                          </div>
                        )}

                        {/* Paired Trials Breakdown Drawer for G4 */}
                        {hasTrials && (
                          <div className="mt-2 pt-1 border-t border-slate-800/60">
                            <button
                              onClick={() => setShowTrials(!showTrials)}
                              className="inline-flex items-center gap-1 text-[10px] font-mono text-sky-400 hover:text-sky-300 transition"
                            >
                              {showTrials ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              {showTrials ? 'Hide' : 'Show'} 5 paired trials ({res.trials?.filter((t) => t.leaked).length || 0} leaks)
                            </button>

                            {showTrials && res.trials && (
                              <div className="mt-1.5 space-y-1 bg-[#090d16] p-2 rounded border border-slate-800 text-[10px] font-mono">
                                {res.trials.map((t) => (
                                  <div
                                    key={t.trialNumber}
                                    className={`p-1.5 rounded border ${
                                      t.leaked
                                        ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                                        : 'bg-slate-900/60 border-slate-800/60 text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between font-semibold">
                                      <span>Trial {t.trialNumber} of 5 · {t.canaryToken}</span>
                                      <span className={t.leaked ? 'text-rose-400' : 'text-emerald-400'}>
                                        {t.leaked ? 'LEAK OBSERVED' : 'PASS'} ({t.durationMs}ms)
                                      </span>
                                    </div>
                                    {t.excerpt && (
                                      <div className="text-[10px] text-rose-300 mt-1 italic break-all">
                                        Excerpt: "{t.excerpt}"
                                      </div>
                                    )}
                                    <div className="text-[9px] text-slate-500 mt-0.5 truncate" title={t.transcriptSha256}>
                                      SHA-256: {t.transcriptSha256}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">No telemetry recorded yet.</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 align-top text-right">
                    <button
                      onClick={() => onRunSingleTest(g.testId)}
                      disabled={isRunning}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 transition"
                      title={`Run probe ${g.testId}`}
                    >
                      <Play className="w-3 h-3 text-sky-400" />
                      Probe
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
