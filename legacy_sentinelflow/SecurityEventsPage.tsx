import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  X,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';
import type { SecurityEvent } from '../types';

interface SecurityEventsPageProps {
  events: SecurityEvent[];
}

export const SecurityEventsPage: React.FC<SecurityEventsPageProps> = ({ events }) => {
  const [filter, setFilter] = useState<'ALL' | 'BLOCKED' | 'ALLOWED' | 'INCIDENTS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const filteredEvents = events.filter((e) => {
    // Tab filter
    if (filter === 'BLOCKED' && e.decision !== 'DENIED') return false;
    if (filter === 'ALLOWED' && e.decision !== 'ALLOWED') return false;
    if (filter === 'INCIDENTS' && e.event_type !== 'action.denied' && !e.payload?.riskLevel) return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.event_type.toLowerCase().includes(q) ||
      (e.tool_name && e.tool_name.toLowerCase().includes(q)) ||
      (e.resource && e.resource.toLowerCase().includes(q)) ||
      (e.run_id && e.run_id.toLowerCase().includes(q)) ||
      (e.payload?.reason && String(e.payload.reason).toLowerCase().includes(q))
    );
  });

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight font-sans">
            Security Events & Evaluation Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Searchable log of all policy evaluations, tool proposals, and blocked security incidents.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by tool, resource, or policy..."
              className="pl-9 pr-4 py-2 rounded-lg bg-[#0f1422] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-sky-500 w-64 font-sans"
            />
          </div>

          <div className="flex rounded-lg bg-[#0f1422] border border-slate-800 p-0.5 text-xs font-medium">
            {(['ALL', 'BLOCKED', 'ALLOWED', 'INCIDENTS'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                  filter === tab
                    ? 'bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'ALL'
                  ? 'All'
                  : tab === 'BLOCKED'
                  ? 'Blocked'
                  : tab === 'ALLOWED'
                  ? 'Allowed'
                  : 'Incidents'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Table Card */}
      <div className="rounded-xl bg-[#0f1422] border border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0c111e]/80 text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-4 font-semibold">SEQ #</th>
                <th className="py-3 px-4 font-semibold">TIMESTAMP</th>
                <th className="py-3 px-4 font-semibold">EVENT TYPE</th>
                <th className="py-3 px-4 font-semibold">TOOL / TARGET</th>
                <th className="py-3 px-4 font-semibold">DECISION</th>
                <th className="py-3 px-4 font-semibold">POLICY ID</th>
                <th className="py-3 px-4 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans text-xs">
                    No security events match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr
                    key={event.sequence}
                    className="hover:bg-[#12192b]/60 transition cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <td className="py-3 px-4 text-slate-400 font-bold">#{event.sequence}</td>
                    <td className="py-3 px-4 text-slate-400 font-sans">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-semibold">{event.event_type}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {event.tool_name ? (
                        <span className="text-sky-300">{event.tool_name}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                      {event.resource && (
                        <span className="text-slate-400 ml-1.5 font-normal">({event.resource})</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          event.decision === 'ALLOWED'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : event.decision === 'DENIED'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {event.decision}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-amber-300">
                      {event.payload?.policyId || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-[10px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Details Slide-Over / Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#0f1422] border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-[#131b2e] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    selectedEvent.decision === 'DENIED'
                      ? 'bg-rose-500/15 text-rose-400'
                      : selectedEvent.decision === 'ALLOWED'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-sky-500/15 text-sky-400'
                  }`}
                >
                  {selectedEvent.decision === 'DENIED' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-mono">
                      Event #{selectedEvent.sequence} · {selectedEvent.event_type}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        selectedEvent.decision === 'ALLOWED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : selectedEvent.decision === 'DENIED'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {selectedEvent.decision}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Run ID: {selectedEvent.run_id} · Timestamp: {selectedEvent.timestamp}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 font-sans">
              {/* Decision & Policy Match */}
              {selectedEvent.payload?.policyId && (
                <div className="p-4 rounded-lg bg-[#0b101c] border border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                    Policy Evaluation Result
                  </span>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className="text-amber-300 font-mono">{selectedEvent.payload.policyId}</span>
                    <span>·</span>
                    <span>{selectedEvent.payload.policyName || 'Enforcement Rule'}</span>
                  </div>
                  {selectedEvent.payload.reason && (
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">
                      {selectedEvent.payload.reason}
                    </p>
                  )}
                </div>
              )}

              {/* Cryptographic Hash Verification Block */}
              <div className="p-4 rounded-lg bg-[#0b101c] border border-slate-800 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5 font-sans font-semibold text-sky-400">
                    <KeyRound className="w-3.5 h-3.5" />
                    Cryptographic Integrity Proof
                  </span>
                  <button
                    onClick={() => handleCopyHash(selectedEvent.event_hash)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
                  </button>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Previous Event Hash:</span>
                  <span className="text-slate-400 break-all select-all">{selectedEvent.previous_event_hash}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Current Event Hash (SHA-256):</span>
                  <span className="text-sky-300 break-all select-all font-semibold">{selectedEvent.event_hash}</span>
                </div>
              </div>

              {/* Raw JSON Payload */}
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                  Canonical Event Payload
                </span>
                <pre className="p-4 rounded-lg bg-[#080d18] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#0f1422] flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
