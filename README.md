# Bayora 🛡️
### Continuous AI Red-Teaming Infrastructure Verification & Fail-Closed Gate

Bayora is an enterprise-grade architectural prototype demonstrating continuous, cryptographic verification for adversarial AI safety testbeds. It continuously verifies that an AI red-teaming sandbox's isolation guarantees (filesystem boundaries, network microsegmentation, storage API authorizations, model gateway context isolation, and container hardening) hold after configuration changes or runtime drift.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# App runs at: http://localhost:5173/

# 3. Build for production (TypeScript + Vite)
npm run build
```

---

## 🧠 Architectural Overview

Bayora models a secure multi-tenant AI testing harness with three distinct roles:
1. **`red` (Adversary Container):** Executes untrusted jailbreak prompts, tool calls, and model attack suites. Must be strictly isolated.
2. **`blue` (Control Plane / Evaluator):** Holds gold-standard evaluation prompts, ground-truth benchmarks, and grading models.
3. **`model-gateway` (Inference Proxy):** Routes prompts to model backends (e.g., vLLM/TGI) with session partitioning.

```
                  ┌───────────────────────────────────────────┐
                  │              BAYORA VERIFIER              │
                  └─────┬───────────────────────────────┬─────┘
                        │ Canonical SHA-256 Fingerprint │
                        ▼                               ▼
       ┌───────────────────────────────┐     ┌───────────────────────────────┐
       │     Adversarial Harness       │     │     Blue Team Evaluator       │
       │        (Role: Red)            │     │        (Role: Blue)           │
       │  Mount: /opt/red/workspace    │     │  Mount: /opt/blue/data        │
       │  Network: red-isolated-net    │     │  Network: blue-private-net    │
       └───────────────┬───────────────┘     └───────────────┬───────────────┘
                       │                                     │
                       └──────────────┐       ┌──────────────┘
                                      ▼       ▼
                       ┌─────────────────────────────────────┐
                       │            Model Gateway            │
                       │     (Strict Session Isolation)      │
                       └─────────────────────────────────────┘
