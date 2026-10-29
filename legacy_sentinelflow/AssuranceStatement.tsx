import React, { useState } from 'react';
import { Printer, ShieldCheck, CheckCircle2, XCircle, Terminal, HelpCircle } from 'lucide-react';
import type { AssuranceState, GuaranteeDefinition, SimulatedConfig, TestExecutionResult } from '../types.ts';

interface AssuranceStatementProps {
  state: AssuranceState;
  verifiedAt: string | null;
  currentFingerprint: string;
  verifiedFingerprint: string | null;
  config: SimulatedConfig;
  baselineConfig: SimulatedConfig;
  guarantees: GuaranteeDefinition[];
  testResults: Record<string, TestExecutionResult | undefined>;
  staleGuarantees: Set<string>;
  bundleHash?: string;
}

export const AssuranceStatement: React.FC<AssuranceStatementProps> = ({
  state,
  verifiedAt,
  currentFingerprint,
  verifiedFingerprint,
  config,
  baselineConfig,
  guarantees,
  testResults,
  staleGuarantees,
  bundleHash,
}) => {
  const [generatedDate] = useState(() => new Date().toLocaleDateString());

  const handlePrint = () => {
    window.print();
  };

  const isVerified = state === 'VERIFIED';
  const isBreached = state === 'BREACHED';
  const isStale = state === 'STALE';

  // Plain-language state summaries
  const statusSummary = isVerified
    ? {
        headline: 'System Isolation Verified',
        subhead: 'All five security boundaries are holding. Untrusted adversarial evaluation workloads cannot leak data or cross into production control systems.',
        badgeClass: 'bg-emerald-950/40 text-emerald-300 border-emerald-700/60',
      }
    : isBreached
    ? {
        headline: 'Security Boundary Compromised',
        subhead: 'At least one isolation guarantee failed automated inspection. Automated policy gates are blocking evaluation runs to protect tenant data.',
        badgeClass: 'bg-rose-950/40 text-rose-300 border-rose-700/60',
      }
    : isStale
    ? {
        headline: 'Configuration Changed: Verification Pending',
        subhead: 'System settings changed since the last certified baseline. Retesting is required before evaluation runs can proceed.',
        badgeClass: 'bg-amber-950/40 text-amber-300 border-amber-700/60',
      }
    : {
        headline: 'Unverified: Initial Baseline Required',
        subhead: 'Full automated verification has not yet run on this environment. Automated gates default to closed deny.',
        badgeClass: 'bg-slate-900 text-slate-300 border-slate-700',
      };

  // Compute what changed in plain English
  const changes: string[] = [];
  if (config.storageApiAuthz !== baselineConfig.storageApiAuthz) {
    changes.push(`Storage API authorization changed from ${baselineConfig.storageApiAuthz} to ${config.storageApiAuthz}.`);
  }
  if (config.gatewaySessionIsolation !== baselineConfig.gatewaySessionIsolation) {
    changes.push(`Model gateway context sharing changed from ${baselineConfig.gatewaySessionIsolation} to ${config.gatewaySessionIsolation}.`);
  }
  if (config.redMounts.length !== baselineConfig.redMounts.length || config.redMounts.some((m) => !baselineConfig.redMounts.includes(m))) {
    changes.push(`Container filesystem storage mount paths were modified.`);
  }
  if (config.redNetworks.length !== baselineConfig.redNetworks.length || config.redNetworks.some((n) => !baselineConfig.redNetworks.includes(n))) {
    changes.push(`Network isolation boundaries were modified.`);
  }
  if (!config.hardeningFlags.readOnlyRoot || !config.hardeningFlags.noNewPrivileges || !config.hardeningFlags.dropCapabilities.includes('ALL')) {
    changes.push(`Workload security hardening controls (read-only filesystem, privilege escalation prevention) were weakened.`);
  }

  const effectiveBundleHash = bundleHash || currentFingerprint;

  return (
    <div className="space-y-4">
      {/* Interactive Controls (hidden when printing) */}
      <div className="print:hidden bg-[#0e1320] rounded-lg border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            Plain-Language Assurance Statement (AI for All)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            A single-page summary for non-specialists, regulators, and audit teams. Facts are fixed and grounded directly in cryptographic ledger proofs.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium bg-slate-100 hover:bg-white text-slate-900 transition shadow-sm"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Save PDF Statement
        </button>
      </div>

      {/* Printable Sheet (single page print styling) */}
      <div className="bg-[#0b0f1a] print:bg-white text-slate-100 print:text-slate-900 border border-slate-800 print:border-slate-300 rounded-lg p-6 sm:p-8 print:p-6 shadow-md print:shadow-none font-sans print:max-w-none print:m-0 print:text-[11pt]">
        {/* Document Header */}
        <div className="border-b border-slate-800 print:border-slate-300 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold tracking-tight text-white print:text-black">
              Bayora Continuous Assurance Statement
            </div>
            <div className="text-xs text-slate-400 print:text-slate-600 font-mono mt-0.5">
              Evaluation Sandbox Security Assessment · AI Explains, Math Decides
            </div>
          </div>

          <div className="text-right font-mono text-xs text-slate-400 print:text-slate-600">
            <div>Generated: {generatedDate}</div>
            <div>Audited Scope: eval-sandbox-us-east</div>
          </div>
        </div>

        {/* Status Callout */}
        <div className={`p-4 rounded-md border mb-6 ${
          isVerified
            ? 'bg-emerald-950/20 print:bg-emerald-50 border-emerald-800/40 print:border-emerald-300'
            : isBreached
            ? 'bg-rose-950/20 print:bg-rose-50 border-rose-800/40 print:border-rose-300'
            : 'bg-amber-950/20 print:bg-amber-50 border-amber-800/40 print:border-amber-300'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-semibold text-sm print:text-black">{statusSummary.headline}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${statusSummary.badgeClass}`}>
              STATUS: {state}
            </span>
          </div>
          <p className="text-xs print:text-slate-700 text-slate-300 leading-relaxed font-sans">
            {statusSummary.subhead}
          </p>
        </div>

        {/* 1. What Is Verified & What Is Not */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-600 font-mono mb-3">
            1. Perimeter Isolation Boundaries Status:
          </h3>

          <div className="space-y-2">
            {guarantees.map((g) => {
              const res = testResults[g.testId];
              const isPassing = res?.status === 'PASS';
              const isStaleItem = staleGuarantees.has(g.id);

              return (
                <div
                  key={g.id}
                  className="p-3 rounded border border-slate-800 print:border-slate-300 bg-[#070b14] print:bg-slate-50 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    {isPassing ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-emerald-600 mt-0.5 shrink-0" />
                    ) : res?.status === 'FAIL' ? (
                      <XCircle className="w-4 h-4 text-rose-400 print:text-rose-600 mt-0.5 shrink-0" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-slate-200 print:text-black">
                        {g.name} ({g.id})
                      </div>
                      <p className="text-[11px] text-slate-400 print:text-slate-600 mt-0.5 leading-snug">
                        {g.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      isPassing
                        ? 'bg-emerald-500/10 text-emerald-400 print:text-emerald-700'
                        : res?.status === 'FAIL'
                        ? 'bg-rose-500/10 text-rose-400 print:text-rose-700'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isPassing ? 'VERIFIED SAFE' : res?.status === 'FAIL' ? 'FAIL / BREACH' : isStaleItem ? 'DRIFTED' : 'UNCHECKED'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. When Verified & What Changed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-3.5 rounded border border-slate-800 print:border-slate-300 bg-[#070b14] print:bg-slate-50">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 print:text-slate-600 font-bold mb-1.5">
              2. Verification Timing:
            </h4>
            <div className="text-xs text-slate-300 print:text-slate-800 space-y-1 font-sans">
              <div>
                <span className="text-slate-500">Last Certified Baseline:</span>{' '}
                <strong>{verifiedAt ? new Date(verifiedAt).toLocaleString() : 'Not yet certified'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Verified Fingerprint:</span>{' '}
                <span className="font-mono text-[10px] text-sky-400 print:text-sky-700">
                  {verifiedFingerprint ? verifiedFingerprint.slice(0, 16) + '...' : 'None'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded border border-slate-800 print:border-slate-300 bg-[#070b14] print:bg-slate-50">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 print:text-slate-600 font-bold mb-1.5">
              3. Recent Configuration Changes:
            </h4>
            {changes.length === 0 ? (
              <div className="text-xs text-emerald-400 print:text-emerald-700 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Zero configuration drift detected. System is in baseline alignment.
              </div>
            ) : (
              <ul className="text-xs text-slate-300 print:text-slate-800 space-y-1 font-sans list-disc pl-4">
                {changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 4. Independent Verification Instructions */}
        <div className="p-4 rounded border border-slate-800 print:border-slate-300 bg-[#070b14] print:bg-slate-50">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-sky-400 print:text-sky-800 font-bold mb-1.5 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            4. How To Verify This Statement Independently (Zero Trust):
          </h4>
          <p className="text-xs text-slate-300 print:text-slate-700 leading-relaxed font-sans mb-2">
            You do not need to trust this user interface. All evidence events are linked by a cryptographic SHA-256 hash chain signed with an ECDSA P-256 key. Any auditor or regulator can independently verify the complete ledger offline:
          </p>

          <div className="bg-[#090d16] print:bg-slate-100 p-2.5 rounded border border-slate-800 print:border-slate-300 font-mono text-xs text-slate-200 print:text-slate-900 space-y-1">
            <div># Step 1: Export evidence package from Bayora UI (or find bundle.json)</div>
            <div className="text-sky-400 print:text-sky-700 font-bold">npm run verify -- bundle.json</div>
            <div className="text-slate-500 text-[10px]"># Evidence bundle digest: {effectiveBundleHash}</div>
          </div>
        </div>

        {/* Footer / Attestation Statement */}
        <div className="border-t border-slate-800 print:border-slate-300 pt-3 mt-6 text-[10px] text-slate-500 print:text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-mono">
          <div>Bayora Protocol v1.4 · Deterministic Policy Arbiter</div>
          <div>All durations measured via performance.now() · Offline Verifiable</div>
        </div>
      </div>
    </div>
  );
};
