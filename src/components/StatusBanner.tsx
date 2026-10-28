import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCw,
  Copy,
  Check,
  Hash,
  FileCheck2,
  Lock,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import type { AssuranceState, DecoupledAssuranceSnapshot, BenchmarkMetrics } from '../types';

interface StatusBannerProps {
  state: AssuranceState;
  currentFingerprint: string;
  verifiedFingerprint: string | null;
  affectedGuarantees: string[];
  totalEventsCount: number;
  lastRunDurationMs: number | null;
  testsPassedCount: number;
  totalTestsCount: number;
  chainValidStatus: 'VALID' | 'TAMPERED' | 'INCOMPLETE';
  decoupledSnapshot?: DecoupledAssuranceSnapshot;
  metrics?: BenchmarkMetrics;
  modelMode?: 'live' | 'cached';
  modelLabel?: string;
  onRunFullVerification: () => void;
  onRunSelectiveRetest: () => void;
  isRunning: boolean;
  selectiveTestsCount: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  state,
  currentFingerprint,
  verifiedFingerprint,
  affectedGuarantees,
  totalEventsCount,
  lastRunDurationMs,
  testsPassedCount,
  totalTestsCount,
  chainValidStatus,
  decoupledSnapshot,
  metrics,
  modelMode = 'cached',
  modelLabel = 'Cached: recorded from llama3.2:3b',
  onRunFullVerification,
  onRunSelectiveRetest,
  isRunning,
  selectiveTestsCount,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [copied, setCopied] = useState(false);
  const [showFullHash, setShowFullHash] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMatchVerified = verifiedFingerprint && currentFingerprint === verifiedFingerprint;

  const getStateMeta = (s: AssuranceState) => {
    switch (s) {
      case 'VERIFIED':
        return {
          label: 'VERIFIED',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          summary: 'All 5 isolation boundaries cryptographically attested. Fail-closed gates open.',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        };
      case 'STALE':
        return {
          label: 'CHANGED',
          badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          summary: `Configuration changed for [${affectedGuarantees.join(', ')}]. Selective retest required.`,
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        };
      case 'BREACHED':
        return {
          label: 'BREACH DETECTED',
          badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
          summary: 'Active perimeter isolation failure detected. Evaluation harness locked.',
          icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
        };
      case 'RECOVERING':
        return {
          label: 'RECOVERING',
          badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
          summary: 'Remediated baseline detected. Retest pending to confirm compliance.',
          icon: <RotateCw className="w-4 h-4 text-sky-400 animate-spin" />,
        };
      case 'UNVERIFIED':
      default:
        return {
          label: 'UNVERIFIED',
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
          summary: 'Environment pending initial verification suite. Default-deny active.',
          icon: <Lock className="w-4 h-4 text-slate-400" />,
        };
    }
  };

  const stateMeta = getStateMeta(state);
  const rPct = metrics ? Math.max(0, Math.round(metrics.selectiveRetestReduction * 100)) : 0;

