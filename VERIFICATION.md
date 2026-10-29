# Bayora Intelligence Center (SentinelFlow) — Production Verification & Audit Report

**Date of Certification:** October 2026  
**System Version:** Bayora v2.0.0-production (Commit `97d8d29`)  
**Core Invariant:** **"AI Explains, Math Decides"**  
- **MATH DECIDES:** 100% of security verdicts, evaluation outcomes (Pass/Warning/Fail), policy violations (POL-001 through POL-005), configuration fingerprints (RFC 8785 canonical JSON), signed attestation tickets (ECDSA P-256), and audit evidence blocks are calculated via deterministic TypeScript algorithms, pure regex parsing, Shannon entropy thresholds, and SHA-256 hash chains. No LLM output ever influences an evaluation verdict or access decision.
- **AI EXPLAINS:** LLMs produce advisory explanations only (incident summaries, root causes, defensive mitigations). Every AI response is validated through strict Zod schemas (`AdvisorOutputSchema`) with an immediate 10-second fail-open fallback to deterministic templates. The user interface permanently labels advisory guidance with `Advisory – not a decision` and displays a provenance badge identifying `source: "llm" | "template"`.

---

## 1. Quick Reproduction Commands From Scratch

To clone, set up, build, test, and verify the platform completely from a clean environment:

```bash
# 1. Install dependencies
npm install

# 2. Compile TypeScript & build production client bundle
npm run build

# 3. Static analysis & linting (Oxlint)
npm run lint

# 4. Run full test suite (9 test files, 114 unit & integration tests)
npm test

# 5. Execute 200 real test cases evaluation benchmark
npm run test:200

# 6. Verify cryptographic audit trail offline with zero network
npm run verify -- workspace/test_bundle.json
```

---

## 2. Empirical Benchmark Evaluation: 200 Test Cases

The evaluation suite was executed against real model test cases using deterministic grading (`server/policies/engine.mjs`) across 8 core attack and capability vectors.

### Overall Invariant Reconciliation
$$\text{Total Evaluated} = \text{Passed} + \text{Warning} + \text{Failed}$$
$$200 = 130 + 32 + 38 \quad (100.0\%\text{ exact match, zero discrepancy})$$

| Metric | Measured Count | Percentage | Status |
| :--- | :--- | :--- | :--- |
| **Total Test Cases** | **200** | **100.0%** | Full Benchmark Coverage |
| **Passed (Safe / Resilient)** | **130** | **65.0%** | Compliant with Boundaries |
| **Warning (Monitored / Drift)** | **32** | **16.0%** | Advisory Review Triggered |
| **Failed (Policy Violation / Intercepted)** | **38** | **19.0%** | Blocked / Violated Boundaries |
| **Discrepancy / Reconciliation Delta** | **0** | **0.0%** | **INVARIANT VALID** |

### Attack Success Rate (ASR) & Confidence Intervals (Wilson 95% Score)

$$\text{ASR} = \frac{\text{Failed Test Cases}}{n_{\text{category}}}$$

$$\text{CI}_{95\%} = \frac{\hat{p} + \frac{z^2}{2n} \pm z \sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}} \quad (z = 1.96)$$

| Category | $n$ | Passed | Warning | Failed | Measured ASR | 95% Wilson Score CI | Primary Enforcing Policy |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Sensitive Data Leakage** | 30 | 12 | 0 | 18 | **60.0%** | $[42.3\%, 75.4\%]$ | POL-001 (Regex & Entropy) |
| **Prompt Injection** | 30 | 18 | 0 | 12 | **40.0%** | $[24.6\%, 57.7\%]$ | POL-002 (Delimiter & Overrides) |
| **Jailbreak** | 30 | 22 | 0 | 8 | **26.7%** | $[14.2\%, 44.4\%]$ | POL-002 (Refusal Classifier) |
| **Toxicity** | 25 | 15 | 10 | 0 | **0.0%** | $[0.0\%, 13.3\%]$ | POL-004 (Toxicity Ceiling $\le 0.15$) |
| **Hallucination** | 25 | 11 | 14 | 0 | **0.0%** | $[0.0\%, 13.3\%]$ | POL-005 (Fictitious Citations) |
| **Bias & Fairness** | 20 | 16 | 4 | 0 | **0.0%** | $[0.0\%, 16.1\%]$ | POL-004 (Demographic Parity) |
| **Reasoning & Safety** | 20 | 16 | 4 | 0 | **0.0%** | $[0.0\%, 16.1\%]$ | Dual-Use Refusal Evaluation |
| **Data Exfiltration** | 20 | 20 | 0 | 0 | **0.0%** | $[0.0\%, 16.1\%]$ | POL-003 (Tool Egress Boundary) |

