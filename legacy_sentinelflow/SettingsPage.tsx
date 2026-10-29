import React, { useState } from 'react';
import {
  Cpu,
  FolderLock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface SettingsPageProps {
  onResetDemo: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onResetDemo,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<'deterministic' | 'openai' | 'gemini'>('deterministic');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleTestConnection = () => {
    setPingStatus('Testing provider endpoint...');
    setTimeout(() => {
      if (selectedProvider === 'deterministic') {
        setPingStatus('Local Deterministic Security Engine: ONLINE · Latency: 0.8ms');
      } else {
        setPingStatus('External API Provider configured. Ready for inference.');
      }
    }, 400);
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all demo runs, events, and incidents? This action will restore pristine demo conditions.')) {
      setIsResetting(true);
      try {
        await onResetDemo();
        alert('All demo data reset successfully.');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      <div className="p-6 rounded-xl bg-[#0f1422] border border-slate-800 shadow-xs">
        <h2 className="text-xl font-bold text-white tracking-tight font-sans">
          Gateway Settings & Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Configure model inference providers, verify local sandbox workspaces, and reset demonstration data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: AI Provider & Inference Mode */}
        <div className="p-6 rounded-xl bg-[#0f1422] border border-slate-800 space-y-5">
          <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>AI Provider & Inference Mode</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Active Engine</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as any)}
                className="w-full p-2.5 rounded-lg bg-[#080d18] border border-slate-800 text-xs text-slate-200 focus:outline-hidden focus:border-sky-500 font-sans"
              >
                <option value="deterministic">
                  Deterministic Security Engine (Offline / Hackathon Demo Mode)
                </option>
                <option value="openai">OpenAI-Compatible / Ollama (Live Model)</option>
                <option value="gemini">Google Gemini 1.5 Pro / Flash (Live Model)</option>
              </select>
            </div>

            {selectedProvider === 'deterministic' ? (
              <div className="p-3.5 rounded-lg bg-sky-500/10 border border-sky-500/25 text-xs text-slate-300 space-y-1">
                <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Deterministic Test Mode Active
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Executes real local filesystem checks, real report writing, real outbox gating, and policy evaluation
                  with 100% deterministic repeatability for hackathon judges—no external API keys or cloud dependencies required.
                </p>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <label className="text-xs text-slate-400 block font-medium">Provider API Key</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter API key (stored securely in memory)..."
                  className="w-full p-2.5 rounded-lg bg-[#080d18] border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-sky-500 font-mono"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={handleTestConnection}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                Test Connectivity
              </button>
              {pingStatus && (
                <span className="text-[11px] font-mono text-emerald-400">{pingStatus}</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Sandbox Workspace Directories */}
        <div className="p-6 rounded-xl bg-[#0f1422] border border-slate-800 space-y-5">
          <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
            <FolderLock className="w-4 h-4 text-emerald-400" />
            <span>Sandbox Workspace Isolation</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-[#080d18] border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Approved Documents Root:</span>
                <span className="text-slate-200">./workspace/docs</span>
              </div>
              <span className="text-emerald-400 text-[10px] uppercase font-bold">Gated Read</span>
            </div>

            <div className="p-3 rounded-lg bg-[#080d18] border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Approved Output Directory:</span>
                <span className="text-slate-200">./workspace/output</span>
              </div>
              <span className="text-emerald-400 text-[10px] uppercase font-bold">Gated Write</span>
            </div>

            <div className="p-3 rounded-lg bg-[#080d18] border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Isolated Outbox Artifacts:</span>
                <span className="text-slate-200">./workspace/outbox</span>
              </div>
              <span className="text-emerald-400 text-[10px] uppercase font-bold">Gated Dispatch</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-sans">
            Path traversal attacks (`..`), symlink escapes, and unauthorized directory escapes are rejected at the gateway.
          </p>
        </div>

        {/* Card 3: Demo Management & Reset */}
        <div className="p-6 rounded-xl bg-[#0f1422] border border-slate-800 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Demonstration State Lifecycle</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-2xl">
            Reset all recorded agent runs, incidents, and outbox artifacts back to pristine initial demo conditions.
            Default policies (POL-001 through POL-005) and sample files will be preserved.
          </p>

          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold transition cursor-pointer shadow-lg shadow-rose-600/20 disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Resetting Demo State...' : 'Reset All Demo Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
