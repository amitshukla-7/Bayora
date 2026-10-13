import React, { useState } from 'react';
import {
  FileCode,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  RotateCcw,
  Bug,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  FileCheck2,
  Download,
  Upload,
  KeyRound,
} from 'lucide-react';
import type { EvidenceEvent, ChainVerificationReport } from '../types';

interface EvidenceLogTableProps {
  events: EvidenceEvent[];
  verificationReport: ChainVerificationReport | null;
  onVerifyEvidence: () => void;
  onSimulateTampering: () => void;
  onSimulateMissingEvent: () => void;
  onResetLog: () => void;
  onImportLedger?: (importedEvents: EvidenceEvent[]) => void;
  isVerifying: boolean;
}

export const EvidenceLogTable: React.FC<EvidenceLogTableProps> = ({
  events,
  verificationReport,
  onVerifyEvidence,
  onSimulateTampering,
  onSimulateMissingEvent,
  onResetLog,
  onImportLedger,
  isVerifying,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [expandedSeq, setExpandedSeq] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  const handleExportLedgerJson = () => {
    if (events.length === 0) return;
    const exportPackage = {
      exported_at: new Date().toISOString(),
      generator: 'Bayora Sentinel Evidence Logging Service v1.4',
      total_events: events.length,
      events,
    };
    const blob = new Blob([JSON.stringify(exportPackage, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bayora-evidence-ledger-${Date.now().toString(36)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const imported = Array.isArray(parsed) ? parsed : parsed.events;
        if (Array.isArray(imported) && imported.length > 0) {
          onImportLedger?.(imported);
        } else {
          alert('Invalid ledger file format: no events found.');
        }
      } catch (err: any) {
        alert(`Failed to parse JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'run.started':
        return 'text-sky-300 bg-sky-950/40 border-sky-800/60';
      case 'manifest.captured':
        return 'text-indigo-300 bg-indigo-950/40 border-indigo-800/60';
      case 'test.started':
        return 'text-slate-300 bg-slate-900 border-slate-800';
      case 'test.completed':
        return 'text-cyan-300 bg-cyan-950/40 border-cyan-800/60';
      case 'policy.decision':
        return 'text-amber-300 bg-amber-950/40 border-amber-800/60';
      case 'checkpoint.signed':
        return 'text-teal-300 bg-teal-950/40 border-teal-800/60';
      case 'run.completed':
        return 'text-emerald-300 bg-emerald-950/40 border-emerald-800/60';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  return (
    <div className="bg-[#0e1320] rounded-lg border border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1a]">
        <div>
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Cryptographic Audit Ledger (7-Stage SHA-256 Hash Chain)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable, append-only provenance record chaining run initialization, canonical manifests, diagnostic probes, fail-closed policy decisions, and Ed25519/HMAC checkpoint signatures.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Verify Evidence */}
          <button
            onClick={onVerifyEvidence}
            disabled={isVerifying || events.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white transition shadow-sm"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            Verify Ledger
          </button>

          {/* Import JSON */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 transition"
            title="Import an external or previously exported audit ledger JSON for verification"
          >
            <Upload className="w-3.5 h-3.5" />
            Import JSON
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportLedgerJson}
            disabled={events.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 transition"
            title="Export signed ledger package for offline verification via CLI"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>

          {/* Simulate Tampering */}
          <button
            onClick={onSimulateTampering}
            disabled={events.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-slate-900 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-800 hover:border-rose-800/60 text-slate-300 transition"
            title="Modify a recorded test result payload without rehashing to test tamper detection"
          >
            <Bug className="w-3.5 h-3.5 text-rose-400" />
            Simulate Tamper
          </button>

          {/* Simulate Missing Event */}
          <button
            onClick={onSimulateMissingEvent}
            disabled={events.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-slate-900 hover:bg-amber-950/40 hover:text-amber-300 border border-slate-800 hover:border-amber-800/60 text-slate-300 transition"
            title="Drop an event from a run to test incomplete plan detection"
          >
            <FileQuestion className="w-3.5 h-3.5 text-amber-400" />
            Simulate Drop
          </button>

          {/* Reset */}
          <button
            onClick={onResetLog}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition"
            title="Clear and reset ledger"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Verification Diagnostic Alert */}
      {verificationReport && (
        <div
          className={`p-3 border-b font-mono text-xs ${
            verificationReport.status === 'VALID'
              ? 'bg-[#06140d] border-emerald-500/30 text-emerald-300'
              : verificationReport.status === 'TAMPERED'
              ? 'bg-[#18080c] border-rose-500/40 text-rose-200'
              : 'bg-[#181106] border-amber-500/40 text-amber-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              {verificationReport.status === 'VALID' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : verificationReport.status === 'TAMPERED' ? (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold flex items-center gap-2">
                  <span>AUDIT STATUS: {verificationReport.status}</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    ({verificationReport.validCount}/{verificationReport.totalEvents} valid blocks verified)
                  </span>
                  {verificationReport.signatureValid && (
                    <span className="text-[10px] text-teal-300 bg-teal-950/60 px-1.5 py-0.2 rounded border border-teal-800">
                      Checkpoint Signatures Attested
                    </span>
                  )}
                </div>
                <p className="text-xs font-sans mt-0.5 text-slate-300">
                  {verificationReport.status === 'VALID' &&
                    'Complete cryptographic hash chain verified. All previous-hash pointers, canonical JSON hashes, 7-stage plan completeness, and checkpoint signatures are unbroken.'}
                  {verificationReport.status === 'TAMPERED' &&
                    verificationReport.errorMessage}
                  {verificationReport.status === 'INCOMPLETE' &&
                    verificationReport.errorMessage}
                </p>

                {verificationReport.missingEvents && (
                  <div className="mt-1.5 text-[11px] text-amber-300 font-mono bg-black/40 p-2 rounded border border-amber-900/60">
                    Missing planned events: [{verificationReport.missingEvents.join(', ')}]
                  </div>
                )}
              </div>
            </div>

            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-black/40 border border-slate-800 shrink-0">
              Web Crypto SHA-256 + HMAC
            </span>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">
            No ledger events recorded yet. Run full verification or selective retest above to append cryptographic blocks.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[#070b14] border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px] tracking-wider z-10">
              <tr>
                <th className="py-2.5 px-3">#Seq</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Payload Summary</th>
                <th className="py-2.5 px-3">Previous Hash</th>
                <th className="py-2.5 px-3">Event Hash (SHA-256)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono text-[11px]">
              {events.map((ev, idx) => {
                const isBroken =
                  verificationReport?.status === 'TAMPERED' &&
                  verificationReport.brokenSequenceIndex === idx;

                const isGenesis = idx === 0;

                return (
                  <React.Fragment key={ev.sequence}>
                    <tr
                      className={`hover:bg-[#12192b] transition-colors ${
                        isBroken
                          ? 'bg-rose-950/30 text-rose-200 border-l-2 border-l-rose-500'
                          : idx % 2 === 0
                          ? 'bg-[#090d16]'
                          : 'bg-[#0b101c]'
                      }`}
                    >
                      {/* Seq */}
                      <td className="py-2.5 px-3 text-slate-300 font-bold">
                        #{ev.sequence}
                      </td>

                      {/* Timestamp */}
                      <td className="py-2.5 px-3 text-slate-400 text-[10px] whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>

                      {/* Event Type */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getEventBadge(
                            ev.event_type
                          )}`}
                        >
                          {ev.event_type}
                        </span>
                      </td>

                      {/* Payload Summary */}
                      <td className="py-2.5 px-3 font-sans text-xs max-w-xs truncate text-slate-300">
                        {ev.event_type === 'manifest.captured' && (
                          <span className="text-indigo-300">
                            Manifest bound: <code className="text-slate-400">{ev.payload.canonical_manifest?.configuration_digest?.slice(0, 16)}...</code>
                          </span>
                        )}
                        {ev.event_type === 'test.completed' && (
                          <span>
                            <strong className="font-mono text-cyan-300">{ev.payload.test_id}</strong>:{' '}
                            <span
                              className={
                                ev.payload.status === 'PASS'
                                  ? 'text-emerald-400 font-medium'
                                  : 'text-rose-400 font-medium'
                              }
                            >
                              {ev.payload.status}
                            </span>{' '}
                            ({ev.payload.duration_ms}ms)
                          </span>
                        )}
                        {ev.event_type === 'test.started' && (
                          <span>
                            Probing <strong className="font-mono text-slate-300">{ev.payload.test_id}</strong> (
                            {ev.payload.guarantee_id})
                          </span>
                        )}
                        {ev.event_type === 'run.started' && (
                          <span>
                            Run <code className="text-sky-300">{ev.run_id}</code> ({ev.payload.expected_plan?.length} planned events)
                          </span>
                        )}
                        {ev.event_type === 'policy.decision' && (
                          <span>
                            Verdict: <strong className="text-amber-300">{ev.payload.assurance_state}</strong> (Passed:{' '}
                            {ev.payload.guarantees_passed}/5)
                          </span>
                        )}
                        {ev.event_type === 'checkpoint.signed' && (
                          <span className="text-teal-300 flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-teal-400 shrink-0" />
                            Checkpoint signed ({ev.payload.checkpoint?.key_id})
                          </span>
                        )}
                        {ev.event_type === 'run.completed' && (
                          <span className="text-emerald-300">
                            Run finalized in {ev.payload.total_duration_ms}ms
                          </span>
                        )}
                      </td>

                      {/* Previous Hash */}
                      <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                        <span title={ev.previous_event_hash}>
                          {isGenesis ? 'GENESIS:0000...' : `${ev.previous_event_hash.slice(0, 8)}...`}
                        </span>
                      </td>

                      {/* Event Hash */}
                      <td className="py-2.5 px-3 text-slate-300 text-[10px]">
                        <div className="flex items-center gap-1">
                          <span title={ev.event_hash}>
                            {ev.event_hash.slice(0, 8)}...{ev.event_hash.slice(-4)}
                          </span>
                          <button
                            onClick={() => handleCopy(ev.event_hash)}
                            className="p-0.5 hover:text-white transition"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedHash === ev.event_hash ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {isBroken ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            TAMPERED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            LINKED
                          </span>
                        )}
                      </td>

                      {/* Inspect */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() =>
                            setExpandedSeq(expandedSeq === ev.sequence ? null : ev.sequence)
                          }
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                          title="View canonical JSON"
                        >
                          {expandedSeq === ev.sequence ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded JSON Inspector */}
                    {expandedSeq === ev.sequence && (
                      <tr className="bg-[#050912] border-b border-slate-800">
                        <td colSpan={8} className="p-3">
                          <div className="bg-[#090d16] rounded p-3 border border-slate-800 font-mono text-xs">
                            <div className="flex items-center justify-between text-slate-400 mb-2 pb-1 border-b border-slate-800 text-[11px]">
                              <span>
                                Canonical Event #{ev.sequence} [{ev.event_type}]
                              </span>
                              <span>Full SHA-256: {ev.event_hash}</span>
                            </div>
                            <pre className="text-sky-200 text-[11px] overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(ev, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
