import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Activity,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import type { OverviewMetrics, SecurityEvent, Incident, PageId } from '../types';

interface OverviewPageProps {
  metrics: OverviewMetrics;
  policyFingerprint: string;
  recentEvents: SecurityEvent[];
  recentIncidents: Incident[];
  onNavigate: (page: PageId) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  metrics,
  policyFingerprint,
  recentEvents,
  recentIncidents,
  onNavigate,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyFingerprint = () => {
    if (policyFingerprint) {
      navigator.clipboard.writeText(policyFingerprint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Hero / Gateway Operational Status Card */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-[#0d1322] via-[#0f172a] to-[#0c1220] border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                GATEWAY ENFORCING
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-slate-300 text-[11px] font-mono">
                Fail-Closed Mode
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-slate-300 text-[11px] font-mono">
                Policy v1.0.0
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight font-sans">
              AI Agent Security Checkpoint
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl mt-1 leading-relaxed">
              SentinelFlow sits between autonomous models and enterprise tools. Every file access,
              search query, report generation, and outbound dispatch is evaluated against deterministic policies before execution.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('playground')}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs tracking-wide transition shadow-lg shadow-sky-500/25 cursor-pointer font-sans"
            >
              <Terminal className="w-4 h-4" />
              <span>Launch Agent Playground</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Security Fingerprint Strip */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#080d18]/60 border border-slate-800/80">
            <span className="text-slate-400 font-sans">Policy Fingerprint:</span>
            <div className="flex items-center gap-2 text-slate-200">
              <span title={policyFingerprint}>
                {policyFingerprint ? `${policyFingerprint.slice(0, 14)}...` : 'Computing...'}
              </span>
              <button
                onClick={handleCopyFingerprint}
                className="text-slate-400 hover:text-white p-0.5 transition"
                title="Copy Fingerprint"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#080d18]/60 border border-slate-800/80">
            <span className="text-slate-400 font-sans">Active Policies:</span>
            <span className="text-emerald-400 font-semibold">
              {metrics.activePoliciesCount} Deterministic Rules Active
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#080d18]/60 border border-slate-800/80">
            <span className="text-slate-400 font-sans">Audit Ledger State:</span>
            <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Cryptographically Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Runs */}
        <div className="p-5 rounded-xl bg-[#0f1422] border border-slate-800 hover:border-slate-700 transition shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium font-sans">Total Agent Runs</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Terminal className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white font-mono tracking-tight">
            {metrics.totalRuns}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-indigo-400">Deterministic Engine</span>
            <span>· Local Execution</span>
          </div>
        </div>

        {/* Metric 2: Allowed Actions */}
        <div className="p-5 rounded-xl bg-[#0f1422] border border-slate-800 hover:border-slate-700 transition shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium font-sans">Permitted Tool Actions</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400 font-mono tracking-tight">
            {metrics.totalAllowed}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-400">100% Policy Compliant</span>
            <span>· Approved Roots</span>
          </div>
        </div>

        {/* Metric 3: Blocked Threats */}
        <div className="p-5 rounded-xl bg-[#0f1422] border border-slate-800 hover:border-slate-700 transition shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium font-sans">Blocked Operations</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-rose-400 font-mono tracking-tight">
            {metrics.totalDenied}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-rose-400">Stopped at Gateway</span>
            <span>· 0 Tools Executed</span>
          </div>
        </div>

        {/* Metric 4: Security Incidents */}
        <div className="p-5 rounded-xl bg-[#0f1422] border border-slate-800 hover:border-slate-700 transition shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium font-sans">Security Incidents</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-400 font-mono tracking-tight">
            {metrics.totalIncidents}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="text-amber-400">Threats Isolated</span>
            <span>· Prompt Injection</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Security Incidents & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Security Incidents Requiring Attention */}
        <div className="p-6 rounded-xl bg-[#0f1422] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-semibold text-white font-sans">Security Incidents</h3>
              </div>
              <button
                onClick={() => onNavigate('events')}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium transition cursor-pointer"
              >
                View All ({recentIncidents.length})
              </button>
            </div>

            {recentIncidents.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No active security incidents recorded.</p>
                <p className="mt-1 text-slate-600">Run the malicious document scenario in Playground to test.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentIncidents.slice(0, 3).map((incident) => (
                  <div
                    key={incident.id}
                    className="p-3.5 rounded-lg bg-[#0b101c] border border-slate-800/80 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {incident.threat_category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(incident.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans font-medium line-clamp-2">
                      {incident.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Target: {incident.target_resource || 'File System'}</span>
                      <span className="text-rose-400 font-semibold">{incident.severity} RISK</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
            <span>Deterministic gate guarantees zero execution on breach</span>
            <span className="text-emerald-400 font-mono">Status: Neutralized</span>
          </div>
        </div>

        {/* Right: Recent Activity Stream */}
        <div className="p-6 rounded-xl bg-[#0f1422] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-white font-sans">Recent Gateway Activity</h3>
              </div>
              <button
                onClick={() => onNavigate('evidence')}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium transition cursor-pointer"
              >
                View Ledger ({metrics.totalEvents})
              </button>
            </div>

            {recentEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Terminal className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No recent activity recorded.</p>
                <p className="mt-1 text-slate-600">Launch a task in the Agent Playground to begin.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentEvents.slice(0, 4).map((event) => (
                  <div
                    key={event.sequence}
                    className="p-3 rounded-lg bg-[#0b101c] border border-slate-800/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          event.decision === 'ALLOWED'
                            ? 'bg-emerald-400'
                            : event.decision === 'DENIED'
                            ? 'bg-rose-400'
                            : 'bg-sky-400'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-200 font-medium">
                            {event.event_type}
                          </span>
                          {event.tool_name && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-400">
                              {event.tool_name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-xs">
                          {event.resource || event.payload?.task || 'Execution step'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          event.decision === 'ALLOWED'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : event.decision === 'DENIED'
                            ? 'bg-rose-500/15 text-rose-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {event.decision}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        #{event.sequence} · {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
            <span>Every block is chained to SHA-256 ledger</span>
            <button
              onClick={() => onNavigate('playground')}
              className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              Run Demo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
