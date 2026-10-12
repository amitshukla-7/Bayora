import {
  RotateCcw,
  Tag,
  FolderGit2,
  Network,
  KeyRound,
  Bot,
  ArrowRight,
  Container,
  SlidersHorizontal,
} from 'lucide-react';
import type { SimulatedConfig, GuaranteeId, TestId } from '../types';

interface ConfigDiffItem {
  field: string;
  previousValue: string;
  currentValue: string;
  affectedGuarantee: GuaranteeId | null;
  affectedTest: TestId | null;
  isBenign: boolean;
}

interface MutationLabProps {
  config: SimulatedConfig;
  baselineConfig: SimulatedConfig;
  onApplyMutation: (type: 'M1' | 'M2' | 'M3' | 'M4' | 'B1' | 'REMEDIATE') => void;
  isRunning: boolean;
  affectedGuarantees: string[];
}

export const MutationLab: React.FC<MutationLabProps> = ({
  config,
  baselineConfig,
  onApplyMutation,
  isRunning,
  affectedGuarantees,
}) => {
  // Compute configuration diffs
  const diffs: ConfigDiffItem[] = [];

  // M1: storageApiAuthz
  if (config.storageApiAuthz !== baselineConfig.storageApiAuthz) {
    diffs.push({
      field: 'storageApiAuthz',
      previousValue: baselineConfig.storageApiAuthz,
      currentValue: config.storageApiAuthz,
      affectedGuarantee: 'G3',
      affectedTest: 'T03',
      isBenign: false,
    });
  }

  // M2: redMounts
  const mountsDiff = config.redMounts.filter((m) => !baselineConfig.redMounts.includes(m));
  if (mountsDiff.length > 0 || config.redMounts.length !== baselineConfig.redMounts.length) {
    diffs.push({
      field: 'redMounts',
      previousValue: `[${baselineConfig.redMounts.join(', ')}]`,
      currentValue: `[${config.redMounts.join(', ')}]`,
      affectedGuarantee: 'G1',
      affectedTest: 'T01',
      isBenign: false,
    });
  }

  // M3: redNetworks
  const netsDiff = config.redNetworks.filter((n) => !baselineConfig.redNetworks.includes(n));
  if (netsDiff.length > 0 || config.redNetworks.length !== baselineConfig.redNetworks.length) {
    diffs.push({
      field: 'redNetworks',
      previousValue: `[${baselineConfig.redNetworks.join(', ')}]`,
      currentValue: `[${config.redNetworks.join(', ')}]`,
      affectedGuarantee: 'G2',
      affectedTest: 'T02',
      isBenign: false,
    });
  }

  // M4: gatewaySessionIsolation
  if (config.gatewaySessionIsolation !== baselineConfig.gatewaySessionIsolation) {
    diffs.push({
      field: 'gatewaySessionIsolation',
      previousValue: baselineConfig.gatewaySessionIsolation,
      currentValue: config.gatewaySessionIsolation,
      affectedGuarantee: 'G4',
      affectedTest: 'T04',
      isBenign: false,
    });
  }

  // B1: labels check
  const labelKeys = Object.keys(config.labels);
  const baselineLabelKeys = Object.keys(baselineConfig.labels);
  const isLabelModified =
    labelKeys.length !== baselineLabelKeys.length ||
    labelKeys.some((k) => config.labels[k] !== baselineConfig.labels[k]);

  if (isLabelModified) {
    diffs.push({
      field: 'labels (metadata)',
      previousValue: JSON.stringify(baselineConfig.labels),
      currentValue: JSON.stringify(config.labels),
      affectedGuarantee: null,
      affectedTest: null,
      isBenign: true,
    });
  }

  const isM1Active = config.storageApiAuthz === 'relaxed';
  const isM2Active = config.redMounts.some((m) => m.includes('blue'));
  const isM3Active = config.redNetworks.some((n) => n.includes('blue'));
  const isM4Active = config.gatewaySessionIsolation === 'shared';

  return (
    <div className="bg-[#0e1320] rounded-lg border border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1a]">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Infrastructure Mutation & Configuration Drift Simulator
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Inject synthetic perimeter degradation scenarios to test Sentinel's continuous drift mapping and fail-closed gate.
          </p>
        </div>

        <button
          onClick={() => onApplyMutation('REMEDIATE')}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-50 text-white transition shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Remediate to Baseline
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Simulation Buttons Grid */}
        <div>
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
            Simulate Security Posture Events:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* M1 */}
            <button
              onClick={() => onApplyMutation('M1')}
              disabled={isRunning}
              className={`p-3 rounded-md border text-left transition flex flex-col justify-between ${
                isM1Active
                  ? 'bg-rose-950/30 border-rose-600/50 text-rose-200'
                  : 'bg-[#090d16] border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono font-semibold mb-1">
                  <span className={isM1Active ? 'text-rose-400' : 'text-slate-200'}>M1: Relax Authz</span>
                  <KeyRound className={`w-3.5 h-3.5 ${isM1Active ? 'text-rose-400' : 'text-slate-500'}`} />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Toggle storage API authorization to relaxed unauthenticated mode.
                </p>
              </div>
              <div className="text-[10px] font-mono text-sky-400 mt-2 font-medium">
                Invalidates: G3 → T03
              </div>
            </button>

            {/* M2 */}
            <button
              onClick={() => onApplyMutation('M2')}
              disabled={isRunning}
              className={`p-3 rounded-md border text-left transition flex flex-col justify-between ${
                isM2Active
                  ? 'bg-rose-950/30 border-rose-600/50 text-rose-200'
                  : 'bg-[#090d16] border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono font-semibold mb-1">
                  <span className={isM2Active ? 'text-rose-400' : 'text-slate-200'}>M2: Mount Leak</span>
                  <FolderGit2 className={`w-3.5 h-3.5 ${isM2Active ? 'text-rose-400' : 'text-slate-500'}`} />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Mount protected Blue tenant volume into Red adversary runner.
                </p>
              </div>
              <div className="text-[10px] font-mono text-sky-400 mt-2 font-medium">
                Invalidates: G1 → T01
              </div>
            </button>

            {/* M3 */}
            <button
              onClick={() => onApplyMutation('M3')}
              disabled={isRunning}
              className={`p-3 rounded-md border text-left transition flex flex-col justify-between ${
                isM3Active
                  ? 'bg-rose-950/30 border-rose-600/50 text-rose-200'
                  : 'bg-[#090d16] border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono font-semibold mb-1">
                  <span className={isM3Active ? 'text-rose-400' : 'text-slate-200'}>M3: Bridge Network</span>
                  <Network className={`w-3.5 h-3.5 ${isM3Active ? 'text-rose-400' : 'text-slate-500'}`} />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Attach Red adversary container to private Blue management network.
                </p>
              </div>
              <div className="text-[10px] font-mono text-sky-400 mt-2 font-medium">
                Invalidates: G2 → T02
              </div>
            </button>

            {/* M4 */}
            <button
              onClick={() => onApplyMutation('M4')}
              disabled={isRunning}
              className={`p-3 rounded-md border text-left transition flex flex-col justify-between ${
                isM4Active
                  ? 'bg-rose-950/30 border-rose-600/50 text-rose-200'
                  : 'bg-[#090d16] border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono font-semibold mb-1">
                  <span className={isM4Active ? 'text-rose-400' : 'text-slate-200'}>M4: Gateway Cache</span>
                  <Bot className={`w-3.5 h-3.5 ${isM4Active ? 'text-rose-400' : 'text-slate-500'}`} />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Configure inference gateway context cache to shared multi-tenant pool.
                </p>
              </div>
              <div className="text-[10px] font-mono text-sky-400 mt-2 font-medium">
                Invalidates: G4 → T04
              </div>
            </button>

            {/* B1 Benign */}
            <button
              onClick={() => onApplyMutation('B1')}
              disabled={isRunning}
              className="p-3 rounded-md border bg-[#090d16] border-slate-800 hover:border-emerald-600/50 text-slate-300 text-left transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono font-semibold mb-1">
                  <span className="text-emerald-400">B1: Metadata Label</span>
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Modify harmless non-security label (e.g. audit session annotation).
                </p>
              </div>
              <div className="text-[10px] font-mono text-emerald-400 mt-2 font-medium">
                Zero Drift · Invariant Hash
              </div>
            </button>
          </div>
        </div>

        {/* Live Container Topologies */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Red Container */}
          <div className="p-3.5 rounded-md bg-[#090d16] border border-slate-800 text-xs font-mono">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
              <span className="flex items-center gap-1.5 font-bold text-rose-300">
                <Container className="w-3.5 h-3.5" />
                Runner: Role [Red]
              </span>
              <span className="text-[10px] text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-900">
                Adversary Harness
              </span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div>
                <span className="text-slate-500">volumeMounts:</span>{' '}
                <span className={isM2Active ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {config.redMounts.join(', ')}
                </span>
              </div>
              <div>
                <span className="text-slate-500">networks:</span>{' '}
                <span className={isM3Active ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {config.redNetworks.join(', ')}
                </span>
              </div>
              <div>
                <span className="text-slate-500">securityContext:</span>{' '}
                <span className="text-slate-300">readOnlyRoot={String(config.hardeningFlags.readOnlyRoot)}</span>
              </div>
            </div>
          </div>

          {/* Blue Container */}
          <div className="p-3.5 rounded-md bg-[#090d16] border border-slate-800 text-xs font-mono">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
              <span className="flex items-center gap-1.5 font-bold text-sky-300">
                <Container className="w-3.5 h-3.5" />
                Control Plane: Role [Blue]
              </span>
              <span className="text-[10px] text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-900">
                Trusted Plane
              </span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div>
                <span className="text-slate-500">storageVolume:</span>{' '}
                <span className="text-slate-300">/opt/blue/data</span>
              </div>
              <div>
                <span className="text-slate-500">privateSubnet:</span>{' '}
                <span className="text-slate-300">blue-private-net</span>
              </div>
              <div>
                <span className="text-slate-500">storageApiAuthz:</span>{' '}
                <span className={isM1Active ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {config.storageApiAuthz.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Model Gateway */}
          <div className="p-3.5 rounded-md bg-[#090d16] border border-slate-800 text-xs font-mono">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
              <span className="flex items-center gap-1.5 font-bold text-slate-200">
                <Bot className="w-3.5 h-3.5 text-sky-400" />
                Proxy: Model Gateway
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                Inference Proxy
              </span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div>
                <span className="text-slate-500">sessionCacheMode:</span>{' '}
                <span className={isM4Active ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {config.gatewaySessionIsolation.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-slate-500">canaryToken:</span>{' '}
                <span className="text-slate-300">CANARY-7X9B-VAL</span>
              </div>
              <div>
                <span className="text-slate-500">isolationScope:</span>{' '}
                <span className="text-slate-300">per-tenant context</span>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Diff Inspector */}
        <div className="p-3.5 rounded-md bg-[#090d16] border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-medium text-slate-300">
              Configuration Diff Inspector
              {diffs.length === 0 && (
                <span className="text-[11px] text-emerald-400 font-normal ml-2">
                  (Clean baseline — zero configuration drift)
                </span>
              )}
            </span>

            {affectedGuarantees.length > 0 && (
              <span className="font-mono text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Invalidated Guarantees: [{affectedGuarantees.join(', ')}]
              </span>
            )}
          </div>

          {diffs.length === 0 ? (
            <p className="text-slate-400 text-xs font-sans">
              All live configuration parameters align with the cryptographically verified baseline.
            </p>
          ) : (
            <div className="space-y-1.5 font-mono">
              {diffs.map((d, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border text-xs flex flex-wrap items-center justify-between gap-2 ${
                    d.isBenign
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{d.field}:</span>
                    <span className="line-through text-slate-500">{d.previousValue}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className={d.isBenign ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {d.currentValue}
                    </span>
                  </div>

                  <div>
                    {d.isBenign ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                        ✓ Benign Change · Fingerprint Invariant
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                        Affects {d.affectedGuarantee} → Re-run {d.affectedTest}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