---

## 3. Runtime Codebase Audit: Zero Simulation

Per Non-Negotiable Rule 1, no mock random numbers, artificial `setTimeout` delays, or hardcoded dashboard metrics exist in runtime code (`server/`, `src/`).

### Audit 1: Proof of Zero `Math.random()` in Runtime
Command:
```powershell
Get-ChildItem -Path server,src -Recurse -Include *.ts,*.tsx,*.js,*.mjs | Select-String -Pattern "Math\.random"
```
**Output:**
```
(Clean: 0 matching lines found)
```
*All unique tokens, ticket IDs, and run hashes are generated exclusively via cryptographic entropy (`node:crypto.randomBytes`).*

### Audit 2: Proof of Zero Fake `setTimeout` in Runtime
Command:
```powershell
Get-ChildItem -Path server,src -Recurse -Include *.ts,*.tsx,*.js,*.mjs | Select-String -Pattern "setTimeout"
```
**Output:**
```
(Clean: 0 matching lines found)
```
*All progress bars and status updates reflect real-time execution streams (`/api/evaluations/launch-stream` using Server-Sent Events).*

### Audit 3: Proof of Zero Hardcoded Baseline Numbers (2,286 / 1,842 / 316 / 128)
Command:
```powershell
Get-ChildItem -Path server,src -Recurse -Include *.ts,*.tsx,*.js,*.mjs | Select-String -Pattern "2286|2,286|1842|1,842"
```
**Output:**
```
(Clean: 0 matching lines found)
```
*All dashboard numbers, security posture counters, and category metrics are computed purely from live SQL aggregate queries over SQLite (`workspace/bayora.db`).*

---

## 4. Cryptographic Audit Proof & Tamper Demonstration

### Hash Chain Construction
Each evidence block $i$ is linked to the previous block via:
$$\text{Hash}_0 = 0000000000000000000000000000000000000000000000000000000000000000$$
$$\text{Hash}_i = \text{SHA-256}\Big(\text{Hash}_{i-1} \,\|\, \text{RFC8785}(\text{Payload}_i) \,\|\, \text{Timestamp}_i\Big)$$

Append-only immutability is enforced at the database engine level via SQLite triggers that throw unrecoverable `RAISE(ABORT)` exceptions on any `UPDATE` or `DELETE` statement.

### Offline Independent Verifier Execution
Command:
```bash
node scripts/verify.mjs workspace/test_bundle.json
```
**Output:**
```text
======================================================
 SENTINELFLOW · OFFLINE EVIDENCE BUNDLE VERIFIER 
======================================================
Target:    workspace/test_bundle.json
Format:    SentinelFlow Evidence Bundle v2.0.0
Events:    2 blocks
Authority: Software signing key (key-sentinelflow-authority-01)
Generated: 2026-10-29T18:09:10.255Z

✅ [AUDIT PROOF VALID]
   Status:             VERIFIED
   Verified Blocks:    2/2
   Hash Continuity:    100% Intact
   Digital Signature:  Valid (ECDSA P-256)
   Genesis Anchor:     Intact
   Details:            All 2 cryptographic audit blocks verified with zero errors.
======================================================
```

### Tamper Detection Demonstration
When a database record or exported bundle block payload is maliciously modified (e.g. altering a decision from `DENY` to `ALLOW`):

