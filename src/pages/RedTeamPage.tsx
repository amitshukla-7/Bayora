import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ShieldAlert,
  Database,
  RefreshCw,
  StopCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import type { Model, Dataset, PageId, DynamicPreset, PreflightResult } from '../types';
import {
  launchEvaluationStream,
  fetchActiveEvalRun,
  fetchEvalRunStatus,
  cancelEvalRunApi,
  runPreflightApi,
  fetchDynamicPresetsApi
} from '../services/api';

interface RedTeamPageProps {
  models: Model[];
  datasets?: Dataset[];
  onNavigate: (page: PageId, extraId?: string) => void;
  onRefreshData: () => Promise<void>;
  onOpenUploadModel: () => void;
}

const OFFICIAL_CATEGORIES = [
  'Jailbreak',
  'Prompt Injection',
  'Sensitive Data Leakage',
  'Data Exfiltration',
  'Toxicity',
  'Bias & Fairness',
  'Hallucination',
  'Compliance Drift'
];

export const RedTeamPage: React.FC<RedTeamPageProps> = ({
  models,
  datasets = [],
  onNavigate,
  onRefreshData,
  onOpenUploadModel,
}) => {
  // Model selection: prioritize verified active live model (ollama-smollm)
  const activeSmollm = models.find(m => (m.id === 'ollama-smollm' || m.identifier === 'smollm:135m') && m.status === 'Active');
  const defaultModelIds = activeSmollm
    ? [activeSmollm.id]
    : models.filter(m => m.status === 'Active').slice(0, 1).map(m => m.id);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(
    defaultModelIds.length > 0 ? defaultModelIds : (models[0] ? [models[0].id] : [])
  );

  // Dataset selection
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    datasets[0]?.id || 'ds_standard_safety_v1'
  );

  // Attack categories selection
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Jailbreak',
    'Prompt Injection',
    'Sensitive Data Leakage',
    'Toxicity',
    'Hallucination'
  ]);

  // Presets state
  const [presets, setPresets] = useState<DynamicPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('Quick Diagnostic');
  const [latencyBasisText, setLatencyBasisText] = useState<string>('');

  // Execution configuration settings
  const [maxCases, setMaxCases] = useState<number>(12);
  const [samplesPerCase, setSamplesPerCase] = useState<number>(1);
  const [temperature, setTemperature] = useState<number>(0.0);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [maxTokens, setMaxTokens] = useState<number>(128);
  const [concurrency, setConcurrency] = useState<number>(4);
  const [objective, setObjective] = useState<string>(
    'Adversarial robustness evaluation: verify fail-closed policy adherence and detect prompt injection vulnerabilities.'
  );

  // Real-time run state
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStep, setProgressStep] = useState<string>('');
  const [casesDone, setCasesDone] = useState<number>(0);
  const [totalRunCases, setTotalRunCases] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Completed run banner state
  const [completedRun, setCompletedRun] = useState<{
    id: string;
    name: string;
    passedCount: number;
    warningCount: number;
    failedCount: number;
    totalCases: number;
    riskScore: number;
  } | null>(null);

  // Preflight check state
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [isCheckingPreflight, setIsCheckingPreflight] = useState<boolean>(false);

  // Poll timer ref
  const pollTimerRef = useRef<any>(null);

  // 1. Synchronize with Active Run on Server
  const checkActiveRun = useCallback(async () => {
    try {
      const res = await fetchActiveEvalRun();
      if (res.active) {
        setIsExecuting(true);
        setActiveRunId(res.active.id);
        setProgressPercent(res.active.percent || 0);
        setCasesDone(res.active.cases_done || 0);
        setTotalRunCases(res.active.total_cases || 0);
        setProgressStep(`Evaluation in progress: ${res.active.cases_done || 0} of ${res.active.total_cases || 0} cases evaluated.`);
      } else if (isExecuting && !activeRunId) {
        // If we thought we were executing without an active ID, clear
        setIsExecuting(false);
      }
    } catch {
      // Non-blocking background check
    }
  }, [isExecuting, activeRunId]);

  useEffect(() => {
    checkActiveRun();
  }, [checkActiveRun]);

  // Polling active run while executing
  useEffect(() => {
    if (isExecuting && activeRunId) {
      pollTimerRef.current = setInterval(async () => {
        try {
          const run = await fetchEvalRunStatus(activeRunId);
          if (run) {
            setProgressPercent(run.percent || 0);
            setCasesDone(run.cases_done || 0);
            setTotalRunCases(run.total_cases || 0);
            if (run.status === 'COMPLETED') {
              setIsExecuting(false);
              setActiveRunId(null);
              setCompletedRun({
                id: run.id,
                name: run.name || 'Evaluation Run',
                passedCount: (run as any).passed_count || 0,
                warningCount: (run as any).warning_count || 0,
                failedCount: (run as any).failed_count || 0,
                totalCases: run.total_cases || 0,
                riskScore: (run as any).risk_score || 0
              });
              await onRefreshData();
            } else if (run.status === 'FAILED' || run.status === 'CANCELLED') {
              setIsExecuting(false);
              setActiveRunId(null);
              setErrorMsg(run.error_detail || `Evaluation ${run.status.toLowerCase()}.`);
              await onRefreshData();
            }
          }
        } catch {
          // ignore transient poll errors
        }
      }, 2000);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isExecuting, activeRunId, onRefreshData]);

  // 2. Fetch Dynamic Presets whenever model selection or dataset changes
  useEffect(() => {
    let isCurrent = true;
    const loadPresets = async () => {
      try {
        const res = await fetchDynamicPresetsApi(selectedModelIds, selectedDatasetId);
        if (isCurrent && res && res.presets) {
          setPresets(res.presets);
          if (res.historicalStats?.measuredCases > 0) {
            setLatencyBasisText(
              `Calibrated from ${res.historicalStats.measuredCases} prior cases (p50: ${res.historicalStats.p50LatencyMs}ms)`
            );
          } else {
            setLatencyBasisText('Calibrated from standard deterministic execution benchmarks');
          }
        }
      } catch {
        // Keep fallback presets if request fails
      }
    };
    loadPresets();
    return () => {
      isCurrent = false;
    };
  }, [selectedModelIds, selectedDatasetId]);

  // 3. Preflight check whenever inputs change
  useEffect(() => {
    let isCurrent = true;
    const executePreflight = async () => {
      setIsCheckingPreflight(true);
      try {
        const result = await runPreflightApi({
          modelIds: selectedModelIds,
          datasetId: selectedDatasetId,
          categories: selectedCategories
        });
        if (isCurrent) {
          setPreflight(result);
        }
      } catch {
        if (isCurrent) {
          setPreflight({
            ready: false,
            checks: [
              {
                name: 'Server Connectivity',
                status: 'FAIL',
                message: 'Unable to reach evaluation engine preflight API.'
              }
            ]
          });
        }
      } finally {
        if (isCurrent) setIsCheckingPreflight(false);
      }
    };

    const timer = setTimeout(executePreflight, 300);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [selectedModelIds, selectedDatasetId, selectedCategories]);

  // Handle Preset Selection
  const handleSelectPreset = (p: DynamicPreset) => {
    if (!p.enabled) return;
    setSelectedPresetId(p.id);
    setMaxCases(p.casesCount);
    if (p.categories && p.categories.length > 0) {
      setSelectedCategories(p.categories);
    }
  };

  // Toggle Category
  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length === 1) return; // Prevent empty selection
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const selectAllCategories = () => setSelectedCategories([...OFFICIAL_CATEGORIES]);
  const deselectAllCategories = () => setSelectedCategories([OFFICIAL_CATEGORIES[0]]);

  // Target Model Selection
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

  // Cancel running job
  const handleCancelRun = async () => {
    if (!activeRunId) return;
    setIsCancelling(true);
    try {
      await cancelEvalRunApi(activeRunId);
      setProgressStep('Evaluation cancellation requested. Aborting active cases...');
      await onRefreshData();
    } catch (err: any) {
      setErrorMsg(`Failed to cancel evaluation: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  // Launch Attack Test
  const handleLaunchTest = async () => {
    if (!preflight?.ready) {
      const failed = preflight?.checks.find(c => c.status === 'FAIL');
      setErrorMsg(failed ? `Cannot launch: ${failed.message}` : 'Preflight verification failed.');
      return;
    }

    setErrorMsg('');
    setCompletedRun(null);
    setIsExecuting(true);
    setProgressPercent(0);
    setProgressStep('Initializing evaluation run and validating model adapters...');

    const chosenPreset = presets.find(p => p.id === selectedPresetId);

    try {
      const result = await launchEvaluationStream(
        {
          name: chosenPreset ? `${chosenPreset.title} Evaluation` : 'Adversarial Evaluation Run',
          presetScenario: chosenPreset ? chosenPreset.title : 'Custom Run',
          modelIds: selectedModelIds,
          datasetId: selectedDatasetId,
          categories: selectedCategories,
          executionSettings: {
            maxTestCases: maxCases,
            samplesPerCase,
            temperature,
            seed: randomSeed,
            maxTokens,
            concurrency,
            objective
          }
        },
        (progressEvent) => {
          if (progressEvent.evalId) setActiveRunId(progressEvent.evalId);
          setProgressPercent(progressEvent.percent || 0);
          setProgressStep(progressEvent.step || 'Running test cases...');
          if (progressEvent.completed !== undefined) setCasesDone(progressEvent.completed);
          if (progressEvent.total !== undefined) setTotalRunCases(progressEvent.total);
        }
      );

      // Successfully finished stream
      const finalEvalId = result?.evalId || result?.id || activeRunId;
      setIsExecuting(false);
      setActiveRunId(null);
      setProgressPercent(100);

      if (finalEvalId) {
        setCompletedRun({
          id: finalEvalId,
          name: result?.name || `${chosenPreset?.title || 'Security'} Evaluation`,
          passedCount: result?.passedCount ?? 0,
          warningCount: result?.warningCount ?? 0,
          failedCount: result?.failedCount ?? 0,
          totalCases: result?.totalCases ?? (maxCases * selectedModelIds.length),
          riskScore: result?.riskScore ?? 0
        });
      }

      await onRefreshData();
    } catch (err: any) {
      if (activeRunId) {
        try {
          const run = await fetchEvalRunStatus(activeRunId);
          if (run && (run.status === 'COMPLETED' || run.cases_done >= run.total_cases)) {
            setIsExecuting(false);
            setActiveRunId(null);
            setProgressPercent(100);
            setCompletedRun({
              id: run.id,
              name: run.name || `${chosenPreset?.title || 'Security'} Evaluation`,
              passedCount: (run as any).passed_count || 0,
              warningCount: (run as any).warning_count || 0,
              failedCount: (run as any).failed_count || 0,
              totalCases: run.total_cases || (maxCases * selectedModelIds.length),
              riskScore: (run as any).risk_score || 0
            });
            await onRefreshData();
            return;
          }
        } catch {}
      }
      setErrorMsg(err.message || 'Evaluation run failed.');
      setIsExecuting(false);
      setActiveRunId(null);
    }
  };

  const isLaunchDisabled = isExecuting || !preflight?.ready || isCheckingPreflight;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
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
            Configure adversarial attack vectors, choose benchmark callsets, and execute deterministic security evaluations.
          </p>
        </div>

        {/* Quick Launch Top Button */}
        <div className="flex items-center gap-3">
          {isExecuting && (
            <button
              onClick={handleCancelRun}
              disabled={isCancelling}
              className="px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <StopCircle className="w-4 h-4 text-red-600" />
              <span>{isCancelling ? 'Cancelling...' : 'Cancel Run'}</span>
            </button>
          )}

          <button
            onClick={handleLaunchTest}
            disabled={isLaunchDisabled}
            className="bayora-btn-primary px-5 py-2.5 text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
            title={!preflight?.ready ? 'Resolve preflight requirements below to launch' : 'Launch adversarial evaluation'}
          >
            {isExecuting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Flame className="w-4 h-4" />
            )}
            <span>{isExecuting ? 'Evaluation in Progress...' : 'Launch Attack Test'}</span>
          </button>
        </div>
      </div>

      {/* Execution Progress Banner */}
      {isExecuting && (
        <div className="bayora-card p-6 border-2 border-[#9B7DE8]/60 bg-white/95 shadow-xl space-y-3 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#9B7DE8] animate-ping" />
              <div>
                <span className="text-sm font-bold text-slate-900">{progressStep}</span>
                {totalRunCases > 0 && (
                  <span className="text-xs text-slate-500 ml-2">
                    ({casesDone} / {totalRunCases} cases)
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-[#7952D8]">{progressPercent}%</span>
              <button
                onClick={handleCancelRun}
                disabled={isCancelling}
                className="px-3 py-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-medium cursor-pointer"
              >
                {isCancelling ? 'Aborting...' : 'Abort Run'}
              </button>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#9B7DE8] to-[#7952D8] h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(2, progressPercent)}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed Run Notification Banner */}
      {completedRun && !isExecuting && (
        <div className="p-5 rounded-2xl bg-[#f4fbf6] border border-emerald-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                <span>Evaluation Completed Successfully</span>
                <span className="text-[10px] font-mono bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded-full">
                  {completedRun.id}
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-1">
                Completed {completedRun.totalCases} test cases:{' '}
                <span className="font-semibold text-emerald-700">{completedRun.passedCount} Passed</span>,{' '}
                <span className="font-semibold text-amber-700">{completedRun.warningCount} Warnings</span>,{' '}
                <span className="font-semibold text-red-700">{completedRun.failedCount} Failures</span>. Average Risk: {completedRun.riskScore}/100.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('evaluations', completedRun.id)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Findings Report</span>
            </button>
            <button
              onClick={() => setCompletedRun(null)}
              className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg('')}
            className="p-1 hover:bg-red-100 rounded-lg text-red-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Section A: Preset Scenarios (Dynamic Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              A. Preset Scenarios
            </h2>
            <p className="text-xs text-slate-500">
              {latencyBasisText || 'Calibrated profiles with dynamic runtime estimation'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((p) => {
            const isSelected = selectedPresetId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`bayora-card p-5 transition-all relative flex flex-col justify-between ${
                  !p.enabled
                    ? 'opacity-60 bg-slate-50/70 border-slate-200 cursor-not-allowed'
                    : isSelected
                    ? 'border-2 border-[#9B7DE8] bg-[#fdfcff] shadow-md ring-2 ring-[#9B7DE8]/10 cursor-pointer'
                    : 'hover:border-slate-300 bg-white/80 cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">{p.title}</span>
                    {isSelected && p.enabled ? (
                      <CheckCircle2 className="w-4 h-4 text-[#8762E0]" />
                    ) : !p.enabled ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2">
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <Clock className="w-3 h-3 text-slate-400" /> {p.duration}
                    </span>
                    <span>·</span>
                    <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">
                      {p.casesCount} cases ({p.totalCalls} calls)
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed font-normal mb-3">
                    {p.description}
                  </p>
                </div>

                {!p.enabled && p.disabledReason && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-amber-700 flex items-center justify-between gap-1">
                    <span>{p.disabledReason}</span>
                    {p.id.includes('Hugging Face') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenUploadModel();
                        }}
                        className="text-[#7952D8] hover:underline font-semibold text-[10px] shrink-0"
                      >
                        Register
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section B: Target Model & Dataset Selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Selector Card */}
        <div className="bayora-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                B1. Target Models
              </h2>
              <p className="text-xs text-slate-500">
                Select registered models to subject to adversarial attack cases
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
                  <span className="font-semibold">{m ? m.name : id}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-slate-500 font-mono">
                    {m ? m.execution_mode : 'Live'}
                  </span>
                  {m && m.status === 'Active' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active & Verified" />
                  )}
                  <button
                    onClick={() => removeModel(id)}
                    className="p-0.5 rounded-full hover:bg-purple-200/50 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Available Models to Add */}
            {models.some(m => !selectedModelIds.includes(m.id)) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {models
                  .filter(m => !selectedModelIds.includes(m.id))
                  .map(m => (
                    <button
                      key={m.id}
                      onClick={() => addModel(m.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-white border border-slate-200 hover:border-[#9B7DE8] hover:text-[#7952D8] text-slate-600 text-xs font-medium transition-colors cursor-pointer"
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

        {/* Dataset Selector Card */}
        <div className="bayora-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                B2. Benchmark Dataset
              </h2>
              <p className="text-xs text-slate-500">
                Choose evaluation corpus containing curated adversarial prompts
              </p>
            </div>
            <Database className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-2">
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 outline-hidden focus:bg-white focus:border-[#9B7DE8]"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.total_cases} cases) - {d.version || 'v1.0'}
                </option>
              ))}
            </select>

            {datasets.find(d => d.id === selectedDatasetId) && (
              <p className="text-[11px] text-slate-500 leading-relaxed px-1">
                {datasets.find(d => d.id === selectedDatasetId)?.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section C: Attack Surface Selector (8 Official Security Categories) */}
      <div className="bayora-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              C. Attack Surface Selector
            </h2>
            <p className="text-xs text-slate-500">
              Toggle evaluation dimensions across official security vulnerability domains
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold text-[#7952D8] bg-[#f4efff] px-2.5 py-1 rounded-xl border border-[#e5d9fd]">
              {selectedCategories.length} of {OFFICIAL_CATEGORIES.length} Selected
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

        {/* 8 Official Category Toggle Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {OFFICIAL_CATEGORIES.map((cat) => {
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

      {/* Section D: Execution Settings & Preflight Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution Settings Form */}
        <div className="lg:col-span-2 bayora-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                D. Execution Settings
              </h2>
              <p className="text-xs text-slate-500">
                Deterministic execution parameters, sampling bounds, and concurrency
              </p>
            </div>
            <Sliders className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Max Test Cases</label>
              <input
                type="number"
                min={1}
                max={200}
                value={maxCases}
                onChange={(e) => setMaxCases(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-800 outline-hidden focus:bg-white focus:border-[#9B7DE8]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Samples per Case</label>
              <input
                type="number"
                min={1}
                max={5}
                value={samplesPerCase}
                onChange={(e) => setSamplesPerCase(Math.max(1, Math.min(5, Number(e.target.value))))}
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Temperature</label>
                <span className="text-[10px] font-mono font-bold text-slate-500">{temperature}</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-[#7952D8]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Max Tokens</label>
              <input
                type="number"
                min={32}
                max={1024}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Math.max(32, Number(e.target.value)))}
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
                onChange={(e) => setConcurrency(Math.max(1, Math.min(8, Number(e.target.value))))}
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

        {/* Preflight Checklist Card */}
        <div className="bayora-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Preflight Checklist
              </h2>
              <p className="text-xs text-slate-500">Live system verification</p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                preflight?.ready
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isCheckingPreflight ? 'Checking...' : preflight?.ready ? 'Ready' : 'Blocked'}
            </span>
          </div>

          <div className="space-y-2.5">
            {preflight?.checks?.map((check, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/80 border border-slate-100 text-xs"
              >
                {check.status === 'PASS' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-800">{check.name}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">{check.message}</div>
                </div>
              </div>
            ))}

            {(!preflight || !preflight.checks) && (
              <div className="text-xs text-slate-400 py-4 text-center">
                Running preflight diagnostic checks...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section E: Launch Bar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#9B7DE8]/15 via-white to-purple-50 border border-[#9B7DE8]/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1 text-center sm:text-left">
          <div className="text-sm font-bold text-slate-900">
            Ready to execute {presets.find(p => p.id === selectedPresetId)?.title || 'Custom'} on {selectedModelIds.length} target {selectedModelIds.length === 1 ? 'model' : 'models'}
          </div>
          <div className="text-xs text-slate-500">
            {selectedCategories.length} attack vectors enabled · {maxCases} test cases bounded · Seed: {randomSeed} · Temp: {temperature}
          </div>
        </div>

        <button
          onClick={handleLaunchTest}
          disabled={isLaunchDisabled}
          className="bayora-btn-primary px-8 py-3.5 text-sm font-bold flex items-center gap-2.5 cursor-pointer shadow-md disabled:opacity-50"
        >
          {isExecuting ? (
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Play className="w-4 h-4 fill-white" />
          )}
          <span>{isExecuting ? 'Evaluation in Progress...' : 'Launch Attack Test'}</span>
        </button>
      </div>
    </div>
  );
};
