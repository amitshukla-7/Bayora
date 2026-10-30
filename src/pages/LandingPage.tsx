import React from 'react';
import {
  ShieldCheck,
  Lock,
  Zap,
  CheckCircle2,
  Terminal,
  Cpu,
  ArrowRight,
  Database,
  KeyRound,
  FileCheck2,
  Layers,
  UserPlus
} from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenRegister
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-[#f8faff] via-[#f0f4fc] to-[#f6f3fe] text-slate-800 selection:bg-[#9B7DE8]/30 selection:text-slate-900 relative overflow-x-hidden">
      {/* Decorative ambient gradient blooms */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#9B7DE8]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute top-1/3 right-10 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8762E0] via-[#9B7DE8] to-[#6366F1] flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg text-slate-900 tracking-tight">Bayora</span>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-[#9B7DE8]/15 text-[#7952D8] rounded-full border border-[#9B7DE8]/25">
                Enterprise
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono tracking-tight -mt-0.5">
              Intelligence Center · Model Security
            </p>
          </div>
        </div>

        {/* Status & Auth Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Platform Ready · v1.0</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-white/80 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200"
            >
              Sign In
            </button>
            <button
              onClick={onOpenRegister}
              className="bayora-btn-primary px-4 py-2 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="relative z-10 flex-1 flex flex-col justify-center max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#9B7DE8]/15 border border-[#9B7DE8]/30 text-[#7048D4] text-xs font-medium tracking-wide">
            <Lock className="w-3.5 h-3.5 text-[#8762E0]" />
            <span>Deterministic AI Model Red Teaming & Cryptographic Assurance</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.12]">
            AI Explains. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#7A50DC] via-[#9B7DE8] to-[#4F46E5] bg-clip-text text-transparent">
              Math Decides.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Continuous adversarial evaluations, automated prompt injection defense, sensitive canary leakage tracking,
            and tamper-evident cryptographic ledgers with zero simulation.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenLogin}
              className="bayora-btn-primary w-full sm:w-auto px-6 py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-500/20"
            >
              <KeyRound className="w-4 h-4" />
              <span>Sign In to Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenRegister}
              className="bayora-btn-secondary w-full sm:w-auto px-6 py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-slate-500" />
              <span>Create New Workspace</span>
            </button>
          </div>

          {/* Security & Architecture Highlights Strip */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-slate-700">Zero-Trust Guardrails</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-slate-700">Memory-Hard scrypt Hashing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-slate-700">Deterministic Policy Oracles</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16 max-w-5xl mx-auto w-full">
          {/* Card 1 */}
          <div className="bayora-card p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-[#8762E0] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Deterministic Policy Oracle</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Evaluates every LLM completion against strict mathematical policies. Zero probabilistic hallu-grading;
                policies check deterministic boundaries, regex constraints, and entropy ceilings.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-[#7048D4] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Immutable Safety Invariants</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bayora-card p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Live Adversarial Red Teaming</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated multi-turn jailbreak attempts, indirect prompt injections, and canary token extractions.
                Accurately distinguishes legitimate refusals from compliances.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-blue-600 font-medium">
              <Terminal className="w-3.5 h-3.5" />
              <span>Live Streaming Telemetry</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bayora-card p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Cryptographic Hash Chains</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Audit events are serialized according to RFC 8785 canonical JSON, sequentially hashed with SHA-256,
                and cryptographically signed using ECDSA P-256 digital signatures.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-emerald-600 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Tamper-Evident Ledger</span>
            </div>
          </div>
        </div>

        {/* Runtime Ecosystem Footer Strip */}
        <div className="mt-14 pt-8 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Supported Model Runtimes:</span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center gap-1.5 shadow-2xs">
            <Cpu className="w-3.5 h-3.5 text-purple-500" />
            Ollama (Local Offline)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center gap-1.5 shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-orange-500" />
            Groq Cloud (Qwen 2.5)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center gap-1.5 shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            Anthropic Claude 3.5
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center gap-1.5 shadow-2xs">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            OpenAI GPT-4o
          </span>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-slate-200/70 py-6 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Bayora Technologies Inc. · Enterprise AI Governance & Security Platform</p>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>RFC 8785 Canonical JSON</span>
            <span>·</span>
            <span>SHA-256 Chains</span>
            <span>·</span>
            <span>scrypt Memory-Hard Auth</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
