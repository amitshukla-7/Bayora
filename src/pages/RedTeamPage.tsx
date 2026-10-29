import React, { useState } from 'react';
import {
  Flame,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Sliders,
  Play,
  Cpu,
  Clock,
  ShieldAlert
} from 'lucide-react';
import type { Model, PageId } from '../types';
import { launchEvaluationStream } from '../services/api';

interface RedTeamPageProps {
  models: Model[];
  onNavigate: (page: PageId, extraId?: string) => void;
  onRefreshData: () => Promise<void>;
  onOpenUploadModel: () => void;
}

export const RedTeamPage: React.FC<RedTeamPageProps> = ({
  models,
  onNavigate,
  onRefreshData,
  onOpenUploadModel,
}) => {
  // Preset scenarios
  const presets = [
    {
      id: 'Quick Demo',
      title: 'Quick Demo',
      duration: '~5 mins',
      cases: '12 test cases',
      description: 'Rapid diagnostic run on selected models with core adversarial probes.'
    },
    {
      id: 'Medium',
      title: 'Medium',
      duration: '~15 mins',
      cases: '24 test cases',
      description: 'Standard enterprise safety evaluation across balanced attack categories.'
    },
    {
      id: 'Large',
      title: 'Large',
      duration: '~30 mins',
      cases: '50 test cases',
      description: 'Extended stress test across deep jailbreaks and complex prompt injections.'
    },
    {
      id: 'Multi-Model Comparison',
      title: 'Multi-Model Comparison',
      duration: '~15 mins',
      cases: 'Cross-model benchmark',
      description: 'Run identical test cases simultaneously across multiple models to compare safety.'
    },
    {
      id: 'Comprehensive',
      title: 'Comprehensive',
      duration: '~20 mins',
      cases: 'All 9 categories',
      description: 'Full-spectrum audit covering prompt injection, secret leaks, toxicity, and compliance.'
    },
    {
      id: 'Maximum Stress Test',
      title: 'Maximum Stress Test',
      duration: '~45 mins',
      cases: 'Bounded extreme load',
      description: 'Intense adversarial combinatorial permutations and boundary edge cases.'
    },
    {
      id: 'Hugging Face Model',
      title: 'Hugging Face Model',
      duration: '~10 mins',
      cases: 'Safe local adapter',
      description: 'Evaluate open-weight models locally via deterministic sandboxed simulation.'
    }
  ];

  const allCategories = [
    'Jailbreak',
    'Prompt Injection',
    'Data Exfiltration',
    'Toxicity',
    'Misinformation',
    'Bias & Fairness',
    'Hallucination',
    'Sensitive Data Leakage',
    'Compliance Drift'
  ];

  const [selectedPreset, setSelectedPreset] = useState('Quick Demo');
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(['mod_gpt4o', 'mod_llama32']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Jailbreak',
    'Prompt Injection',
    'Sensitive Data Leakage',
    'Toxicity',
    'Hallucination'
  ]);
  const [maxCases, setMaxCases] = useState(12);
  const [randomSeed, setRandomSeed] = useState(42);
  const [concurrency, setConcurrency] = useState(4);
  const [objective, setObjective] = useState('Pre-deployment safety validation and prompt injection resilience audit.');

  // Execution states
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length === 1) return; // Prevent deselecting all
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const selectAllCategories = () => setSelectedCategories([...allCategories]);
  const deselectAllCategories = () => setSelectedCategories([allCategories[0]]);

  const removeModel = (id: string) => {
    if (selectedModelIds.length === 1) {
      setErrorMsg('At least one target model must be selected.');
      return;
    }
    setErrorMsg('');
    setSelectedModelIds(selectedModelIds.filter(m => m !== id));
  };

  const addModel = (id: string) => {
    setErrorMsg('');
    if (!selectedModelIds.includes(id)) {
      setSelectedModelIds([...selectedModelIds, id]);
    }
  };

  const handleLaunchTest = async () => {
    if (selectedModelIds.length === 0) {
      setErrorMsg('Please select at least one target model.');
      return;
    }
    if (selectedCategories.length === 0) {
      setErrorMsg('Please select at least one attack category.');
      return;
    }

    setErrorMsg('');
    setIsExecuting(true);
    setProgress(0);
    setProgressStep('Connecting to model adapters and preparing deterministic test cases...');

    try {
      const result = await launchEvaluationStream(
        {
          name: `${selectedPreset} Evaluation`,
          presetScenario: selectedPreset,
          modelIds: selectedModelIds,
          categories: selectedCategories,
          executionSettings: {
            maxTestCases: maxCases,
            randomSeed,
            concurrency,
            objective
          }
        },
        (progressEvent) => {
          setProgress(progressEvent.percent);
          setProgressStep(progressEvent.step);
        }
      );

      setProgress(100);
      setProgressStep('Evaluation complete! Opening detailed findings report...');
      await onRefreshData();

      const newEvalId = result?.evalId || result?.id;
      if (newEvalId) {
        onNavigate('evaluations', newEvalId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Evaluation launch failed.');
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Red Team Evaluation
            </h1>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#f4efff] text-[#7952D8] border border-[#e5d9fd]">
              Automated
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure adversarial stress tests, select attack surfaces, and launch automated security evaluations.
          </p>
        </div>

        {/* Quick Launch Top Button */}
        <button
          onClick={handleLaunchTest}
          disabled={isExecuting}
          className="bayora-btn-primary px-5 py-2.5 text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Flame className="w-4 h-4" />
          <span>Launch Attack Test</span>
        </button>
      </div>

      {/* Execution Progress Overlay / Banner */}
      {isExecuting && (
        <div className="bayora-card p-6 border-2 border-[#9B7DE8]/40 bg-white/95 shadow-xl space-y-3 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#9B7DE8] animate-ping" />
              <span className="text-sm font-bold text-slate-900">{progressStep}</span>
            </div>
            <span className="text-sm font-mono font-bold text-[#7952D8]">{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#9B7DE8] to-[#7952D8] h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section A: Preset Scenarios (Selectable Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              A. Preset Scenarios
            </h2>
            <p className="text-xs text-slate-500">Select an evaluation profile calibrated for your testing objective</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {presets.slice(0, 4).map((p) => {
            const isSelected = selectedPreset === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPreset(p.id)}
                className={`bayora-card p-5 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-2 border-[#9B7DE8] bg-[#fdfcff] shadow-md ring-2 ring-[#9B7DE8]/10'
                    : 'hover:border-slate-300 bg-white/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">{p.title}</span>
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-[#8762E0]" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2">
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <Clock className="w-3 h-3 text-slate-400" /> {p.duration}
                  </span>
                  <span>·</span>
                  <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded text-[10px]">
                    {p.cases}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Extended Presets (Row 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {presets.slice(4).map((p) => {
            const isSelected = selectedPreset === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPreset(p.id)}
                className={`bayora-card p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-2 border-[#9B7DE8] bg-[#fdfcff] shadow-md ring-2 ring-[#9B7DE8]/10'
                    : 'hover:border-slate-300 bg-white/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{p.title}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#8762E0]" />}
                </div>
                <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-2">
                  <span>{p.duration}</span>
                  <span>·</span>
                  <span>{p.cases}</span>
                </div>
                <p className="text-[11px] text-slate-500">{p.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section B: Target Model Selector */}
      <div className="bayora-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              B. Target Model Selector
            </h2>
            <p className="text-xs text-slate-500">
              Select one or more registered models to subject to adversarial testing
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
            {selectedModelIds.length} Selected
          </span>
        </div>

        {/* Selected Model Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedModelIds.map((id) => {
            const m = models.find(mod => mod.id === id);
            return (
              <div
                key={id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#f4efff] border border-[#e5d9fd] text-slate-800 text-xs font-medium shadow-2xs"
              >
                <Cpu className="w-3.5 h-3.5 text-[#8762E0]" />
                <span>{m ? m.name : id}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-slate-500 font-mono">
                  {m ? m.execution_mode : 'Sim'}
                </span>
                <button
                  onClick={() => removeModel(id)}
                  className="p-0.5 rounded-full hover:bg-purple-200/50 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Add Available Models Dropdown / Button */}
          {models.some(m => !selectedModelIds.includes(m.id)) && (
            <div className="flex items-center gap-1.5">
              {models
                .filter(m => !selectedModelIds.includes(m.id))
                .map(m => (
                  <button
                    key={m.id}
                    onClick={() => addModel(m.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white border border-slate-200 hover:border-[#9B7DE8] hover:text-[#7952D8] text-slate-600 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{m.name}</span>
                  </button>
                ))}
            </div>
          )}

          <button
            onClick={onOpenUploadModel}
            className="flex items-center gap-1 px-3 py-1.5 rounded-2xl border border-dashed border-slate-300 hover:border-[#9B7DE8] text-slate-500 hover:text-[#7952D8] text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Register New Model</span>
          </button>
        </div>
      </div>

      {/* Section C: Attack Surface Selector (9 Interactive Chips) */}
      <div className="bayora-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              C. Attack Surface Selector
            </h2>
            <p className="text-xs text-slate-500">
              Toggle evaluation dimensions and adversarial attack categories
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold text-[#7952D8] bg-[#f4efff] px-2.5 py-1 rounded-xl border border-[#e5d9fd]">
              {selectedCategories.length} of {allCategories.length} Selected
            </span>
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={selectAllCategories}
                className="text-[#8762E0] hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">·</span>
              <button
                onClick={deselectAllCategories}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* 9 Category Toggle Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5">
          {allCategories.map((cat) => {
            const isSelected = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#f4efff] border-[#9B7DE8] text-[#7952D8] shadow-xs'
                    : 'bg-white border-slate-200/90 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className={`w-3.5 h-3.5 ${isSelected ? 'text-[#8762E0]' : 'text-slate-400'}`} />
                  <span>{cat}</span>
                </div>
                {isSelected ? (
                  <CheckCircle2 className="w-4 h-4 text-[#8762E0]" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section D: Execution Settings */}
      <div className="bayora-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              D. Execution Settings
            </h2>
            <p className="text-xs text-slate-500">
              Fine-tune test count bounds, concurrency, and reproducibility seed
            </p>
          </div>
          <Sliders className="w-4 h-4 text-slate-400" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Max Test Cases</label>
            <input
              type="number"
              min={4}
              max={100}
              value={maxCases}
              onChange={(e) => setMaxCases(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-800 outline-hidden focus:bg-white focus:border-[#9B7DE8]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Random Seed</label>
            <input
              type="number"
              value={randomSeed}
              onChange={(e) => setRandomSeed(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-800 outline-hidden focus:bg-white focus:border-[#9B7DE8]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Concurrency Limit</label>
            <input
              type="number"
              min={1}
              max={8}
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-800 outline-hidden focus:bg-white focus:border-[#9B7DE8]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Evaluation Objective</label>
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-hidden focus:bg-white focus:border-[#9B7DE8]"
          />
        </div>
      </div>

      {/* Section E: Launch Bar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#9B7DE8]/15 via-white to-purple-50 border border-[#9B7DE8]/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1 text-center sm:text-left">
          <div className="text-sm font-bold text-slate-900">
            Ready to execute {selectedPreset} on {selectedModelIds.length} target {selectedModelIds.length === 1 ? 'model' : 'models'}
          </div>
          <div className="text-xs text-slate-500">
            {selectedCategories.length} attack vectors enabled · Bounded local deterministic simulation adapter
          </div>
        </div>

        <button
          onClick={handleLaunchTest}
          disabled={isExecuting}
          className="bayora-btn-primary px-8 py-3.5 text-sm font-bold flex items-center gap-2.5 cursor-pointer shadow-md disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Launch Attack Test</span>
        </button>
      </div>
    </div>
  );
};
