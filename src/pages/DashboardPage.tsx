import React, { useState } from 'react';
import {
  Flame,
  Plus,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  ArrowUpRight
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
  const [selectedBenchmarkModel, setSelectedBenchmarkModel] = useState('GPT-4o Omnimodel');

  // Distribution chart data
  const pieData = [
    { name: 'Passed', value: summary.passedRuns, color: '#10b981' },
    { name: 'Warning', value: summary.warningRuns, color: '#f59e0b' },
    { name: 'Failed', value: summary.failedRuns, color: '#ef4444' },
  ];

  // Benchmark radar data adjustments based on model selector
  const benchmarkData = summary.benchmarkProfile.map(item => {
    let score = item.score;
    if (selectedBenchmarkModel.includes('Llama')) {
      score = item.axis === 'Robustness' ? 72 : item.axis === 'Latency' ? 95 : item.score - 4;
    } else if (selectedBenchmarkModel.includes('Distil')) {
      score = item.axis === 'Latency' ? 98 : item.score - 18;
    }
    return { ...item, score };
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Hero Welcome Card */}
      <div className="bayora-card-hero p-8 relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9B7DE8]/15 border border-[#9B7DE8]/30 text-[#7952D8] text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            WELCOME BACK
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Bayora Intelligence Center
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Monitor, evaluate and secure your AI models — continuous red teaming, safety evidence and compliance in one calm surface.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('redteam')}
              className="bayora-btn-primary px-5 py-3 text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              <span>Run New Test</span>
            </button>

            <button
              onClick={onOpenUploadModel}
              className="bayora-btn-secondary px-5 py-3 text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Upload Model</span>
            </button>
          </div>
        </div>

        {/* Decorative subtle background watermark */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-5 pointer-events-none">
          <ShieldAlert className="w-96 h-96 text-[#9B7DE8]" />
        </div>
      </div>

      {/* Row 1: Testing Trend (Area Chart) & Pass/Fail Distribution (Donut Chart) */}
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

          {/* Recharts Area Chart */}
          <div className="h-64 w-full">
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
          </div>

          {/* Legend Table */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-700 font-medium">Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 font-mono">{summary.passedRuns.toLocaleString()}</span>
                <span className="text-[11px] text-slate-400 font-mono">({summary.passRate}%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-700 font-medium">Warning</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 font-mono">{summary.warningRuns.toLocaleString()}</span>
                <span className="text-[11px] text-slate-400 font-mono">({summary.warningRate}%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-slate-700 font-medium">Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 font-mono">{summary.failedRuns.toLocaleString()}</span>
                <span className="text-[11px] text-slate-400 font-mono">({summary.failedRate}%)</span>
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
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{item.category}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                        item.severity === 'Minimal' || item.severity === 'Low'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="font-bold text-slate-800">{item.riskScore}</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${item.riskScore}%`,
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
            <select
              value={selectedBenchmarkModel}
              onChange={(e) => setSelectedBenchmarkModel(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700 outline-hidden font-medium cursor-pointer"
            >
              <option value="GPT-4o Omnimodel">GPT-4o</option>
              <option value="Llama 3.2 3B Instruct">Llama 3.2 3B</option>
              <option value="DistilGPT2 Local SLM">DistilGPT2</option>
            </select>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={benchmarkData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="axis" stroke="#64748b" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={10} />
                <Radar
                  name={selectedBenchmarkModel}
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
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Normalized (Higher = Superior)</span>
            <span className="font-semibold text-[#8762E0]">Suite: v1.2</span>
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.attackSuccess} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="%" domain={[0, 40]} />
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
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Click bar to inspect findings</span>
            <span className="font-mono text-slate-500 font-medium">1,940 Total Probes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