  return (
    <header className="w-full bg-[#0b101c] border-b border-slate-800/90 sticky top-0 z-40 shadow-sm">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 border-b border-slate-800/50">
          {/* Brand & Context */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center shadow-inner">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold tracking-wider text-sm text-white">BAYORA</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-800 text-xs font-mono">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/60 border border-purple-800/60 text-purple-300 font-medium">
                Simulated environment
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300">
                <span className={`w-1.5 h-1.5 rounded-full ${modelMode === 'live' ? 'bg-emerald-400' : 'bg-sky-400'}`} />
                {modelLabel}
              </span>
            </div>
          </div>

          {/* Right Status Indicators & Decoupled State Chips */}
          <div className="flex items-center gap-2.5 text-xs">
            {/* Decoupled Schema Badges */}
            {decoupledSnapshot && (
              <div className="hidden lg:flex items-center gap-1.5 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                  CFG: <strong className={decoupledSnapshot.configuration_status === 'BASELINE' ? 'text-emerald-400' : 'text-amber-400'}>{decoupledSnapshot.configuration_status}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                  TEST: <strong className={decoupledSnapshot.policy_test_status === 'PASS' ? 'text-emerald-400' : decoupledSnapshot.policy_test_status === 'FAIL' ? 'text-rose-400' : 'text-slate-400'}>{decoupledSnapshot.policy_test_status}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                  LEDGER: <strong className={chainValidStatus === 'VALID' ? 'text-emerald-400' : 'text-rose-400'}>{chainValidStatus}</strong>
                </span>
              </div>
            )}

            {/* Audit Chain chip */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 font-mono text-[11px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  chainValidStatus === 'VALID'
                    ? 'bg-emerald-400'
                    : chainValidStatus === 'TAMPERED'
                    ? 'bg-rose-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-400">Chain:</span>
              <span
                className={`font-semibold ${
                  chainValidStatus === 'VALID'
                    ? 'text-emerald-400'
                    : chainValidStatus === 'TAMPERED'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {chainValidStatus}
              </span>
            </div>

            {/* Live Engine Indicator */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Verifier Active</span>
            </div>

            {/* Theme Switcher Toggle */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[11px] font-mono hover:border-slate-700 transition cursor-pointer shadow-xs"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
                aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-300 font-sans">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-sky-600" />
                    <span className="text-slate-700 font-sans font-semibold">Dark</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Executive KPI & Posture Strip */}
        <div className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Posture Status Card */}
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold border ${stateMeta.badgeClass}`}
              >
                {stateMeta.icon}
                {stateMeta.label}
              </span>
            </div>

            <p className="text-xs text-slate-300 font-sans max-w-md hidden sm:block">
              {stateMeta.summary}
            </p>
          </div>

          {/* Quick Metrics & Direct Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Retest Reduction Badge */}
            {rPct > 0 && (
              <div className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Retest Reduction: <strong>{rPct}%</strong></span>
              </div>
            )}

            {/* Live telemetry counters */}
            <div className="hidden lg:flex items-center gap-3 px-3 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-400">
              <span>Checks: <strong className="text-slate-200">{testsPassedCount}/{totalTestsCount}</strong></span>
              <span className="text-slate-700">|</span>
              <span>Latency: <strong className="text-slate-200">{lastRunDurationMs !== null ? `${lastRunDurationMs}ms` : '—'}</strong></span>
              <span className="text-slate-700">|</span>
              <span>Events: <strong className="text-slate-200">{totalEventsCount}</strong></span>
            </div>

            {/* Fingerprint chip */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800 text-xs font-mono">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 text-[11px]">SHA-256:</span>
              <span className="text-slate-200 text-[11px]">
                {showFullHash ? currentFingerprint : `${currentFingerprint.slice(0, 10)}...`}
              </span>
              <span className="text-[10px] text-slate-500">
                ({isMatchVerified ? 'Baseline' : 'Changed'})
              </span>
              <button
                onClick={() => setShowFullHash(!showFullHash)}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition px-1 focus-visible:ring-1 focus-visible:ring-sky-400 focus:outline-none"
                title="Toggle hash format"
              >
                {showFullHash ? 'Short' : 'Full'}
              </button>
              <button
                onClick={handleCopy}
                className="text-slate-500 hover:text-slate-300 transition focus-visible:ring-1 focus-visible:ring-sky-400 focus:outline-none"
                title="Copy SHA-256 hash"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* Selective Retest (if changed) */}
            {selectiveTestsCount > 0 && (
              <button
                onClick={onRunSelectiveRetest}
                disabled={isRunning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 disabled:opacity-50 transition focus-visible:ring-2 focus-visible:ring-amber-400 focus:outline-none"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                Retest ({selectiveTestsCount})
              </button>
            )}

            {/* Run Full Verification */}
            <button
              onClick={onRunFullVerification}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-mono font-semibold bg-slate-100 hover:bg-white text-slate-900 disabled:opacity-50 transition shadow-sm focus-visible:ring-2 focus-visible:ring-sky-400 focus:outline-none"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-slate-900" />
              <span>Verify all (5 checks)</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
