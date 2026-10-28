import React from 'react';
import { Bot, ShieldAlert, CheckCircle2, RefreshCw, FileText } from 'lucide-react';
import type { AnalystOutput } from '../core/analyst.ts';

interface IncidentAnalystPanelProps {
  report: AnalystOutput | null;
  label: string;
  isLoading: boolean;
  onRefresh?: () => void;
  hasActiveFailure: boolean;
}

export const IncidentAnalystPanel: React.FC<IncidentAnalystPanelProps> = ({
  report,
  label,
  isLoading,
  onRefresh,
  hasActiveFailure,
}) => {
  return (
    <div className="bg-[#0e1320] rounded-lg border border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1a]">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              AI Incident Security Analyst
            </h2>
            {report && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                label.includes('Template')
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  : 'bg-sky-950/40 border-sky-800/60 text-sky-300'
              }`}>
                {label}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Advisory incident investigation. Explains boundary breaches and maps remediation steps from verified evidence rows.
          </p>
        </div>

        {hasActiveFailure && onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
            Re-analyze Incident
          </button>
        )}
      </div>

      {/* Mandatory Deterministic Decoupling Notice */}
      <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center gap-2 text-[11px] font-mono text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
        <span>The verdict is computed deterministically and is not influenced by this analysis.</span>
      </div>

      {/* Main Body */}
      <div className="p-4">
        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400 flex flex-col items-center justify-center gap-3 bg-[#090d16] rounded-md border border-slate-800">
            <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
            <span>Analyzing breach telemetry and grounding claims against evidence ledger...</span>
          </div>
        ) : !hasActiveFailure ? (
          <div className="p-8 text-center text-xs font-sans text-slate-400 flex flex-col items-center justify-center gap-2 bg-[#090d16] rounded-md border border-slate-800">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <p className="text-slate-300 font-medium">Perimeter compliant. No active boundary violations detected.</p>
            <p className="text-[11px] text-slate-500 max-w-md">
              The AI Incident Analyst activates when a boundary check fails or configuration drift compromises an isolation guarantee.
            </p>
          </div>
        ) : report ? (
          <div className="space-y-4">
            {/* Summary Banner */}
            <div className="p-3.5 rounded-md bg-rose-950/20 border border-rose-800/40 flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-rose-200">Executive Summary</div>
                <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">{report.summary}</p>
              </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* What Changed */}
              <div className="p-3.5 rounded-md bg-[#090d16] border border-slate-800">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Observed Configuration Change:
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{report.whatChanged}</p>
              </div>

              {/* Attacker Impact */}
              <div className="p-3.5 rounded-md bg-[#090d16] border border-slate-800">
                <div className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-semibold mb-1">
                  Adversarial Exposure:
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{report.attackerImpact}</p>
              </div>
            </div>

            {/* Remediation Steps */}
            <div className="p-3.5 rounded-md bg-[#090d16] border border-slate-800">
              <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-semibold mb-2">
                Recommended Remediation Sequence:
              </div>
              <ol className="space-y-2 text-xs text-slate-300 font-sans">
                {report.fixSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-sky-400 font-semibold text-[11px] mt-0.5">
                      {idx + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Grounded Evidence Citations */}
            <div className="p-3 rounded-md bg-[#070b14] border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-400">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Grounded Evidence Citations ({report.evidenceRefs.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {report.evidenceRefs.map((ref, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-300 text-[10px]"
                  >
                    cite: {ref}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs font-mono text-slate-500 bg-[#090d16] rounded-md border border-slate-800">
            Click "Re-analyze Incident" to generate an advisory investigation for the active boundary breach.
          </div>
        )}
      </div>
    </div>
  );
};
