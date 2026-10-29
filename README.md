# Bayora Intelligence Center (SentinelFlow) — AI Model Security & Governance

> **Continuous AI model security evaluation, deterministic guardrails, and cryptographic audit evidence grounded in mathematical proof.**

Bayora Intelligence Center (incorporating the SentinelFlow security kernel) is a production-grade AI security evaluation and governance platform. It provides automated red teaming, deterministic guardrails, isolation verification probes, real model adapters, and cryptographic tamper-evident audit ledgers.

---

## 0. Core Invariant: "AI Explains, Math Decides"

The platform enforces a strict separation of concerns:
- **MATH DECIDES:** 100% of security verdicts, evaluation outcomes (Pass/Warning/Fail), policy violations (POL-001 through POL-005), configuration fingerprints (RFC 8785 canonical JSON), signed attestation tickets (ECDSA P-256), and audit evidence blocks are calculated via deterministic TypeScript algorithms, pure regex parsing, Shannon entropy thresholds, and SHA-256 hash chains. No LLM output ever influences an evaluation verdict or access decision.
- **AI EXPLAINS:** LLMs produce advisory explanations only (incident summaries, root causes, defensive mitigations). Every AI response is validated through strict Zod schemas (`AdvisorOutputSchema`) with an immediate 10-second fail-open fallback to deterministic templates. The user interface permanently labels advisory guidance with `Advisory – not a decision` and displays a provenance badge identifying `source: "llm" | "template"`.

---

## 1. Non-Negotiable Engineering Standards

1. **NO SIMULATION in Runtime Code:** Zero `Math.random()`, fake `setTimeout` delays, or hardcoded metrics exist in runtime paths (`server/`, `src/`). Test doubles exist only under `tests/`.
2. **Live Database Aggregates:** Every metric shown in the UI is computed via SQL queries over SQLite (`workspace/bayora.db`). The reconciliation ribbon is a live mathematical invariant:
   $$\text{Total Evaluated} = \text{Passed} + \text{Warning} + \text{Failed}$$
3. **Fail-Closed Security:** Any error, timeout, missing evidence, or unreachable target results in `FAIL`, `DENY`, or `UNVERIFIED` — never `PASS`.
4. **Honest Empty States:** An empty database renders clean, honest empty states, not simulated baseline numbers.
5. **Real Model Connectors:** Operates without cloud credentials using local Ollama (`llama3.2:3b`), or connects to vLLM, LM Studio, OpenAI, or Anthropic via `models.yaml`.

---

## 2. Platform Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Bayora User Interface                           │
│  (React 19 + TypeScript + Vite + Tailwind CSS v4 + Recharts Dashboards) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / SSE Stream
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Hono Node.js Server                            │
│  (Node 24 ESM, native node:sqlite, native node:crypto, RFC 8785 JSON)  │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ Deterministic      │ SentinelFlow       │ Universal Model Adapters     │
│ Policy Engine      │ Gateway Proxy      │ (Ollama, OpenAI-Compatible,  │
│ (POL-001 - POL-005)│ (/v1/chat/complet) │  Anthropic)                  │
├────────────────────┴────────────────────┴──────────────────────────────┤
│ Cryptographic Audit Ledger & State Machine (UNVERIFIED -> VERIFIED)    │
│ Hash Chain: SHA-256(Hash_{i-1} + RFC8785(Payload_i) + Timestamp_i)    │
│ Manifest Signatures: ECDSA P-256 (P-256/SHA-256)                       │
├────────────────────────────────────────────────────────────────────────┤
│ SQLite Storage Engine: workspace/bayora.db (WAL Mode, Append Triggers) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 with custom enterprise tokens
- **Data Visualization:** Recharts (Testing Trends AreaChart, Pass/Fail Donut, 6-Axis Capability Radar, Attack Success BarChart)
- **Icons:** Lucide Icons
- **Real-Time Progress:** Fetch with streaming reader (Server-Sent Events)

### Backend & Core Infrastructure
- **Server:** Node.js 24 ESM with Hono REST API framework (`@hono/node-server`)
- **Database:** SQLite via native `node:sqlite` (`DatabaseSync`) stored in `workspace/bayora.db`
- **Cryptography:** Native `node:crypto` (RFC 8785 canonical JSON, SHA-256 hash chains, ECDSA P-256 keys)
- **Model Connectors:** Ollama (local open-weights), OpenAI-compatible (vLLM, LM Studio, OpenAI), Anthropic
- **Schema Validation:** Zod v4 for advisory outputs
- **Container Isolation:** Dockerode client for T01–T05 isolation probes and mutation lab
- **Linter & Test Runner:** Oxlint (0 errors) and Vitest (114 passing tests)

---

## 4. Quick Start & Execution

