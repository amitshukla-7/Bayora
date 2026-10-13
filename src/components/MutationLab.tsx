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
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
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
  onApplyMutation: (type: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'B1' | 'REMEDIATE') => void;
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

  // M5: hardeningFlags
  const isHardeningDrifted =
    !config.hardeningFlags.readOnlyRoot ||
    !config.hardeningFlags.dropCapabilities.includes('ALL') ||
    !config.hardeningFlags.noNewPrivileges;
  if (isHardeningDrifted) {
    diffs.push({
      field: 'hardeningFlags',
      previousValue: 'readOnlyRoot=true, dropCaps=[ALL]',
      currentValue: `readOnlyRoot=${config.hardeningFlags.readOnlyRoot}, dropCaps=[${config.hardeningFlags.dropCapabilities.join(', ')}]`,
      affectedGuarantee: 'G5',
      affectedTest: 'T05',
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
  const isM5Active = isHardeningDrifted;

  return (
    <div className="bg-[#0e1320] rounded-lg border border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1a]">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Infrastructure Mutation & Configuration Drift Simulator (Section 12)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Inject synthetic perimeter degradation scenarios to test Sentinel's continuous drift mapping, selective retesting, and negative controls.
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
            Predefined Reversible Mutation Benchmark (M1–M5 & B1):
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
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

            {/* M5 */}
            <button
              onClick={() => onApplyMutation('M5')}
              disabled={isRunning}
              className={`p-3 rounded-md border text-left transition flex flex-col justify-between ${
                isM5Active
                  ? 'bg-rose-950/30 border-rose-600/50 text-rose-200'
                  : 'bg-[#090d16] border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono font-semibold mb-1">
                  <span className={isM5Active ? 'text-rose-400' : 'text-slate-200'}>M5: Hardening Drop</span>
                  <Container className={`w-3.5 h-3.5 ${isM5Active ? 'text-rose-400' : 'text-slate-500'}`} />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Disable read-only rootfs and retain excess Linux capabilities.
                </p>
              </div>
              <div className="text-[10px] font-mono text-sky-400 mt-2 font-medium">
                Invalidates: G5 → T05
              </div>
            </button>

            {/* B1 Benign Negative Control */}
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
                  Negative control: update non-security audit labels. Fingerprint invariant.
                </p>
              </div>
              <div className="text-[10px] font-mono text-emerald-400 mt-2 font-medium">
                Invariant · FPR: 0.0%
              </div>
            </button>
          </div>
        </div>

        {/* Visual Container Roles & Topologies */}
        <div className="border border-slate-800 rounded-lg p-3.5 bg-[#090d16]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              Active Container Boundaries & Role Topologies:
            </span>
            {affectedGuarantees.length > 0 && (
              <span className="text-amber-400 font-mono text-[10px] font-bold">
                Drifted: [{affectedGuarantees.join(', ')}]
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Red Container */}
            <div
              className={`p-3 rounded border font-mono text-xs ${
                isM2Active || isM3Active
                  ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                  : 'bg-[#0b101c] border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <span className="font-bold flex items-center gap-1.5">
                  <Container className="w-3.5 h-3.5 text-rose-400" />
                  Red-Team Runner (Untrusted)
                </span>
                <span className="text-[10px] px-1 rounded bg-slate-900 border border-slate-800">
                  sandbox-cgroup
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-400">
                <div>
                  Mounts:{' '}
                  <span className={isM2Active ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                    [{config.redMounts.join(', ')}]
                  </span>
                </div>
                <div>
                  Networks:{' '}
                  <span className={isM3Active ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                    [{config.redNetworks.join(', ')}]
                  </span>
                </div>
                <div>RootFS: readOnlyRoot={config.hardeningFlags.readOnlyRoot ? 'true' : 'false'}</div>
              </div>
            </div>

            {/* Blue Container */}
            <div className="p-3 rounded border font-mono text-xs bg-[#0b101c] border-slate-800 text-slate-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <span className="font-bold flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-sky-400" />
                  Blue-Team Control (Protected)
                </span>
                <span className="text-[10px] px-1 rounded bg-slate-900 border border-slate-800">
                  ground-truth
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-400">
                <div>Volume: /opt/blue/data (Private Rubrics)</div>
                <div>Network: blue-private-net (Isolated)</div>
                <div>Role: Ground-truth evaluator & scoring model</div>
              </div>
            </div>

            {/* Model Gateway */}
            <div
              className={`p-3 rounded border font-mono text-xs ${
                isM1Active || isM4Active
                  ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                  : 'bg-[#0b101c] border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <span className="font-bold flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                  Model Gateway / Storage API
                </span>
                <span className="text-[10px] px-1 rounded bg-slate-900 border border-slate-800">
                  inference-proxy
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-400">
                <div>
                  KV Context Pool:{' '}
                  <span className={isM4Active ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                    {config.gatewaySessionIsolation}
                  </span>
                </div>
                <div>
                  Storage Authz:{' '}
                  <span className={isM1Active ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                    {config.storageApiAuthz}
                  </span>
                </div>
                <div>Canary Token: 128-bit CANARY-7X9B-... active</div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Diff Inspector */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#090d16]">
          <div className="p-2.5 bg-[#070b14] border-b border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Active Configuration Diffs ({diffs.length} modified field{diffs.length === 1 ? '' : 's'})
            </span>
            {diffs.length === 0 ? (
              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Baseline Clean
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                Regressions / Drifts Active
              </span>
            )}
          </div>

          {diffs.length === 0 ? (
            <div className="p-4 text-center text-xs font-mono text-slate-500">
              Configuration is in clean baseline alignment. No configuration drift detected.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 font-mono text-xs">
              {diffs.map((d, i) => (
                <div key={i} className="p-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-semibold">{d.field}</span>
                    <span className="text-slate-500 text-[11px]">:</span>
                    <span className="text-slate-400 line-through text-[11px]">{d.previousValue}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span
                      className={`font-bold ${
                        d.isBenign ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {d.currentValue}
                    </span>
                  </div>

                  <div className="text-[10px]">
                    {d.isBenign ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold">
                        NEGATIVE CONTROL · NO DRIFT
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 font-semibold">
                        DRIFT TRIGGER: {d.affectedGuarantee} → {d.affectedTest}
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
