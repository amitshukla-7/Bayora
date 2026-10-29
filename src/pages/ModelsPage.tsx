import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Search,
  Flame,
  Trash2,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UploadCloud,
  Download,
  ShieldCheck,
  ShieldAlert,
  FileCheck
} from 'lucide-react';
import type { Model, PageId, VerificationReport } from '../types';
import {
  createModel,
  deleteModel,
  verifyModelApi,
  pullOllamaModelApi,
  uploadGgufModelApi,
  importHuggingFaceModelApi
} from '../services/api';

interface ModelsPageProps {
  models: Model[];
  onNavigate: (page: PageId, extraId?: string) => void;
  onRefreshData: () => Promise<void>;
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

export const ModelsPage: React.FC<ModelsPageProps> = ({
  models,
  onNavigate,
  onRefreshData,
  isAddModalOpen: initialModalOpen = false,
  onCloseAddModal,
}) => {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [showAddModal, setShowAddModal] = useState(initialModalOpen);
  const [activeTab, setActiveTab] = useState<'custom' | 'ollama' | 'gguf' | 'hf'>('custom');

  // Form states - Custom / Adapter
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('OpenAI');
  const [formIdentifier, setFormIdentifier] = useState('');
  const [formVersion] = useState('1.0.0');
  const [formType] = useState('Instruct LLM');
  const [formMode, setFormMode] = useState<'Simulation' | 'Mock API' | 'Live'>('Simulation');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Ollama Pull State
  const [ollamaTag, setOllamaTag] = useState('');
  const [isPulling, setIsPulling] = useState(false);

  // GGUF Upload State
  const [selectedGgufFile, setSelectedGgufFile] = useState<File | null>(null);
  const [isUploadingGguf, setIsUploadingGguf] = useState(false);

  // Hugging Face Import State
  const [hfRepoId, setHfRepoId] = useState('');
  const [isImportingHf, setIsImportingHf] = useState(false);

  // Model Verification State
  const [isVerifyingId, setIsVerifyingId] = useState<string | null>(null);

  const providers = ['All', 'OpenAI', 'Meta', 'Mistral AI', 'Hugging Face', 'Ollama', 'Local GGUF'];

  const filteredModels = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.identifier.toLowerCase().includes(search.toLowerCase());
    const matchesProvider = providerFilter === 'All' || m.provider === providerFilter;
    return matchesSearch && matchesProvider;
  });

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formIdentifier.trim()) {
      setErrorMsg('Model name and identifier are required.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await createModel({
        name: formName,
        provider: formProvider,
        identifier: formIdentifier,
        version: formVersion,
        model_type: formType,
        execution_mode: formMode,
        endpoint: formEndpoint,
        description: formDesc || 'Enterprise AI model configured for Bayora evaluation.'
      });

      await onRefreshData();
      setShowAddModal(false);
      if (onCloseAddModal) onCloseAddModal();
      setFormName('');
      setFormIdentifier('');
      setFormEndpoint('');
      setFormDesc('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create model.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePullOllama = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ollamaTag.trim()) {
      setErrorMsg('Ollama model tag is required (e.g. llama3.2:1b, mistral:7b).');
      return;
    }
    setErrorMsg('');
    setIsPulling(true);

    try {
      await pullOllamaModelApi(ollamaTag.trim());
      await onRefreshData();
      setShowAddModal(false);
      if (onCloseAddModal) onCloseAddModal();
      setOllamaTag('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to pull Ollama model.');
    } finally {
      setIsPulling(false);
    }
  };

  const handleUploadGguf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGgufFile) {
      setErrorMsg('Please select a .gguf file to upload.');
      return;
    }
    if (selectedGgufFile.name.endsWith('.pt') || selectedGgufFile.name.endsWith('.bin') || selectedGgufFile.name.endsWith('.pkl')) {
      setErrorMsg('SECURITY POLICY: Arbitrary pickle weight uploads are blocked (CWE-502). Only .gguf format permitted.');
      return;
    }
    setErrorMsg('');
    setIsUploadingGguf(true);

    try {
      await uploadGgufModelApi(selectedGgufFile);
      await onRefreshData();
      setShowAddModal(false);
      if (onCloseAddModal) onCloseAddModal();
      setSelectedGgufFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload GGUF file.');
    } finally {
      setIsUploadingGguf(false);
    }
  };

  const handleImportHf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hfRepoId.trim()) {
      setErrorMsg('Hugging Face repo ID is required (e.g. meta-llama/Llama-3.2-3B-Instruct).');
      return;
    }
    setErrorMsg('');
    setIsImportingHf(true);

    try {
      await importHuggingFaceModelApi(hfRepoId.trim());
      await onRefreshData();
      setShowAddModal(false);
      if (onCloseAddModal) onCloseAddModal();
      setHfRepoId('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import Hugging Face model.');
    } finally {
      setIsImportingHf(false);
    }
  };

  const handleVerifyModel = async (id: string) => {
    setIsVerifyingId(id);
    try {
      const updated = await verifyModelApi(id);
      await onRefreshData();
      if (selectedModel?.id === id) {
        setSelectedModel(updated);
      }
    } catch (err: any) {
      alert(`Model verification failed: ${err.message}`);
    } finally {
      setIsVerifyingId(null);
    }
  };

  const handleDeleteModel = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete model "${name}"?`)) return;
    try {
      await deleteModel(id);
      await onRefreshData();
      if (selectedModel?.id === id) setSelectedModel(null);
    } catch (err: any) {
      alert(`Failed to delete model: ${err.message}`);
    }
  };

  const parseVerificationDetails = (details: any): VerificationReport | null => {
    if (!details) return null;
    if (typeof details === 'object') return details as VerificationReport;
    try {
      return JSON.parse(details) as VerificationReport;
    } catch {
      return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Model Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Register, verify, and inspect AI models subjected to security evaluations.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bayora-btn-primary px-4 py-2.5 text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register Model</span>
        </button>
      </div>

      {/* Transparent Disclaimer Notice */}
      <div className="p-4 rounded-2xl bg-[#f4efff]/80 border border-[#e5d9fd] text-xs text-[#7952D8] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-[#8762E0]" />
          <span>
            <strong>Deterministic Evaluation Pipeline:</strong> Models can run via local GGUF, Ollama endpoints, or isolated simulation adapters. Metrics are computed in real time from raw evaluation rows in SQLite.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-purple-700 font-semibold">
          Fail-Closed Nonce Verification
        </span>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter models by name or identifier..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 outline-hidden focus:border-[#9B7DE8] shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
          {providers.map((p) => (
            <button
              key={p}
              onClick={() => setProviderFilter(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                providerFilter === p
                  ? 'bg-[#9B7DE8] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredModels.map((m) => {
          const isVerifying = isVerifyingId === m.id;
          const statusBadge = () => {
            if (m.status === 'FAILED_VERIFICATION') {
              return (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-mono flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> FAILED
                </span>
              );
            }
            if (m.status === 'PULLING') {
              return (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-mono flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> PULLING
                </span>
              );
            }
            if (m.status === 'Active') {
              return (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> VERIFIED
                </span>
              );
            }
            return (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                {m.status}
              </span>
            );
          };

          return (
            <div
              key={m.id}
              className="bayora-card p-6 flex flex-col justify-between space-y-4 hover:border-[#9B7DE8]/50 transition-all cursor-pointer"
              onClick={() => setSelectedModel(m)}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f4efff] to-white border border-[#e5d9fd] flex items-center justify-center text-[#8762E0] shadow-2xs">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{m.name}</h3>
                      <div className="text-[11px] font-mono text-slate-500">{m.identifier}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {statusBadge()}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                      {m.execution_mode}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {m.description}
                </p>
              </div>

              {/* Metrics Breakdown - Honest Empty States */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50/80">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Risk Score</div>
                  <div className="text-sm font-bold font-mono text-slate-800">
                    {m.risk_score !== null && m.risk_score !== undefined ? `${m.risk_score}/100` : '—'}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/80">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Pass Rate</div>
                  <div className={`text-sm font-bold font-mono ${m.pass_rate !== null ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {m.pass_rate !== null && m.pass_rate !== undefined ? `${m.pass_rate}%` : '—'}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/80">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Evaluations</div>
                  <div className="text-sm font-bold font-mono text-slate-800">{m.total_evaluations}</div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  Registered {new Date(m.registered_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVerifyModel(m.id);
                    }}
                    disabled={isVerifying}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    title="Run Verification Pipeline (Connectivity + Tag + Nonce Echo)"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-[#8762E0]' : ''}`} />
                    <span>Verify</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('redteam');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#f4efff] hover:bg-[#ede5fd] text-[#7952D8] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Test Model</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteModel(m.id, m.name);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete Model"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Detail Drawer */}
      {selectedModel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[540px] bg-white/95 backdrop-blur-xl border-l border-slate-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#8762E0] flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedModel.name}</h2>
                <div className="text-xs text-slate-500 font-mono">{selectedModel.identifier}</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedModel(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
            <div>
              <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2">Description</h4>
              <p className="leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                {selectedModel.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Provider</span>
                <div className="font-semibold text-slate-800 text-xs">{selectedModel.provider}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Model Type</span>
                <div className="font-semibold text-slate-800 text-xs">{selectedModel.model_type}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Execution Mode</span>
                <div className="font-semibold text-purple-700 text-xs">{selectedModel.execution_mode}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Status</span>
                <div className="font-mono font-semibold text-slate-800 text-xs">{selectedModel.status}</div>
              </div>
            </div>

            {/* GGUF / File Specs if present */}
            {selectedModel.sha256 && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">SHA-256 Digest</span>
                <div className="font-mono text-[10px] text-slate-600 break-all">{selectedModel.sha256}</div>
              </div>
            )}

            {/* Verification Pipeline Report */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  Verification Pipeline Report
                </h4>
                <button
                  onClick={() => handleVerifyModel(selectedModel.id)}
                  disabled={isVerifyingId === selectedModel.id}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#7952D8] hover:bg-purple-100 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isVerifyingId === selectedModel.id ? 'animate-spin' : ''}`} />
                  <span>Re-Verify</span>
                </button>
              </div>

              {(() => {
                const details = parseVerificationDetails(selectedModel.verification_details);
                if (!details) {
                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                      No verification report generated yet. Click &quot;Re-Verify&quot; to test model connectivity, model tag, and nonce echo smoke test.
                    </div>
                  );
                }

                return (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Last Verified:</span>
                      <span className="font-mono text-[11px] text-slate-700">
                        {new Date(details.timestamp || details.verifiedAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    {details.pingMs !== undefined && (
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-500">Latency Ping:</span>
                        <span className="font-mono text-[11px] text-emerald-600 font-bold">{details.pingMs} ms</span>
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      {Array.isArray(details.steps) ? (
                        details.steps.map((st) => (
                          <div key={st.step} className="flex items-start gap-2">
                            {st.status === 'PASS' || st.status === 'passed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : st.status === 'FAIL' || st.status === 'failed' ? (
                              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            ) : (
                              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="font-semibold text-slate-800 flex items-center justify-between">
                                <span>{st.step}. {st.name}</span>
                                {st.latencyMs !== undefined && (
                                  <span className="font-mono text-[10px] text-slate-400">{st.latencyMs}ms</span>
                                )}
                              </div>
                              {st.error && (
                                <div className="text-[11px] text-red-600 mt-0.5">{st.error}</div>
                              )}
                              {st.nonce && (
                                <div className="text-[10px] font-mono text-purple-700 mt-0.5">Nonce: {st.nonce}</div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-500 text-xs">Verification data format unrecognized.</div>
                      )}

                      {details.diagnostic && (
                        <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                          <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-slate-900">Diagnostic Summary</div>
                            <div className="text-[11px] text-slate-600">{details.diagnostic}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Historical Performance - Honest Empty States */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Historical Performance</h4>
              {selectedModel.pass_rate === null || selectedModel.pass_rate === undefined ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                  No evaluation runs recorded for this model yet. Metrics will compute dynamically once evaluations are executed in the Red Team lab.
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Pass Rate</span>
                    <span className="font-bold text-emerald-600 font-mono text-sm">{selectedModel.pass_rate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${selectedModel.pass_rate}%` }} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Risk Exposure Score</span>
                    <span className="font-bold text-slate-800 font-mono text-sm">{selectedModel.risk_score} / 100</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedModel(null);
                  onNavigate('redteam');
                }}
                className="bayora-btn-primary flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                <span>Launch Red Team Run</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Model Modal with 4 Segmented Tabs */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#8762E0]" />
                <span>Register Model Target</span>
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  if (onCloseAddModal) onCloseAddModal();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Tab Bar */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl text-xs font-medium">
              <button
                type="button"
                onClick={() => { setActiveTab('custom'); setErrorMsg(''); }}
                className={`py-1.5 rounded-xl cursor-pointer transition-all ${
                  activeTab === 'custom' ? 'bg-white shadow-2xs text-[#7952D8] font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Manual Adapter
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('ollama'); setErrorMsg(''); }}
                className={`py-1.5 rounded-xl cursor-pointer transition-all ${
                  activeTab === 'ollama' ? 'bg-white shadow-2xs text-[#7952D8] font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ollama Pull
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('gguf'); setErrorMsg(''); }}
                className={`py-1.5 rounded-xl cursor-pointer transition-all ${
                  activeTab === 'gguf' ? 'bg-white shadow-2xs text-[#7952D8] font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                GGUF Upload
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('hf'); setErrorMsg(''); }}
                className={`py-1.5 rounded-xl cursor-pointer transition-all ${
                  activeTab === 'hf' ? 'bg-white shadow-2xs text-[#7952D8] font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hugging Face
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Tab 1: Manual / API Adapter */}
            {activeTab === 'custom' && (
              <form onSubmit={handleCreateModel} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Model Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Claude 3.5 Sonnet"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-hidden focus:border-[#9B7DE8]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Provider</label>
                    <select
                      value={formProvider}
                      onChange={(e) => setFormProvider(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-hidden focus:border-[#9B7DE8]"
                    >
                      <option value="OpenAI">OpenAI</option>
                      <option value="Anthropic">Anthropic</option>
                      <option value="Meta">Meta</option>
                      <option value="Mistral AI">Mistral AI</option>
                      <option value="Hugging Face">Hugging Face</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Model Identifier</label>
                    <input
                      type="text"
                      required
                      value={formIdentifier}
                      onChange={(e) => setFormIdentifier(e.target.value)}
                      placeholder="e.g. claude-3-5-sonnet-20241022"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] outline-hidden focus:border-[#9B7DE8]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Execution Mode</label>
                    <select
                      value={formMode}
                      onChange={(e) => setFormMode(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-hidden focus:border-[#9B7DE8]"
                    >
                      <option value="Simulation">Simulation (Deterministic Adapter)</option>
                      <option value="Mock API">Mock API</option>
                      <option value="Live">Live Provider</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Endpoint URL (Optional)</label>
                  <input
                    type="text"
                    value={formEndpoint}
                    onChange={(e) => setFormEndpoint(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] outline-hidden focus:border-[#9B7DE8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Model capabilities, purpose, and safety constraints..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-hidden focus:border-[#9B7DE8]"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      if (onCloseAddModal) onCloseAddModal();
                    }}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bayora-btn-primary px-5 py-2 font-semibold cursor-pointer"
                  >
                    {isSubmitting ? 'Registering...' : 'Save Model'}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Ollama Pull */}
            {activeTab === 'ollama' && (
              <form onSubmit={handlePullOllama} className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Download className="w-4 h-4 text-[#8762E0]" />
                    <span>Pull from Local Ollama Daemon</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Connects directly to your local Ollama instance (<code className="font-mono text-purple-700">http://localhost:11434</code>), triggers the model download, and performs a 4-step nonce echo smoke test before marking the model verified.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Ollama Model Tag</label>
                  <input
                    type="text"
                    required
                    value={ollamaTag}
                    onChange={(e) => setOllamaTag(e.target.value)}
                    placeholder="e.g. llama3.2:1b, mistral:7b, qwen2.5:0.5b"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] outline-hidden focus:border-[#9B7DE8]"
                  />
                  <span className="text-[10px] text-slate-400">Must match a tag available in the Ollama library.</span>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      if (onCloseAddModal) onCloseAddModal();
                    }}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPulling}
                    className="bayora-btn-primary px-5 py-2 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    {isPulling && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isPulling ? 'Pulling Model...' : 'Pull & Verify'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: Local GGUF Upload */}
            {activeTab === 'gguf' && (
              <form onSubmit={handleUploadGguf} className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>CWE-502 Deserialization Protection</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Arbitrary PyTorch pickle weights (<code className="font-mono">.pt</code>, <code className="font-mono">.bin</code>, <code className="font-mono">.pkl</code>) execute arbitrary code during unpickling and are strictly rejected. Only binary <strong>GGUF</strong> files with verified magic bytes (<code className="font-mono">0x47 0x47 0x55 0x46</code>) are accepted.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Select .gguf File</label>
                  <input
                    type="file"
                    accept=".gguf"
                    onChange={(e) => setSelectedGgufFile(e.target.files?.[0] || null)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-hidden focus:border-[#9B7DE8] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer"
                  />
                  {selectedGgufFile && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{selectedGgufFile.name} ({(selectedGgufFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      if (onCloseAddModal) onCloseAddModal();
                    }}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingGguf || !selectedGgufFile}
                    className="bayora-btn-primary px-5 py-2 font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingGguf && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isUploadingGguf ? 'Validating Magic Bytes...' : 'Upload & Validate'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 4: Hugging Face Import */}
            {activeTab === 'hf' && (
              <form onSubmit={handleImportHf} className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <UploadCloud className="w-4 h-4 text-[#8762E0]" />
                    <span>Hugging Face Hub Safe Import</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Inspects repository tree metadata via the Hugging Face API. Repositories containing unsafe pickle weights without SafeTensors or GGUF will be rejected.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Repository ID</label>
                  <input
                    type="text"
                    required
                    value={hfRepoId}
                    onChange={(e) => setHfRepoId(e.target.value)}
                    placeholder="e.g. meta-llama/Llama-3.2-3B-Instruct"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] outline-hidden focus:border-[#9B7DE8]"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      if (onCloseAddModal) onCloseAddModal();
                    }}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isImportingHf}
                    className="bayora-btn-primary px-5 py-2 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    {isImportingHf && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isImportingHf ? 'Validating SafeTensors...' : 'Import Model'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