```

### Isolation Guarantees & Test Mapping (G1–G5)

| Guarantee | Test ID | Target Probe | Failure Condition |
| :--- | :--- | :--- | :--- |
| **G1: Storage Isolation** | `T01` | Filesystem boundary check | Red container mounts `/opt/blue/*` or host root `/` |
| **G2: Network Isolation** | `T02` | Network boundary scan | Red container attaches to `blue-private-net` or admin bridge |
| **G3: API Authorization** | `T03` | Storage API authz assertion | Storage API operates in `relaxed` (unauthenticated) mode |
| **G4: Session Confidentiality** | `T04` | Canary token leak test | Model gateway context cache configured with `shared` pool |
| **G5: Workload Hardening** | `T05` | Workload hardening check | `readOnlyRoot` disabled, capabilities not dropped, or seccomp relaxed |

---

## 🔄 Assurance State Machine

Bayora transitions across 5 deterministic assurance states:

```
          ┌─────────────┐
          │ UNVERIFIED  │ (Initial state or tampered evidence)
          └──────┬──────┘
                 │ Passing full run (5 tests)
                 ▼
          ┌─────────────┐  Security config drift   ┌─────────────┐
          │  VERIFIED   ├─────────────────────────►│    STALE    │
          └──────▲──────┘                          └──────┬──────┘
                 │                                        │ Failing test run
                 │ Passing all tests                      ▼
          ┌──────┴──────┐  Config fixed/remediated ┌─────────────┐
          │ RECOVERING  │◄─────────────────────────┤  BREACHED   │
          └─────────────┘                          └─────────────┘
```

1. **`UNVERIFIED`**: Default state upon boot, or triggered if the audit chain is tampered with or incomplete. Fail-closed gate blocks access.
2. **`VERIFIED`**: Full test suite passes. Configuration fingerprint matches verified baseline. Gate grants access.
3. **`STALE`**: Relevant configuration drifts from baseline. Bayora calculates per-guarantee digests and flags only affected tests.
4. **`BREACHED`**: An active test fails (e.g., volume boundary or network breach). Environment is flagged compromised.
5. **`RECOVERING`**: Configuration is remediated back to clean parameters. Retesting required before verification is restored.
- **Benign Changes (B1)**: Adding non-security labels or tags does **not** alter the cryptographic fingerprint or degrade state.

---

## 🔒 Cryptographic Mechanisms

1. **Deterministic Canonical Fingerprinting:**
   - Security-relevant parameters (`redMounts`, `redNetworks`, `storageApiAuthz`, `gatewaySessionIsolation`, `hardeningFlags`) are recursively sorted and serialized into canonical JSON.
   - Hashed using **Web Crypto SHA-256** (`crypto.subtle.digest`).
2. **Per-Guarantee Digests & Selective Retesting:**
   - Bayora maintains individual SHA-256 digests for each guarantee ($G_1$ through $G_5$).
   - If an operator modifies only the storage authorization mode, only $G_3$ digest drifts. Bayora enables **Selective Retest: 1 test (T03)** instead of rerunning all 5 tests.
3. **Tamper-Evident Hash Chain Audit Log:**
   - Every lifecycle event (`run.started`, `test.started`, `test.completed`, `policy.decision`, `run.completed`) contains:
     - `sequence`: Integer index (1, 2, 3...)
     - `previous_event_hash`: Hash of sequence $n-1$ (Genesis: `0000...`)
     - `event_hash`: $SHA-256(\text{canonical}(sequence, run\_id, timestamp, event\_type, payload, prev\_hash))$
   - **Audit Verification:**
     - Recomputes full chain links to detect **`VALID`**, **`TAMPERED`** (modified payload or broken pointer), or **`INCOMPLETE`** (missing planned event).

---

## ⏱️ 3-Minute Walkthrough & Demonstration Script

### Minute 1: Baseline Verification & Attestation
1. Open the application (`http://localhost:5173`).
2. Point out the **`UNVERIFIED`** state badge in the top executive header.
3. In the **Evaluation Policy Gate** section, click **"Request Evaluation Access"**.
   - *Result:* Gate returns **`DENIED`** (Reason: State is UNVERIFIED · Fail-Closed Policy Enforced).
4. Click **"Verify All (5 Probes)"** in the top navbar (or "Run Full Verification").
   - Probes execute with measured latency (350–650 ms per test).
   - Posture changes to **`VERIFIED`** with clean emerald indicator.
   - Cryptographic fingerprint is locked as the verified baseline.
5. Click **"Request Evaluation Access"** on the gate.
   - *Result:* Gate returns **`GRANTED`** with signed attestation certificate `TKT-BAYORA-<hash>-OK`.

### Minute 2: Drift Detection & Selective Retesting
1. Switch to the **Drift & Mutation Lab** tab, and click **`M1: Relax Authz`**.
   - Notice the status immediately changes to **`CONFIG DRIFT` (STALE)**.
   - The diff panel highlights: `storageApiAuthz: strict -> relaxed (Affects G3 -> Re-run T03)`.
   - The Top Bar updates dynamically with: **`Retest (1)`**.
2. Click **"Request Evaluation Access"** on the policy gate.
   - *Result:* Gate returns **`DENIED`** (fail-closed, requires T03 retest).
3. Click **`Run Selective Retest (1 probe: T03)`**.
   - Probe T03 executes and returns **`FAIL`** (unauthenticated token probes succeeded).
   - Posture flips to **`BREACH DETECTED`**.
4. Click **`Remediate to Baseline`** in the Mutation Lab.
   - State transitions to **`RECOVERING`**.
5. Click **`Run Selective Retest (1 probe: T03)`**.
   - T03 passes. Posture returns to **`VERIFIED`**.
6. Click **`B1: Metadata Label`**.
   - Show that metadata labels change without altering the security fingerprint or degrading the `VERIFIED` state.

### Minute 3: Cryptographic Audit & Tamper Simulation
1. Switch to the **Audit Hash Chain** tab.
2. Click **`Verify Ledger`**.
   - Bayora recomputes all SHA-256 hashes across the chain.
   - Banner displays **`AUDIT STATUS: VALID`** (All chain links mathematically verified).
3. Click **`Simulate Tamper`**.
   - Simulates an attacker modifying a recorded event payload (e.g. flipping a `FAIL` to a forged `PASS` without updating the cryptographic hash).
   - Click **`Verify Ledger`** (or observe live detection):
   - Status reports **`AUDIT STATUS: TAMPERED`**. The exact broken sequence row is highlighted with a crimson border.
   - The Fail-Closed Gate automatically locks down to **`UNVERIFIED`**.
4. Click **`Simulate Drop`**.
   - Drops an expected `test.completed` event from an evaluation run.
   - Audit verification reports **`AUDIT STATUS: INCOMPLETE`**, citing the missing planned event manifest.
5. Review the **Threat Model & Scope** tab to inspect formal trust boundaries and scope limitations.

---

## 📊 Honesty & Metrics Transparency

- **No Synthetic Benchmarks:** In accordance with rigorous testing principles, this prototype displays **zero fake performance claims or spoofed telemetry**.
- **Real Live Browser Values:**
  - All test durations (e.g., `452ms`) are measured via `performance.now()`.
  - Event sequence numbers, log counts, and chain hashes are generated live via Web Crypto `crypto.subtle`.
  - Pass/fail counts directly reflect the evaluated in-memory state.

---

## 🛡️ Threat Model Scope & Assumptions

### In Scope
- Container boundary misconfigurations (unauthorized bind mounts, volume sharing).
- Ingress/egress network bridging across tenant subnets.
- Storage service role/scope relaxation.
- Multi-tenant model inference context / KV-cache leakage.
- Container workload hardening configurations.
- Audit log tampering and omitted log events.

### Out of Scope (Explicit Limitations)
- **Host & Hypervisor Trust:** The host Linux kernel, containerd/Docker daemon, and CPU/RAM are assumed to be trusted roots of trust.
- **Kernel Breakouts & Zero-Days:** Bayora operates at the configuration and policy boundary; it does not detect kernel privilege escalation zero-days (e.g. runc vulnerabilities, Dirty Pipe).
- **Hardware Faults & Side Channels:** Physical fault injection (Rowhammer) and microarchitectural timing side channels (Spectre, Meltdown, GPU co-located timing) are outside the model.

---

## 🛠️ Tech Stack
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS (Enterprise cloud security design system)
- **Cryptography:** Native browser Web Crypto API (`SHA-256`)
- **Icons:** Lucide React
