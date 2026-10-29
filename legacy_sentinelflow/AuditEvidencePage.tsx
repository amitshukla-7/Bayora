import React, { useState } from 'react';
import {
  KeyRound,
  Download,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import type { SecurityEvent, VerificationResult } from '../types';
import { fetchEvidenceBundle, verifyEvidence, runTamperDemo } from '../services/api';

interface AuditEvidencePageProps {
  events: SecurityEvent[];
}

export const AuditEvidencePage: React.FC<AuditEvidencePageProps> = ({
  events,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isTamperDemoRunning, setIsTamperDemoRunning] = useState(false);
  const [tamperDemoData, setTamperDemoData] = useState<any | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const filteredEvents = events.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.event_type.toLowerCase().includes(q) ||
      e.event_hash.toLowerCase().includes(q) ||
      (e.tool_name && e.tool_name.toLowerCase().includes(q)) ||
      (e.resource && e.resource.toLowerCase().includes(q)) ||
      String(e.sequence).includes(q)
    );
  });

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExportBundle = async () => {
    setIsExporting(true);
    try {
      const bundle = await fetchEvidenceBundle();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinelflow-evidence-bundle-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleVerifyLedger = async () => {
    setIsVerifying(true);
    setTamperDemoData(null);
    try {
      const result = await verifyEvidence();
      setVerificationResult(result);
    } catch (err: any) {
      setVerificationResult({
        status: 'ERROR',
        valid: false,
        details: err.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRunTamperDemo = async () => {
    setIsTamperDemoRunning(true);
    setVerificationResult(null);
    try {
      const demoResult = await runTamperDemo();
      setTamperDemoData(demoResult);
      setVerificationResult(demoResult.verificationResult);
    } catch (err: any) {
      alert(`Tamper demo failed: ${err.message}`);
    } finally {
      setIsTamperDemoRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header & Verification Controls */}
      <div className="p-6 rounded-xl bg-[#0f1422] border border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[11px] font-mono font-semibold">
              RFC 8785 CANONICAL CHAIN
            </span>
            <span className="text-slate-400 text-xs font-mono">ECDSA P-256 Attested</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight font-sans">
            Cryptographic Audit Ledger & Proof
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">
            Every autonomous decision, tool proposal, and gateway verdict is hashed with SHA-256 and chained into an immutable sequence.
            Signatures prove authenticity relative to the trusted authority key.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportBundle}
            disabled={isExporting || events.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export Bundle (.json)</span>
          </button>

          <button
            onClick={handleRunTamperDemo}
            disabled={isTamperDemoRunning || events.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Tamper Detection</span>
          </button>

          <button
            onClick={handleVerifyLedger}
            disabled={isVerifying || events.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold tracking-wide transition shadow-lg shadow-sky-500/20 cursor-pointer disabled:opacity-50 font-sans"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isVerifying ? 'Verifying...' : 'Verify Ledger'}</span>
          </button>
        </div>
      </div>

      {/* Verification Status Banner (If Run) */}
      {verificationResult && (
        <div
          className={`p-5 rounded-xl border animate-in fade-in duration-150 ${
            verificationResult.status === 'VERIFIED'
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  verificationResult.status === 'VERIFIED'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {verificationResult.status === 'VERIFIED' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 font-mono">
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    {verificationResult.status === 'VERIFIED'
                      ? 'Cryptographic Audit Proof: 100% INTACT'
                      : 'Audit Proof Failure: TAMPERING DETECTED'}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      verificationResult.status === 'VERIFIED'
                        ? 'bg-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/30 text-rose-200'
                    }`}
                  >
                    STATUS: {verificationResult.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
                  {verificationResult.details}
                </p>

                {tamperDemoData && (
                  <div className="mt-3 p-3 rounded-lg bg-black/40 border border-rose-500/30 font-mono text-[11px] text-slate-300 space-y-1">
                    <span className="text-amber-400 font-semibold block">
                      Tamper Demonstration Findings:
                    </span>
                    <div>Tampered Sequence Block: #{tamperDemoData.tamperedSequence}</div>
                    <div className="text-slate-400">
                      Original Payload: {tamperDemoData.originalPayloadSnippet}
                    </div>
                    <div className="text-rose-300">
                      Modified Payload: {tamperDemoData.tamperedPayloadSnippet}
                    </div>
                    <div className="text-emerald-400 mt-1">
                      Verifier Result: Hash mismatch confirmed. Malicious alteration halted.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setVerificationResult(null);
                setTamperDemoData(null);
              }}
              className="text-slate-400 hover:text-white p-1 rounded-md text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="rounded-xl bg-[#0f1422] border border-slate-800 overflow-hidden shadow-xs space-y-3 p-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <KeyRound className="w-4 h-4 text-sky-400" />
            <span>Persisted Cryptographic Events ({events.length})</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter hashes or events..."
              className="pl-8 pr-3 py-1 rounded bg-[#0a0d16] border border-slate-800 text-[11px] text-slate-300 placeholder-slate-500 focus:outline-hidden focus:border-sky-500 font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0c111e]/80 text-slate-400">
                <th className="py-2.5 px-3 font-semibold">SEQ #</th>
                <th className="py-2.5 px-3 font-semibold">EVENT TYPE</th>
                <th className="py-2.5 px-3 font-semibold">TOOL / TARGET</th>
                <th className="py-2.5 px-3 font-semibold">DECISION</th>
                <th className="py-2.5 px-3 font-semibold">PREVIOUS HASH (CHAIN LINK)</th>
                <th className="py-2.5 px-3 font-semibold">CURRENT HASH (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans text-xs">
                    No ledger events found. Execute tasks in the Playground to record provable blocks.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((e) => (
                  <tr key={e.sequence} className="hover:bg-[#12192b]/60 transition">
                    <td className="py-2.5 px-3 text-slate-400 font-bold">#{e.sequence}</td>
                    <td className="py-2.5 px-3 text-slate-200">{e.event_type}</td>
                    <td className="py-2.5 px-3 text-sky-300">
                      {e.tool_name || e.resource || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          e.decision === 'ALLOWED'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : e.decision === 'DENIED'
                            ? 'bg-rose-500/15 text-rose-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {e.decision}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      <span title={e.previous_event_hash}>
                        {e.previous_event_hash.slice(0, 12)}...
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span className="text-sky-400 font-semibold" title={e.event_hash}>
                          {e.event_hash.slice(0, 16)}...
                        </span>
                        <button
                          onClick={() => handleCopyHash(e.event_hash)}
                          className="text-slate-500 hover:text-slate-200 transition p-0.5"
                          title="Copy Full Hash"
                        >
                          {copiedHash === e.event_hash ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
