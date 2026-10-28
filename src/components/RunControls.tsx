import { Play, RotateCw, Loader2 } from 'lucide-react';
import type { TestId } from '../types';

interface RunControlsProps {
  isRunning: boolean;
  currentRunningTest: TestId | null;
  testsToRunCount: number;
  selectiveTests: TestId[];
  onRunFullVerification: () => void;
  onRunSelectiveRetest: () => void;
  progressPercent: number;
  probeTrialProgress?: { current: number; total: number } | null;
}

export const RunControls: React.FC<RunControlsProps> = ({
  isRunning,
  currentRunningTest,
  testsToRunCount,
  selectiveTests,
  onRunFullVerification,
  onRunSelectiveRetest,
  progressPercent,
  probeTrialProgress,
}) => {
  const selectiveCount = selectiveTests.length;

  return (
    <div className="bg-[#0e1320] rounded-lg border border-slate-800 p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-100">
              Automated Probe Execution Engine
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous verification orchestrator. Selective retest targets only the probes whose underlying guarantee drifted.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selective Retest Button */}
          <button
            onClick={onRunSelectiveRetest}
            disabled={isRunning || selectiveCount === 0}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium transition ${
              selectiveCount > 0
                ? 'bg-amber-600/90 hover:bg-amber-500 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
            }`}
            title={
              selectiveCount > 0
                ? `Execute probes for drifted guarantees: [${selectiveTests.join(', ')}]`
                : 'No configuration drift detected'
            }
          >
            {isRunning && currentRunningTest && selectiveTests.includes(currentRunningTest) ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <RotateCw className="w-3.5 h-3.5 text-amber-200" />
            )}
            Run Selective Retest ({selectiveCount} {selectiveCount === 1 ? 'probe' : 'probes'}
            {selectiveCount > 0 ? `: ${selectiveTests.join(', ')}` : ''})
          </button>

          {/* Full Verification Button */}
          <button
            onClick={onRunFullVerification}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium bg-slate-100 hover:bg-white text-slate-900 disabled:opacity-50 transition shadow-sm"
          >
            {isRunning && !currentRunningTest ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" />
            ) : (
              <Play className="w-3.5 h-3.5 text-slate-900 fill-slate-900" />
            )}
            Run Full Verification ({testsToRunCount} Probes: T01–T05)
          </button>
        </div>
      </div>

      {/* Progress & Live Test Execution Indicator */}
      {isRunning && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <span className="flex items-center gap-2 text-sky-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Probing active boundary: <strong className="text-white">{currentRunningTest}</strong>
              {currentRunningTest === 'T04' && probeTrialProgress ? (
                <span className="px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 text-[11px] font-semibold">
                  Trial {probeTrialProgress.current} of {probeTrialProgress.total}
                </span>
              ) : (
                <span>...</span>
              )}
            </span>
            <span className="text-slate-400">{Math.round(progressPercent)}% complete</span>
          </div>

          <div className="w-full bg-[#090d16] rounded-full h-1.5 overflow-hidden border border-slate-800">
            <div
              className="bg-sky-500 h-1.5 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
