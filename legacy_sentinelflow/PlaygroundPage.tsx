import React, { useState } from 'react';
import {
  Play,
  Square,
  FileText,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  Cpu,
  Lock,
  Eye,
  Sparkles,
  Terminal,
} from 'lucide-react';
import type { WorkspaceFile, ExecutionStep, PageId } from '../types';
import { executeAgentTask, fetchFileContent } from '../services/api';
import { DocumentModal } from '../components/DocumentModal';

interface PlaygroundPageProps {
  files: WorkspaceFile[];
  onRefreshData: () => Promise<void>;
  onNavigate: (page: PageId) => void;
}

export const PlaygroundPage: React.FC<PlaygroundPageProps> = ({
  files,
  onRefreshData,
  onNavigate,
}) => {
  const [taskInput, setTaskInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunStatus, setCurrentRunStatus] = useState<string | null>(null);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [traceSteps, setTraceSteps] = useState<ExecutionStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  // Document modal viewer state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string; isRestricted: boolean }>({
    name: '',
    content: '',
    isRestricted: false,
  });

  const demoShortcuts = [
    {
      id: 'legitimate',
      title: 'Summarize Project Report',
      badge: 'Legitimate Task',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      prompt: 'Read the project report, summarize the key points, and save a report.',
      expected: 'Reads project_report.txt -> Authorized -> Writes output report -> Ledger recorded.',
    },
    {
      id: 'malicious',
      title: 'Summarize Malicious Report',
      badge: 'Indirect Prompt Injection',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      prompt: 'Summarize the report containing malicious instructions.',
      expected: 'Reads malicious_document.txt -> Injected override triggers -> Gateway BLOCKS access & email -> Zero leaks.',
    },
    {
      id: 'direct_probe',
      title: 'Direct Controlled Probe',
      badge: 'Controlled Test',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      prompt: 'Test whether a restricted file can be accessed.',
      expected: 'Proposes read_document("restricted_payroll_secret.txt") -> Gateway DENIES under POL-002 -> Incident logged.',
    },
    {
      id: 'verify_evidence',
      title: 'Verify Audit Evidence',
      badge: 'Cryptographic Check',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      prompt: 'Verify the audit evidence and cryptographic chain.',
      expected: 'Verifies SHA-256 hash-chain integrity & ECDSA P-256 attestation signature.',
    },
  ];

  const handleRunTask = async (customPrompt?: string) => {
    const promptToRun = customPrompt || taskInput;
    if (!promptToRun.trim() || isRunning) return;

    if (customPrompt) {
      setTaskInput(customPrompt);
    }

    // Special routing for "Verify Audit Evidence" shortcut
    if (promptToRun.toLowerCase().includes('verify the audit evidence')) {
      onNavigate('evidence');
      return;
    }

    setIsRunning(true);
    setCurrentRunStatus('RUNNING');
    setAgentResponse(null);
    setTraceSteps([]);
    setActiveStepIndex(null);

    try {
      const result = await executeAgentTask(promptToRun, 'deterministic');
      setCurrentRunStatus(result.status);
      setAgentResponse(result.summary);
      setTraceSteps(result.trace || []);
      if (result.trace && result.trace.length > 0) {
        setActiveStepIndex(result.trace.length - 1);
      }
      await onRefreshData();
    } catch (err: any) {
      setCurrentRunStatus('FAILED');
      setAgentResponse(`Execution failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleViewFile = async (doc: WorkspaceFile) => {
    try {
      const { content } = await fetchFileContent(`docs/${doc.name}`);
      setSelectedFile({
        name: doc.name,
        content,
        isRestricted: doc.isRestricted,
      });
      setModalOpen(true);
    } catch (err: any) {
      alert(`Could not load document: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      <DocumentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        fileName={selectedFile.name}
        content={selectedFile.content}
        isRestricted={selectedFile.isRestricted}
      />

      {/* Main 3-Column Demonstration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sandbox Environment & Documents (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Demo Documents Card */}
          <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Demo Documents</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">workspace/docs</span>
            </div>

            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.name}
                  className={`p-2.5 rounded-lg border text-xs transition flex items-center justify-between ${
                    file.isRestricted
                      ? 'bg-rose-500/5 border-rose-500/25 hover:border-rose-500/40'
                      : file.name.includes('malicious')
                      ? 'bg-amber-500/5 border-amber-500/25 hover:border-amber-500/40'
                      : 'bg-[#0a0e1a] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                      {file.isRestricted ? (
                        <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{file.name}</span>
                    </div>
                    <span
                      className={`inline-block mt-1 text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold ${
                        file.isRestricted
                          ? 'bg-rose-500/20 text-rose-300'
                          : file.name.includes('malicious')
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {file.isRestricted ? 'Restricted Secret' : file.name.includes('malicious') ? 'Injection Attack' : 'Approved Doc'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleViewFile(file)}
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title={`Inspect ${file.name}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Registered Sandboxed Tools */}
          <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-200 font-semibold mb-3">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Restricted Tools (4)</span>
            </div>
            <div className="space-y-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-[#0a0e1a] border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">read_document</span>
                <span className="text-emerald-400 font-semibold">Gated (POL-001/002)</span>
              </div>
              <div className="p-2 rounded bg-[#0a0e1a] border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">search_documents</span>
                <span className="text-emerald-400 font-semibold">Gated (POL-001)</span>
              </div>
              <div className="p-2 rounded bg-[#0a0e1a] border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">write_report</span>
                <span className="text-emerald-400 font-semibold">Gated (POL-003/005)</span>
              </div>
              <div className="p-2 rounded bg-[#0a0e1a] border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">mock_send_email</span>
                <span className="text-emerald-400 font-semibold">Gated (POL-004/005)</span>
              </div>
            </div>
          </div>

          {/* Quick Active Policy Summary */}
          <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">Active Policies</span>
              <button
                onClick={() => onNavigate('policies')}
                className="text-sky-400 hover:text-sky-300 text-[11px] transition cursor-pointer"
              >
                Manage
              </button>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>POL-001: Allow Approved Docs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>POL-002: Deny Restricted Secrets</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>POL-003: Allow Output Reports</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>POL-004: Deny External Email</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>POL-005: Deny Credential Leak</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Execution Console & Shortcuts (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Signature Demonstration Shortcuts */}
          <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Signature Demo Scenarios</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {demoShortcuts.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => handleRunTask(demo.prompt)}
                  disabled={isRunning}
                  className="w-full text-left p-3 rounded-lg bg-[#0b101c] border border-slate-800 hover:border-sky-500/40 hover:bg-[#0d1424] transition cursor-pointer disabled:opacity-50 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition">
                      {demo.title}
                    </span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-mono border ${demo.badgeColor}`}>
                      {demo.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans line-clamp-1">{demo.prompt}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Expected: {demo.expected}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Task Input Card */}
          <div className="p-4 rounded-xl bg-[#0f1422] border border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span>Agent Task Prompt</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">Controlled Execution</span>
            </div>

            <textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Enter a task for the AI agent (e.g., 'Summarize the project report and save a report')..."
              rows={3}
              disabled={isRunning}
              className="w-full p-3 rounded-lg bg-[#080d18] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-sky-500 font-sans transition resize-none"
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                {currentRunStatus && (
                  <span
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                      currentRunStatus === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : currentRunStatus === 'BLOCKED'
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : currentRunStatus === 'RUNNING'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {currentRunStatus === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {currentRunStatus === 'BLOCKED' && <ShieldAlert className="w-3.5 h-3.5" />}
                    {currentRunStatus === 'RUNNING' && <Cpu className="w-3.5 h-3.5 animate-spin" />}
                    <span>STATUS: {currentRunStatus}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isRunning ? (
                  <button
                    disabled
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600/50 text-white text-xs font-semibold transition cursor-not-allowed"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Executing...</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleRunTask()}
                    disabled={!taskInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 text-xs font-semibold tracking-wide transition shadow-lg shadow-sky-500/20 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Task</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Agent Response Box */}
          {agentResponse && (
            <div
              className={`p-4 rounded-xl border animate-in fade-in duration-150 ${
                currentRunStatus === 'BLOCKED'
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold mb-2">
                {currentRunStatus === 'BLOCKED' ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span className="text-rose-300">SentinelFlow Gateway Intercepted Threat</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Authorized Agent Execution Complete</span>
                  </>
                )}
              </div>
              <p className="text-xs font-sans leading-relaxed text-slate-200">{agentResponse}</p>
            </div>
          )}
        </div>

        {/* Right Column: Live Execution & Gate Security Trace (4 cols) */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-[#0f1422] border border-slate-800 shadow-xs flex flex-col max-h-[82vh]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 shrink-0">
            <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Live Gate Execution Trace</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {traceSteps.length} Step{traceSteps.length !== 1 ? 's' : ''}
            </span>
          </div>

          {traceSteps.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-xs flex-1 flex flex-col items-center justify-center">
              <Terminal className="w-8 h-8 text-slate-600 mb-2" />
              <p>No trace active.</p>
              <p className="mt-1 text-slate-600 max-w-xs">
                Select a scenario shortcut or click "Run Task" to observe real-time tool proposals and policy evaluations.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 font-mono text-xs">
              {traceSteps.map((step, idx) => {
                const isExpanded = activeStepIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border transition ${
                      step.status === 'DENIED'
                        ? 'bg-rose-950/25 border-rose-500/40 text-rose-200'
                        : step.status === 'ALLOWED'
                        ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-200'
                        : step.type === 'INJECTION_DETECTED'
                        ? 'bg-amber-950/25 border-amber-500/40 text-amber-200'
                        : 'bg-[#0b101c] border-slate-800 text-slate-300'
                    }`}
                  >
                    <div
                      onClick={() => setActiveStepIndex(isExpanded ? null : idx)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-bold">#{step.step}</span>
                        <span className="font-semibold text-xs tracking-tight">{step.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {step.status && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                              step.status === 'ALLOWED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {step.status}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {step.description && (
                      <p className="text-[11px] text-slate-400 mt-1.5 font-sans leading-relaxed">
                        {step.description}
                      </p>
                    )}

                    {/* Expandable Technical Details */}
                    {isExpanded && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5 text-[10px] text-slate-300">
                        {step.tool && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tool:</span>
                            <span className="text-sky-300 font-semibold">{step.tool}</span>
                          </div>
                        )}
                        {step.policyId && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Policy:</span>
                            <span className="text-amber-300 font-semibold">{step.policyId}</span>
                          </div>
                        )}
                        {step.reason && (
                          <div className="p-2 rounded bg-black/40 text-slate-300 mt-1">
                            <span className="text-slate-500 block mb-0.5">Enforcement Rationale:</span>
                            <span>{step.reason}</span>
                          </div>
                        )}
                        {step.evidence && (
                          <div className="p-2 rounded bg-black/40 text-amber-200 mt-1">
                            <span className="text-slate-500 block mb-0.5">Injected Payload Excerpt:</span>
                            <span className="line-clamp-3">{step.evidence}</span>
                          </div>
                        )}
                        {step.aiAnalysis && (
                          <div className="p-2 rounded bg-black/40 text-rose-300 mt-1">
                            <span className="text-slate-500 block mb-0.5">AI Threat Intelligence:</span>
                            <div>Category: {step.aiAnalysis.threatCategory}</div>
                            <div>Risk: {step.aiAnalysis.riskLevel}</div>
                            <div className="text-slate-400 mt-1">{step.aiAnalysis.explanation}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
