import React, { useState } from 'react';
import {
  Flame,
  Plus,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  AlertTriangle,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar
} from 'recharts';
import type { DashboardSummary, PageId } from '../types';

interface DashboardPageProps {
  summary: DashboardSummary;
  onNavigate: (page: PageId, extra?: string) => void;
  onOpenUploadModel: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  summary,
  onNavigate,
  onOpenUploadModel,
}) => {
  const [selectedRange, setSelectedRange] = useState<'7D' | '30D' | '90D'>('7D');

  // Distribution chart data
  const pieData = [
    { name: 'Passed', value: summary.passedRuns, color: '#10b981' },
    { name: 'Warning', value: summary.warningRuns, color: '#f59e0b' },
    { name: 'Failed', value: summary.failedRuns, color: '#ef4444' },
  ];

  const totalAdversarialProbes = summary.attackSuccess.reduce(
    (acc, a) => acc + (a.attempts || 0),
    0
  );

  const hasTrendData = summary.trends7d.some((t) => t.testRuns > 0);
  const hasRadarData = summary.benchmarkProfile.some((b) => b.score !== null && b.score > 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Permanent Synthetic Data Mode Warning Banner */}
      {summary.syntheticDataMode && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200/70 flex items-center justify-center text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs tracking-wider uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  SYNTHETIC DATA MODE ACTIVE
                </span>
                <span className="text-xs text-amber-700 font-medium">
                  Database contains development test fixtures (flagged <code>is_synthetic = 1</code>).
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                Statistics, scores, and findings reflect mock demonstration fixtures. To conduct certified evaluations, run <code>npm run eval</code> with a live model.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-xl border border-amber-300/80">
            DEMO LAB
          </span>
        </div>
      )}

      {/* Critical Invariant Violation Alert (Live Mathematical Verification) */}
      {summary.ribbonValid === false && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-center gap-3 text-rose-900 shadow-xs">
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold uppercase tracking-wider text-rose-800">
              CRITICAL INVARIANT VIOLATION:
            </span>{' '}
            Total evaluated cases ({summary.totalRuns}) does not equal the sum of Passed (
            {summary.passedRuns}) + Warning ({summary.warningRuns}) + Failed ({summary.failedRuns}).
            Database reconciliation error.
          </div>
        </div>
      )}

      {/* Hero Welcome Card */}
      <div className="bayora-card-hero p-8 relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9B7DE8]/15 border border-[#9B7DE8]/30 text-[#7952D8] text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            EVALUATION & GOVERNANCE
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Bayora Intelligence Center
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Continuous AI model security evaluation, deterministic guardrails, and cryptographic audit evidence grounded in mathematical proof.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('redteam')}
              className="bayora-btn-primary px-5 py-3 text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              <span>Launch Red Team Evaluation</span>
            </button>

            <button
              onClick={onOpenUploadModel}
              className="bayora-btn-secondary px-5 py-3 text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Register Model</span>
            </button>
          </div>
        </div>

        {/* Provenance badge */}
        <div className="absolute right-6 top-6 text-right">
          <span className="text-[11px] font-mono text-slate-400 bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200/60 inline-flex items-center gap-1.5">
            <Info className="w-3 h-3 text-[#9B7DE8]" />
            Live SQL Provenance: workspace/bayora.db
          </span>
        </div>
      </div>

      {/* Row 1: Testing Trend (AreaChart) & Pass/Fail Distribution (PieChart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card A: Testing Trend */}
        <div className="lg:col-span-2 bayora-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Testing Trend</h2>
              <p className="text-xs text-slate-500">
                Evaluation volume and observed hallucination rates
              </p>
            </div>

            {/* Date Range Selector Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
              {(['7D', '30D', '90D'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRange(r)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedRange === r
                      ? 'bg-white text-[#7952D8] font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Series Legend */}
          <div className="flex items-center gap-6 text-xs text-slate-600 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#9B7DE8]" />
              <span>Test Runs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
              <span>Hallucination Rate (%)</span>
            </div>
          </div>

          {/* Recharts Area Chart or Honest Empty State */}
          <div className="h-64 w-full">
            {hasTrendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.trends7d} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9B7DE8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#9B7DE8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08)',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="testRuns"
                    stroke="#9B7DE8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#purpleGradient)"
                    name="Test Runs"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="hallucinationRate"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#amberGradient)"
                    name="Hallucination Rate"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <span className="text-xs font-semibold text-slate-600">No evaluations recorded in the last 7 days</span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  Run a live evaluation using the Red Team studio to generate empirical testing trends.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card B: Pass / Fail Distribution */}
        <div className="bayora-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Pass / Fail Distribution</h2>
            <p className="text-xs text-slate-500">Evaluation outcome reconciliation</p>
          </div>

          {/* Donut Chart with Centered Total */}
          <div className="relative h-56 flex items-center justify-center my-2">
            {summary.totalRuns > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={88}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                    {summary.totalRuns.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Total Runs
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-dashed mb-2" />
                <span className="text-xs font-semibold text-slate-600">No Evaluation Data</span>
                <span className="text-[11px] text-slate-400">Total Probes: 0</span>
              </div>
            )}
          </div>

          {/* Legend Table */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-700 font-medium">Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 font-mono">
                  {summary.passedRuns.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({summary.passRate !== null ? `${summary.passRate}%` : 'no data'})
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-700 font-medium">Warning</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 font-mono">
                  {summary.warningRuns.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({summary.warningRate !== null ? `${summary.warningRate}%` : 'no data'})
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-slate-700 font-medium">Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 font-mono">
                  {summary.failedRuns.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({summary.failedRate !== null ? `${summary.failedRate}%` : 'no data'})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Security Overview (8 Categories), Benchmark Radar Profile & Attack Success Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card C: Security Overview (8 Risk Categories) */}
        <div className="bayora-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Security Overview</h2>
              <p className="text-xs text-slate-500">Risk exposure score (0-100 scale)</p>
            </div>
            <button
              onClick={() => onNavigate('security')}
              className="text-xs text-[#8762E0] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
            >
              <span>Policies</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {summary.securityOverview.map((item) => (
              <div key={item.category} className="space-y-1" title={item.provenance || ''}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{item.category}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                        item.severity === 'Minimal' || item.severity === 'Low'
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.severity === 'No Data'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="font-bold text-slate-800">
                      {item.riskScore !== null ? item.riskScore : '—'}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: item.riskScore !== null ? `${item.riskScore}%` : '0%',
                      backgroundColor: item.statusColor
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card D: Benchmark Profile (Radar Chart) */}
        <div className="bayora-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Benchmark Profile</h2>
              <p className="text-xs text-slate-500">6-dimensional capability safety index</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {hasRadarData ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={summary.benchmarkProfile} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="axis" stroke="#64748b" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={10} />
                  <Radar
                    name="Evaluated Safety Profile"
                    dataKey="score"
                    stroke="#9B7DE8"
                    fill="#9B7DE8"
                    fillOpacity={0.35}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <span className="text-xs font-semibold text-slate-600">No benchmark evaluations</span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Run multi-dimensional benchmark suites to measure safety, robustness, factuality, compliance, and reasoning.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Normalized (Higher = Superior)</span>
            <span className="font-semibold text-[#8762E0]">Live SQL Radar</span>
          </div>
        </div>

        {/* Card E: Attack Success (Bar Chart) */}
        <div className="bayora-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Attack Success</h2>
              <p className="text-xs text-slate-500">Adversarial breakthrough rate (%)</p>
            </div>
            <button
              onClick={() => onNavigate('evaluations')}
              className="text-xs text-[#8762E0] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
            >
              <span>Findings</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            {summary.attackSuccess.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.attackSuccess} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip
                    cursor={{ fill: 'rgba(155, 125, 232, 0.08)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px'
                    }}
                  />
                  <Bar
                    dataKey="successRate"
                    fill="#9B7DE8"
                    radius={[8, 8, 0, 0]}
                    name="Breakthrough Rate"
                    onClick={(entry: any) => onNavigate('evaluations', entry?.category)}
                    className="cursor-pointer hover:opacity-85"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <span className="text-xs font-semibold text-slate-600">No adversarial test cases evaluated</span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Run adversarial attack scenarios in the Red Team Studio to calculate Attack Success Rates (ASR) with Wilson 95% CIs.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Click bar to inspect findings</span>
            <span className="font-mono text-slate-500 font-medium">
              {totalAdversarialProbes > 0
                ? `${totalAdversarialProbes.toLocaleString()} Total Probes`
                : 'No adversarial probes'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
