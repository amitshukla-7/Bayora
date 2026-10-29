import React from 'react';
import { ShieldCheck, Server } from 'lucide-react';
import type { PageId } from '../types';

interface ProfilePageProps {
  onNavigate?: (page: PageId) => void;
  onResetDemo: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onResetDemo,
}) => {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Profile & Workspace Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your operator identity and local authentication sessions.
        </p>
      </div>

      {/* User Card */}
      <div className="bayora-card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#9B7DE8] to-[#C4B5FD] flex items-center justify-center text-white text-2xl font-bold shadow-md">
          AS
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Amit Shukla</h2>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 self-center sm:self-auto">
              Principal Architect
            </span>
          </div>
          <div className="text-xs text-slate-500 font-mono">amit.shukla@bayora.enterprise</div>
          <div className="text-xs text-slate-400">Organization: Bayora Technologies · Role: AI Security Lead</div>
        </div>
      </div>

      {/* Workspace Cluster Card */}
      <div className="bayora-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#8762E0] flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bayora Platform Workspace</h3>
              <p className="text-xs text-slate-500">Enterprise · AI Security Dedicated Cluster</p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700">
            Local Dedicated
          </span>
        </div>
      </div>

      {/* Security Credentials & Session Controls */}
      <div className="bayora-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#8762E0]" />
          <span>Security & Session Identity</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <div className="font-semibold text-slate-800">Operator Session Token</div>
              <div className="font-mono text-[11px] text-slate-400">byra_session_prod_live_890123...</div>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <div className="font-semibold text-slate-800">Local Zero-Trust Boundary</div>
              <div className="text-[11px] text-slate-400">Fail-closed policy gating enabled</div>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Enforcing
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={onResetDemo}
            className="bayora-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Reset Workspace Fixtures
          </button>
        </div>
      </div>
    </div>
  );
};