### Prerequisites
- Node.js 22+ (tested on Node.js 24)
- npm 10+
- Optional: Ollama (running locally with `llama3.2:3b`)
- Optional: Docker (for running container isolation lab)

### Installation
```bash
# 1. Clone repository
git clone https://github.com/amitshukla-7/Bayora.git
cd Bayora

# 2. Install dependencies
npm install

# 3. Compile TypeScript & build client bundle
npm run build
```

### Running Services
```bash
# Start backend API (port 3001) and Vite dev server (port 5173) concurrently:
npm run dev

# Alternatively, in separate terminal tabs:
# Tab 1: Backend API
npm run server

# Tab 2: Frontend client
npx vite --port 5173
```
Open your browser to: **`http://localhost:5173`**

---

## 5. Verification, Tests & Benchmarks

### 1. Full Automated Test Suite
Run the 114 unit, integration, and security tests across all 9 test suites:
```bash
npm test
```
All 9 test files pass with zero failures:
- `tests/phase3_phase4.test.ts` (Model adapters & deterministic policies POL-001–POL-005)
- `tests/phase5.test.ts` (Gateway proxy, attestation tickets, hardened tools)
- `tests/phase6.test.ts` (Probes T01–T05 runner & assurance state machine)
- `tests/phase7.test.ts` (Hash chain, ECDSA manifest signing, offline tamper verification)
- `tests/phase8_phase9.test.ts` (Zod incident advisor & mutation lab)
- `tests/phase10_ui_integration.test.ts` (Streaming progress runner & raw evidence inspector)
- `tests/sentinelflow.test.ts` (SentinelFlow kernel benchmarks)
- `tests/bayora.test.ts` (Bayora platform operations)
- `tests/core.test.ts` (Canonical RFC 8785 hashing, crypto signing)

### 2. 200 Real Test Cases Benchmark Suite
Evaluate 200 real model test cases against deterministic policy engines:
```bash
npm run test:200
```
**Results:**
- Total Evaluated: 200
- Passed: 130 (65.0%)
- Warning: 32 (16.0%)
- Failed: 38 (19.0%)
- Invariant Reconciliation: $130 + 32 + 38 = 200$ (100.0% Exact)

### 3. Offline Independent Audit Verification
Cryptographically verify exported evidence bundles without network access:
```bash
npm run verify -- workspace/test_bundle.json
```

### 4. Fetching Public Benchmarks
Download established public evaluation benchmarks (HarmBench, JailbreakBench, TruthfulQA, XSTest):
```bash
npm run dataset:fetch
```

### 5. Seeding Development Test Fixtures
If desired for development preview, seed synthetic demonstration rows flagged with `is_synthetic = 1`:
```bash
npm run seed:dev
```
*(The UI permanently displays a `SYNTHETIC DATA MODE ACTIVE` warning banner whenever synthetic rows exist in the database).*

---

## 6. Defensive Policy Catalog

| Policy ID | Name | Detection Mechanism | Enforced Boundary | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **POL-001** | Secret & Credential Leakage | Regex pattern matching + Shannon entropy (>4.5) + Ephemeral canaries | Pre-egress & Gateway Output | Critical |
| **POL-002** | Instruction Injection & Jailbreak | Structural delimiter isolation + System override detection + Refusal scoring | Gateway Input Gate | Critical |
| **POL-003** | Unauthorized Tool Egress | Realpath symlink resolution + Null byte (`\0`) protection + Domain allowlist | Tool Invocation Gate | High |
| **POL-004** | Toxicity & Abusive Content | Lexical hostility scoring with strict mathematical ceiling ($\le 0.15$) | Gateway Output Gate | Medium |
| **POL-005** | Legal & Compliance Drift | Fictitious legal citation detection & docket verification | Gateway Output Gate | High |

---

## 7. Isolation Probes (T01–T05) & Mutation Lab

The platform includes runtime container isolation checks:
- **T01:** Filesystem Boundary Check (asserts zero bind mounts into blue evaluation volumes)
- **T02:** Network Boundary Scan (asserts L2/L3 microsegmentation between red runner and blue control planes)
- **T03:** Storage API Scope Assertion (verifies strict cryptographic token enforcement on MinIO)
- **T04:** Canary Token Leak Test (asserts zero KV cache context bleed across evaluation sessions)
- **T05:** Container Security Context Check (verifies read-only root, no-new-privileges, dropped Linux capabilities)

The **Mutation Lab (M1–M5, B1, REMEDIATE)** permits controlled fault injection to empirically demonstrate that probes transition the assurance state from `VERIFIED` $\to$ `BREACHED` $\to$ `RECOVERING`. If Docker is not running, controls are safely disabled with clear notices.

---

## 8. License

Apache 2.0. Built by the Bayora Security & Engineering Team.