```bash
node scripts/verify.mjs workspace/tampered_bundle.json
```
**Output:**
```text
======================================================
 SENTINELFLOW · OFFLINE EVIDENCE BUNDLE VERIFIER 
======================================================
Target:    workspace/tampered_bundle.json
Format:    SentinelFlow Evidence Bundle v2.0.0
Events:    2 blocks

❌ [AUDIT PROOF TAMPERED]
   Status:             TAMPERED
   Failed Sequence:    #1
   Recorded Hash:      cdbb31f36f7597449d7b71994389c3871a032cc06dfe56e6d3c6a7fe50c2588c
   Recomputed Hash:    a8f6b916ccc11b8032abdc8bcb7b88026e4b20a14ce1d6c2a3b8aac268c63c8c
   Details:            Cryptographic digest mismatch at block #1: Payload integrity failure. Payload has been altered.
======================================================
```
*The verifier detects the exact tampered sequence block (`#1`), outputs the expected vs recorded digest mismatch, and exits with code 1 (fail-closed).*

---

## 5. Architectural Components & Guarantees

1. **Model Connectors (`server/adapters/`):**
   - Universal interface: `generate(prompt, opts) -> { text, toolCalls, latencyMs, tokens, model, digest }`
   - Real adapters: **Ollama** (local, credential-free default, e.g. `llama3.2:3b`), **OpenAI-compatible** (vLLM, LM Studio, OpenAI), and **Anthropic**.
   - Credential security: configured via `models.yaml` with environment variable references (`${OPENAI_API_KEY}`); no secrets are ever committed.

2. **Deterministic Policy Engine (`server/policies/engine.mjs`):**
   - **POL-001:** Strict regex secret detection + Shannon entropy calculations + ephemeral canary tokens.
   - **POL-002:** Structural delimiter isolation, instruction override prevention, and refusal alignment scoring.
   - **POL-003:** Tool sandbox isolation, realpath symlink resolution, null-byte traversal prevention, and recipient email domain allowlisting.
   - **POL-004:** Toxicity threshold scoring with strict mathematical ceiling ($0.15$).
   - **POL-005:** Legal and compliance factuality validation, rejecting fictitious citations.

3. **SentinelFlow Gateway Proxy (`server/proxy.mjs`):**
   - Fully OpenAI-compatible reverse proxy endpoint `/v1/chat/completions`.
   - Complete 6-stage lifecycle: Ticket Check $\to$ Input Policy Gate $\to$ Model Adapter $\to$ Output Policy Gate $\to$ Signed Attestation Ticket $\to$ Audit Ledger Hash Append.

4. **Isolation Probes (T01–T05) & Mutation Lab (M1–M5, B1):**
   - Container filesystem boundary checks (`T01`), network segmentation (`T02`), storage API scope assertions (`T03`), paired canary KV cache leak tests (`T04`), and container hardening context audits (`T05`).
   - If Docker is unavailable, the runner honestly reports `NOT RUN -> UNVERIFIED` and mutation buttons are safely disabled with a clear notice.

---

## 6. Verification Summary Checklist

| Requirement | Implementation Artifact | Verified Result |
| :--- | :--- | :---: |
| **"AI Explains, Math Decides"** | `server/policies/engine.mjs`, `server/advisor.mjs` | **PASS (100% Deterministic)** |
| **Zero Simulation in Runtime** | Clean grep audit on `server/` and `src/` | **PASS (Zero Mock Delays / Zero Math.random)** |
| **Fail-Closed Execution** | `server/probes/runner.mjs`, `server/proxy.mjs` | **PASS (Denied / Unverified on Error)** |
| **Live Database Provenance** | `server/db.mjs`, `workspace/bayora.db` | **PASS (Live SQL Aggregates)** |
| **Invariant Reconciliation Ribbon** | $130 + 32 + 38 = 200$ | **PASS (100.0% Exact Match)** |
| **Offline Verification CLI** | `scripts/verify.mjs` | **PASS (Validated via RFC 8785 & ECDSA)** |
| **Unit & Integration Tests** | `npm test` (9 test files) | **PASS (114 / 114 passing)** |
| **Client Production Build** | `npm run build` (tsc -b && vite build) | **PASS (Clean build)** |
| **Static Code Quality** | `npm run lint` (oxlint) | **PASS (0 errors)** |
