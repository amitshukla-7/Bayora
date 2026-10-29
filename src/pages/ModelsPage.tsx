import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Search,
  Flame,
  Trash2,
  X,
  Info
} from 'lucide-react';
import type { Model, PageId } from '../types';
import { createModel, deleteModel } from '../services/api';

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

  // Form states
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

  const providers = ['All', 'OpenAI', 'Meta', 'Mistral AI', 'Hugging Face'];

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
        description: formDesc || 'Enterprise AI model configured for Bayora evaluation.',
        risk_score: 25,
        total_evaluations: 0,
        pass_rate: 90.0
      });

      await onRefreshData();
      setShowAddModal(false);
      if (onCloseAddModal) onCloseAddModal();
      // Reset form
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

  const handleDeleteModel = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete model "${name}"?`)) return;
    try {
      await deleteModel(id);
      await onRefreshData();
      if (selectedModel?.id === id) setSelectedModel(null);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
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
            Register, configure, and inspect AI models subjected to security evaluations.
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
            <strong>Local Prototype Mode:</strong> All models are evaluated using transparent, deterministic simulation adapters. No paid external API keys are required.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-purple-700 font-semibold">
          Offline Capable
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
        {filteredModels.map((m) => (
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

                {/* Execution Mode Badge */}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                  {m.execution_mode}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {m.description}
              </p>
            </div>

            {/* Metrics Breakdown */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-50/80">
                <div className="text-[10px] text-slate-400 uppercase font-medium">Risk Score</div>
                <div className="text-sm font-bold font-mono text-slate-800">{m.risk_score}/100</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50/80">
                <div className="text-[10px] text-slate-400 uppercase font-medium">Pass Rate</div>
                <div className="text-sm font-bold font-mono text-emerald-600">{m.pass_rate}%</div>
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
        ))}
      </div>

      {/* Model Detail Drawer */}
      {selectedModel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white/95 backdrop-blur-xl border-l border-slate-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
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
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Version</span>
                <div className="font-mono font-semibold text-slate-800 text-xs">{selectedModel.version}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Historical Performance</h4>
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

      {/* Add Model Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#8762E0]" />
                <span>Register Model Adapter</span>
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

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs">{errorMsg}</div>
            )}

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
                    <option value="Simulation">Simulation (Offline Adapter)</option>
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
          </div>
        </div>
      )}
    </div>
  );
};
