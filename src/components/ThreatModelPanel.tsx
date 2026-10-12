import { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, Server, Lock, AlertTriangle } from 'lucide-react';

export const ThreatModelPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-[#0e1320] rounded-lg border border-slate-800 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[#12192b] transition bg-[#0a0f1a]"
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <div>
            <span className="text-sm font-semibold text-slate-200">
              Security Architecture, Threat Model & Trust Boundaries
            </span>
            <span className="ml-2 text-xs text-slate-400 font-mono">
              (Formal Scope & Boundary Assumptions)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono border border-slate-800">
            {isOpen ? 'Hide Specification' : 'View Specification'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-slate-800 text-xs font-sans text-slate-300 space-y-4 bg-[#090d16]">
          <div className="p-3 rounded bg-amber-950/20 border border-amber-500/30 text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-xs">Architectural Simulation Notice:</strong>
              <p className="mt-0.5 text-slate-300 text-[11px] leading-relaxed">
                This workbench models an AI red-teaming security boundary verifier executing with native Web Crypto SHA-256.
                It verifies configuration fingerprints, maps drifts to affected guarantees, detects ledger tampering via cryptographic hash chaining,
                and executes fail-closed policy gating before untrusted evaluation runs are initiated.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* In-Scope */}
            <div className="p-3.5 rounded bg-[#0b101c] border border-slate-800 space-y-2">
              <h4 className="font-mono font-bold text-sky-300 flex items-center gap-1.5 text-xs">
                <Server className="w-3.5 h-3.5" />
                In-Scope Perimeter Protections
              </h4>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside text-[11px] leading-relaxed">
                <li>
                  <strong className="text-slate-100">Filesystem Separation (G1):</strong> Validates that untrusted runner containers maintain zero bind mount exposure to blue evaluation datasets or host root paths.
                </li>
                <li>
                  <strong className="text-slate-100">Network Microsegmentation (G2):</strong> Ensures red test workloads cannot bridge to private management or blue control subnets.
                </li>
                <li>
                  <strong className="text-slate-100">API Authorization (G3):</strong> Asserts cryptographic bearer token validation and rejects unauthenticated storage scopes.
                </li>
                <li>
                  <strong className="text-slate-100">Inference Session Confidentiality (G4):</strong> Detects multi-tenant context cache leaks and canary token bleed in shared inference proxies.
                </li>
                <li>
                  <strong className="text-slate-100">Workload Hardening (G5):</strong> Enforces immutable root filesystems, dropped Linux capabilities, and default seccomp profiles.
                </li>
                <li>
                  <strong className="text-slate-100">Cryptographic Audit Ledger:</strong> Append-only SHA-256 hash chain detecting payload tampering, unauthorized status alterations, and dropped events.
                </li>
              </ul>
            </div>

            {/* Out of Scope */}
            <div className="p-3.5 rounded bg-[#0b101c] border border-slate-800 space-y-2">
              <h4 className="font-mono font-bold text-slate-400 flex items-center gap-1.5 text-xs">
                <Lock className="w-3.5 h-3.5" />
                Explicit Limitations & Out-of-Scope Risks
              </h4>
              <ul className="space-y-1.5 text-slate-400 list-disc list-inside text-[11px] leading-relaxed">
                <li>
                  <strong className="text-slate-200">Host OS & Hypervisor:</strong> The host Linux kernel, containerd runtime, and physical CPU/RAM are assumed to be trusted roots of trust.
                </li>
                <li>
                  <strong className="text-slate-200">Container Breakouts & Zero-Days:</strong> Sentinel operates at the configuration and policy boundary; it does not detect kernel privilege escalation zero-days (e.g. Dirty Pipe, runc escapes).
                </li>
                <li>
                  <strong className="text-slate-200">Hardware & Microarchitectural Attacks:</strong> Physical fault injection (Rowhammer) and CPU/cache timing side channels (Spectre/Meltdown) are outside the model.
                </li>
                <li>
                  <strong className="text-slate-200">GPU Hardware Co-location:</strong> Covert timing channels across co-located NVIDIA GPU partitions or shared memory busses are out of scope.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
