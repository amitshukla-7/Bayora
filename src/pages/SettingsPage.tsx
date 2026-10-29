import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  Cpu,
  ShieldCheck,
  Palette
} from 'lucide-react';
import type { PlatformSettings, Model, Dataset, Policy } from '../types';
import { updateBulkSettings, resetSettings } from '../services/api';

interface SettingsPageProps {
  settings: PlatformSettings;
  models: Model[];
  datasets: Dataset[];
  policies: Policy[];
  onRefreshSettings: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  models,
  datasets,
  policies,
  onRefreshSettings,
}) => {
  const [formState, setFormState] = useState<PlatformSettings>(settings);
  const [initialState, setInitialState] = useState<PlatformSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize when incoming props change
  useEffect(() => {
    setFormState(settings);
    setInitialState(settings);
  }, [settings]);

  // Compute dirty state
  const isDirty = JSON.stringify(formState) !== JSON.stringify(initialState);

  const handleFieldChange = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSaveSuccess(false);
    setErrorMsg('');
    setFormState((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    setErrorMsg('');
    setSaveSuccess(false);

    // Rollback to initialState on failure

    try {
      const res = await updateBulkSettings(formState);
      setFormState(res.settings);
      setInitialState(res.settings);
      setSaveSuccess(true);
      await onRefreshSettings();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      // Rollback on failure
      setFormState(initialState);
      setErrorMsg(err.message || 'Failed to save settings to server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSection = async (section: string) => {
    if (!window.confirm(`Reset the "${section}" configuration section back to factory defaults?`)) return;
    setIsSaving(true);
    setErrorMsg('');
    try {
      const res = await resetSettings(section);
      setFormState(res.settings);
      setInitialState(res.settings);
      setSaveSuccess(true);
      await onRefreshSettings();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to reset section "${section}".`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm('Reset ALL platform settings globally to initial defaults?')) return;
    setIsSaving(true);
    setErrorMsg('');
    try {
      const res = await resetSettings('all');
      setFormState(res.settings);
      setInitialState(res.settings);
      setSaveSuccess(true);
      await onRefreshSettings();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset all settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActiveModel = (modelId: string) => {
    const current = formState.active_models || [];
    if (current.includes(modelId)) {
      if (current.length === 1) {
        setErrorMsg('At least one active model must remain selected.');
        return;
      }
      handleFieldChange('active_models', current.filter((id) => id !== modelId));
    } else {
      handleFieldChange('active_models', [...current, modelId]);
    }
  };

  const toggleActivePolicy = (policyId: string) => {
    const current = formState.active_policies || [];
    if (current.includes(policyId)) {
      if (current.length === 1) {
        setErrorMsg('At least one defensive policy must remain enabled.');
        return;
      }
      handleFieldChange('active_policies', current.filter((id) => id !== policyId));
    } else {
      handleFieldChange('active_policies', [...current, policyId]);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header with Save Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Platform Settings
            </h1>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-50 text-[#7952D8] border border-purple-200">
              Persistent (SQLite)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure evaluation parameters, model defaults, defensive guardrails, and system diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetAll}
            disabled={isSaving}
            className="bayora-btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reset all settings to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset All Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`px-4 py-2 text-xs font-semibold rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
              isDirty
                ? 'bg-gradient-to-r from-[#9B7DE8] to-[#7952D8] text-white hover:opacity-95 ring-2 ring-[#9B7DE8]/30'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Dirty Changes Banner */}
      {isDirty && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">
              You have unsaved configuration changes. Click <strong>Save Settings</strong> to commit them to SQLite.
            </span>
          </div>
          <button
            onClick={() => {
              setFormState(initialState);
              setErrorMsg('');
            }}
            className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline cursor-pointer"
          >
            Discard
          </button>
        </div>
      )}

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2.5 shadow-xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">
            Settings successfully saved and persisted to <code>workspace/bayora.db</code>.
          </span>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: EXECUTION & RUNNER */}
      <div className="bayora-card p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8762E0]" />
            <h2 className="text-base font-bold text-slate-900">Execution & Evaluation Runner</h2>
          </div>
          <button
            onClick={() => handleResetSection('runner')}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Section</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timeout Seconds */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Model Adapter Timeout (Seconds)
            </label>
            <input
              type="number"
              min={1}
              max={300}
              value={formState.timeout_seconds}
              onChange={(e) => handleFieldChange('timeout_seconds', parseInt(e.target.value, 10) || 1)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-hidden focus:border-[#9B7DE8] focus:bg-white"
            />
            <p className="text-[11px] text-slate-400">
              HTTP inference deadline (1 to 300 seconds). Exceeded queries fail closed as <code>TIMEOUT</code>.
            </p>
          </div>

          {/* Concurrency */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Evaluation Concurrency: {formState.concurrency} Workers
              </label>
              <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold">
                {formState.concurrency}x Parallel
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={16}
              value={formState.concurrency}
              onChange={(e) => handleFieldChange('concurrency', parseInt(e.target.value, 10) || 1)}
              className="w-full accent-[#8762E0] cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Parallel evaluation worker pool capacity (1 to 16 threads).
            </p>
          </div>

          {/* Streaming Enabled Toggle */}
          <div className="md:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#8762E0]" />
                Live SSE Progress Streaming
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Stream real-time test case execution via Server-Sent Events with progress percentages.
              </p>
            </div>
            <button
              onClick={() => handleFieldChange('streaming_enabled', !formState.streaming_enabled)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                formState.streaming_enabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  formState.streaming_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: MODEL & DATASET DEFAULTS */}
      <div className="bayora-card p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#8762E0]" />
            <h2 className="text-base font-bold text-slate-900">Model & Dataset Defaults</h2>
          </div>
          <button
            onClick={() => handleResetSection('models_datasets')}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Section</span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Active Target Models */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Default Target Models for Evaluations
            </label>
            <div className="flex flex-wrap gap-2">
              {models.map((m) => {
                const isSelected = formState.active_models.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleActiveModel(m.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#f4efff] border-[#9B7DE8] text-[#7952D8] shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Cpu className={`w-3 h-3 ${isSelected ? 'text-[#8762E0]' : 'text-slate-400'}`} />
                    <span>{m.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">({m.identifier})</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400">
              Models automatically pre-selected when opening the Red Team studio.
            </p>
          </div>

          {/* Default Dataset */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700">
              Default Benchmark Dataset
            </label>
            <select
              value={formState.default_dataset}
              onChange={(e) => handleFieldChange('default_dataset', e.target.value)}
              className="w-full sm:w-80 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-hidden focus:border-[#9B7DE8] focus:bg-white cursor-pointer"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.total_cases} cases)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Primary test suite loaded for adversarial evaluations and automated regression tests.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: DEFENSIVE POLICIES */}
      <div className="bayora-card p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#8762E0]" />
            <h2 className="text-base font-bold text-slate-900">Defensive Guardrails (POL-001..005)</h2>
          </div>
          <button
            onClick={() => handleResetSection('policies')}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Section</span>
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Enforced Security Policies
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {policies.map((p) => {
              const isEnabled = formState.active_policies.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggleActivePolicy(p.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isEnabled
                      ? 'bg-[#fdfcff] border-[#9B7DE8] shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[11px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-800">
                        {p.id}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{p.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {p.description}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isEnabled ? 'Active' : 'Off'}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400">
            Select the default set of deterministic policies enforced during evaluation runs and proxy gating.
          </p>
        </div>
      </div>

      {/* SECTION 4: APPEARANCE & SYSTEM LOGGING */}
      <div className="bayora-card p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#8762E0]" />
            <h2 className="text-base font-bold text-slate-900">Appearance & Diagnostics</h2>
          </div>
          <button
            onClick={() => handleResetSection('appearance')}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Section</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Theme Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">UI Theme Preference</label>
            <div className="flex items-center gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleFieldChange('theme', t)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer border ${
                    formState.theme === t
                      ? 'bg-[#9B7DE8] text-white border-[#8762E0] shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Visual mode for charts, code inspectors, and navigation menus.
            </p>
          </div>

          {/* Log Level Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Audit & Server Log Verbosity</label>
            <div className="flex items-center gap-2">
              {(['error', 'warn', 'info', 'debug'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => handleFieldChange('log_level', l)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold uppercase transition-all cursor-pointer border ${
                    formState.log_level === l
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Minimum severity required for database event ingestion and console tracing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
