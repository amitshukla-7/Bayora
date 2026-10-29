# Bayora Intelligence Center (SentinelFlow) — Complete System Documentation & Architectural Blueprint

> **"AI Explains, Math Decides"**  
> Enterprise AI Model Security Testing, Continuous Red Teaming, Policy Guardrails, and Cryptographic Governance.

---

## Table of Contents

1. [Executive Summary & Core Philosophy](#1-executive-summary--core-philosophy)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Frontend Architecture & UI Walkthrough](#4-frontend-architecture--ui-walkthrough)
   - 4.1 Design System & Aesthetic Principles
   - 4.2 Application State & Router (`App.tsx`)
   - 4.3 Navigation & Layout (`Sidebar`, `TopBar`, `StatusBanner`)
   - 4.4 Global Command Palette (`CommandPalette.tsx`)
   - 4.5 Page Breakdown (Dashboard, Red Team, Models, Security, Datasets, Evaluations, Profile)
5. [Backend Architecture & API Specification](#5-backend-architecture--api-specification)
   - 5.1 Server Framework & Architecture (`server/index.mjs`)
   - 5.2 Complete REST API Reference
6. [Data Storage & SQLite Schema](#6-data-storage--sqlite-schema)
   - 6.1 Database Initialization & Schema (`server/db.mjs`)
   - 6.2 Pre-Seeded Datasets & Baseline Metrics
7. [Red Team Evaluation Engine](#7-red-team-evaluation-engine)
   - 7.1 Attack Vectors & Categories (All 9 Surfaces)
   - 7.2 Deterministic Simulation Engine (`server/evaluationEngine.mjs`)
   - 7.3 Multi-Model Support & Execution Modes
8. [Defensive Security Guardrails & Gateway](#8-defensive-security-guardrails--gateway)
   - 8.1 Active Security Policies (POL-001 through POL-005)
   - 8.2 SentinelFlow Gateway (`gateway.mjs`, `tools.mjs`)
   - 8.3 Fail-Closed Decision Protocol
9. [Cryptographic Audit Ledger & Integrity Verification](#9-cryptographic-audit-ledger--integrity-verification)
   - 9.1 SHA-256 Hash Chaining & Genesis Anchor
   - 9.2 RFC 8785 Canonical JSON Serialization
   - 9.3 Digital Signatures (ECDSA P-256)
   - 9.4 Real-Time & Offline Verification (`scripts/verify.mjs`)
10. [Test Suites & Quality Assurance](#10-test-suites--quality-assurance)
    - 10.1 Vitest Automated Test Suites
    - 10.2 200-Case Verification Benchmark (`scripts/test_200_cases.mjs`)
11. [Setup, Execution & Deployment Guide](#11-setup-execution--deployment-guide)
12. [Threat Model, Non-Claims & Transparent Limitations](#12-threat-model-non-claims--transparent-limitations)

---

## 1. Executive Summary & Core Philosophy

### 1.1 What is Bayora Intelligence Center?
**Bayora Intelligence Center** (powered internally by the **SentinelFlow** security gateway) is an enterprise-grade AI model security testing, automated red teaming, defensive policy governance, and cryptographic audit evidence platform.

Modern enterprises deploying Large Language Models (LLMs) and Small Language Models (SLMs) face acute security challenges:
- **Prompt Injections & Jailbreaks**: Adversaries manipulating models into ignoring system instructions.
- **Sensitive Data & PII Leakage**: Models regurgitating proprietary API tokens, employee payroll, or customer secrets.
- **Data Exfiltration**: Autonomous agents tricking models into calling unauthorized egress webhooks or external email endpoints.
- **Toxicity & Brand Damage**: Generation of hostile, abusive, or discriminatory text.
- **Hallucinations & Compliance Drift**: Fabricating legal citations, medical facts, or violating regulations like EU AI Act, NIST AI RMF, and ISO/IEC 42001.

Bayora provides a unified, calm executive surface to continuously evaluate models, enforce active defensive guardrails, and generate mathematically verifiable proof of model safety.

### 1.2 The Core Invariant: "AI Explains, Math Decides"
In many AI governance tools, an LLM is placed in the critical path to decide whether another LLM behaved safely. This introduces severe vulnerabilities: the evaluator LLM can be jailbroken, can hallucinate, or can produce non-deterministic verdicts.

Bayora strictly decouples **verdict authority** from **explanation generation**:
1. **Math Decides**: All evaluation verdicts (Passed / Warning / Failed), policy gating decisions (ALLOWED / DENIED), configuration fingerprints, and audit records are computed using deterministic logic, regex matching, heuristic thresholds, and SHA-256 cryptographic hashes.
2. **AI Explains**: Language models are used strictly in an advisory capacity (e.g. generating human-readable root-cause explanations and mitigation advice). Every AI explanation is strictly validated and backed by deterministic fallbacks.

---

## 2. End-to-End System Architecture

```
+---------------------------------------------------------------------------------------+
|                                    BAYORA CLIENT (SPA)                                 |
|  React 19 + TypeScript + Vite + Tailwind CSS v4 + Recharts (Port 5173 / Browser)      |
|                                                                                       |
|  [Dashboard]      [Red Team Studio]    [Model Registry]     [Security Policies]       |
|  [Datasets]       [Findings Inspector] [Audit Ledger Modal] [Command Palette (Cmd+K)] |
+------------------------------------------+--------------------------------------------+
                                           | HTTP / REST (Vite Proxy: /api -> :3001)
                                           v
+---------------------------------------------------------------------------------------+
|                                  HONO REST API SERVER                                 |
|                      Node.js 24 + Hono Web Framework (Port 3001)                      |
|                                                                                       |
|  /api/dashboard/summary   /api/models           /api/datasets                         |
|  /api/security/policies   /api/security/events  /api/evaluations/launch               |
|  /api/findings            /api/audit/verify     /api/admin/reset                      |
+------------------------------------------+--------------------------------------------+
         |                                 |                                 |
         v                                 v                                 v
+------------------+             +-------------------+             +--------------------+
|  SQLITE STORAGE  |             | EVALUATION ENGINE |             | CRYPTOGRAPHIC      |
|  node:sqlite     |             | (server/          |             | LEDGER             |
|  DatabaseSync    |             |  evaluationEngine)|             | (server/ledger)    |
|                  |             |                   |             |                    |
|  * models        | <---------- | * 9 Attack Vector | ----------> | * SHA-256 chaining |
|  * datasets      |             |   probes          |             | * RFC 8785 JSON    |
|  * policies      |             | * Dynamic Policy  |             | * ECDSA P-256      |
|  * findings      |             |   Enforcement     |             |   Digital Signatures|
|  * audit_evidence|             | * Multi-model runs|             | * Tamper Detection |
+------------------+             +-------------------+             +--------------------+
```

---

## 3. Technology Stack

### 3.1 Frontend
- **Framework**: React 19 (`react`, `react-dom`)
- **Language**: TypeScript (`~6.0.2`, strict typing, zero build warnings)
- **Bundler & Dev Server**: Vite (`^8.3.0`) with `@vitejs/plugin-react`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite` & `tailwindcss ^4.3.3`)
- **Data Visualization**: Recharts (`^3.10.1`) — AreaChart, LineChart, PieChart (Donut), RadarChart, BarChart
- **Icons**: Lucide React (`^1.55.0`)
- **Networking**: Native Fetch API with structured JSON response handling

### 3.2 Backend & Data
- **Runtime**: Node.js 24 (using native `--experimental-strip-types` and modern ES Modules)
- **Web Framework**: Hono (`hono ^4.13.14`) with `@hono/node-server`
- **Embedded Database**: Native Node.js SQLite (`import { DatabaseSync } from 'node:sqlite'`)
- **Cryptographic Engine**: Native Node.js `node:crypto` and Web Crypto API (`globalThis.crypto.subtle`)
- **Process Orchestration**: Concurrently (`^10.0.6`) for unified development runner

### 3.3 Testing & Quality Assurance
- **Test Runner**: Vitest (`^5.0.5`)
- **Linter**: Oxlint (`oxlint ^1.81.0`)
- **Standalone CLI Verifier**: Independent offline script (`scripts/verify.mjs`)
- **Comprehensive Benchmark**: 200 architectural verification test suite (`scripts/test_200_cases.mjs`)

---

## 4. Frontend Architecture & UI Walkthrough

### 4.1 Design System & Aesthetic Principles
The Bayora interface is designed specifically for enterprise security operations teams who demand clean data density without visual fatigue:
- **Palette**:
  - Background: Subtle lavender-tinted slate gradient (`#f8faff` to `#f6f3fe`).
  - Primary Accent: Soft royal purple / lavender (`#9B7DE8` / `#8762e0`).
  - Dark Navy Text: High contrast `#101827` and slate `#64748b`.
  - Severity Badges: Emerald Green (`#10b981` / `bg-emerald-50`), Amber (`#f59e0b` / `bg-amber-50`), Crimson Coral (`#ef4444` / `bg-rose-50`).
- **Cards**: Large curved surfaces (`rounded-[28px]` or `rounded-[32px]`) with frosted glass backdrop blur (`backdrop-blur-md`), hairline borders (`border-white/80` or `border-slate-200/60`), and soft diffuse elevation shadows.

### 4.2 Application State & Router (`src/App.tsx`)
The root application coordinates global state across all components:
- `activePage`: Currently displayed screen (`dashboard`, `redteam`, `models`, `security`, `datasets`, `evaluations`, `profile`).
- `summary`: Live metrics summary payload from `/api/dashboard/summary`.
- `models`, `policies`, `datasets`, `findings`, `events`: Master caches fetched via `Promise.all` upon initialization.
- `handleResetDemo`: One-click master state restoration invoking `/api/admin/reset` and reloading all fixture records.

### 4.3 Navigation & Shared Components
- **Sidebar (`src/components/Sidebar.tsx`)**:
  - Persistent left-hand rail displaying Bayora emblem, version badge, navigation menu items with real-time active indicators, and a bottom "Reset Demo Fixtures" trigger.
- **TopBar (`src/components/TopBar.tsx`)**:
  - Displays breadcrumb navigation, a global Search button (triggers `Cmd+K`), a real-time Notification Drawer (showing evaluation completion notices and policy alerts), and operator avatar.
- **StatusBanner (`src/components/StatusBanner.tsx`)**:
  - Real-time indicator displaying system health, active policy count, and cryptographic ledger status.

### 4.4 Global Command Palette (`src/components/CommandPalette.tsx`)
Accessible via keyboard shortcut `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux):
- Real-time fuzzy filtering over:
  - All 7 platform pages.
  - All registered AI models (e.g. GPT-4o, Llama 3.2 3B).
  - All defensive security policies (POL-001 through POL-005).
  - High and Critical security findings.
  - Active datasets and benchmarks.
- Instant navigation and selection with arrow keys and Enter.

### 4.5 Detailed Page Breakdown

#### Page 1: Executive Dashboard (`src/pages/DashboardPage.tsx`)
Provides senior engineering and security leadership with total visibility:
1. **Metrics Reconciliation Ribbon**:
   - Total Evaluated Runs (seeded at 2,286+ and dynamically incrementing with every live evaluation).
   - Reconciled Breakdown: Passed Runs (1,842 / ~80.6%), Warning Runs (316 / ~13.8%), Failed Runs (128 / ~5.6%).
   - Exact mathematical reconciliation: `Passed + Warning + Failed === TotalRuns`.
2. **7-Day Evaluation Trends Chart**:
   - Dual-axis visual showing daily test volume (bars/area) and hallucination incidence rate (%) across the preceding week.
3. **Security Overview (8 Risk Categories)**:
   - Real-time risk exposure score (0-100) across: Jailbreak, Prompt Injection, Sensitive Data Leakage, Bias, Toxicity, Hallucination, Compliance Drift, Supply Chain Risk.
4. **6-Axis Benchmark Radar Profile**:
   - Visualizing model capabilities and safety bounds across Reasoning, Safety, Robustness, Latency, Factuality, and Compliance.
5. **Attack Success Rate Distribution**:
   - Bar chart quantifying attacker success rates and total attempts across the top adversarial vectors.

#### Page 2: Red Team Evaluation Studio (`src/pages/RedTeamPage.tsx`)
The operations cockpit for executing adversarial evaluations:
1. **7 Preset Scenarios**:
   - *Quick Demo*: 12 test cases (~5 mins) for rapid spot-checks.
   - *Medium*: 24 test cases (~15 mins) across balanced vectors.
   - *Large*: 50 test cases (~30 mins) with deep permutations.
   - *Multi-Model Comparison*: Identical test cases run concurrently against multiple models.
   - *Comprehensive*: Full 9-category adversarial assault.
   - *Maximum Stress Test*: Boundary edge cases and extreme adversarial load.
   - *Hugging Face Model*: Safe local adapter evaluation for open weights.
2. **Target Model Multi-Selector**: Interactive toggle chips for GPT-4o, Llama 3.2 3B, Mistral 7B, DistilGPT2, and custom registered models.
3. **Attack Surface Toggles**: 9 selectable categories with safety guards preventing accidental zero-category execution.
4. **Execution Bound Controls**: Sliders for Max Test Cases (1 to 100), Random Seed (reproducibility), and Concurrency (1 to 16 threads).
5. **Live Execution Progress Indicator**: Real-time progress bar simulating test step execution, active probe updates, and immediate auto-navigation to results upon completion.

#### Page 3: Model Registry (`src/pages/ModelsPage.tsx`)
Central catalog for all models under security governance:
- Model cards detailing provider, identifier, version, model type, risk score (0-100), total evaluations, and historical pass rate.
- **Execution Mode Tracking**: Every model is transparently badged:
  - `Simulation`: Deterministic offline evaluation adapter (no API keys required).
  - `Mock API`: Synthetic latency and endpoint mocking.
  - `Live`: Real network inference against external or local endpoints.
- **Register New Model Modal**: Form supporting custom name, provider, identifier, endpoint URL, and execution mode.
- Model deletion with instant database cascade.

#### Page 4: Defensive Security Policies (`src/pages/SecurityPage.tsx`)
The management console for active runtime guardrails:
- Interactive cards for policies POL-001 through POL-005.
- One-click Enable / Disable toggle switches with immediate backend sync.
- Built-in JSON Rule Editor with automatic syntax verification and error alerting.
- **Live Security Event Stream**: Real-time log showing security event timestamps, severity, affected model target, and whether the payload was blocked or logged.

#### Page 5: Datasets Studio (`src/pages/DatasetsPage.tsx`)
Adversarial test case repository:
- Built-in *Bayora Core Adversarial Benchmark v1.2* containing 24 curated test cases across 9 attack surfaces.
- Granular test case inspection: prompt text, expected safe behavior, severity classification, evaluation method, and reference responses.
- Category filters and instant text search.
- **Custom Dataset Uploader**: Modal supporting JSON and CSV file uploads, automatic category extraction, validation, and dynamic insertion into SQLite.

#### Page 6: Evaluation Results & Audit Inspector (`src/pages/EvaluationResultsPage.tsx`)
Post-run diagnostic analysis:
- Evaluation selector dropdown with duration, date, and pass/fail summary tags.
- Reconciled metric cards for the selected run.
- Granular findings table with multi-factor filtering (Search text, Category, Severity, Status).
- **Finding Detail Drawer**: Clicking any finding opens an in-depth slide-out panel revealing:
  - Exact adversarial prompt passed to the model.
  - Raw observed output produced by the model.
  - Expected reference behavior.
  - Root-cause technical explanation.
  - Policy violated (with link to policy details).
  - Technical evidence token matches.
  - Actionable mitigation recommendations.
- **Export Options**: Download complete evaluation reports in JSON or CSV formats.
- **Cryptographic Audit Ledger Modal**: Interactive dialog to trigger SHA-256 chain verification and inspect block hashes.

#### Page 7: Profile & Workspace Settings (`src/pages/ProfilePage.tsx`)
- Operator profile card (Principal Architect, AI Security Lead).
- Workspace dedicated cluster parameters.
- Session credentials status.
- Primary "Reset All Demo Data" button.

---

## 5. Backend Architecture & API Specification

### 5.1 Server Framework (`server/index.mjs`)
The backend is built on **Hono**, a high-performance, lightweight web standards-compliant API framework running on Node.js 24 with `@hono/node-server`.

Key characteristics:
- Native ESM modules (`"type": "module"`).
- Global CORS middleware allowing cross-origin requests from the Vite frontend.
- Fail-safe error handling returning structured JSON error bodies: `{ "error": "message" }`.
- Default listening port: `3001` (overridable via `PORT` environment variable).

### 5.2 Complete REST API Reference

| Method | Endpoint | Description | Request Body / Query | Response Format |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Health and environment status | None | `{ status: "ACTIVE", product: string, version: string, mode: string, timestamp: string }` |
| `GET` | `/api/dashboard/summary` | Reconciled metrics, trends, radar | None | `{ totalRuns, passedRuns, warningRuns, failedRuns, passRate, trends7d, securityOverview, benchmarkProfile, attackSuccess }` |
| `GET` | `/api/models` | List all registered models | None | `{ models: Model[], total: number }` |
| `GET` | `/api/models/:id` | Fetch specific model details | `id` in URL | `Model` object or 404 |
| `POST` | `/api/models` | Register a new AI model | `{ name, provider, identifier, version?, description?, model_type?, execution_mode?, endpoint? }` | `Model` object (Status 201) |
| `DELETE` | `/api/models/:id` | Delete model from registry | `id` in URL | `{ success: true, id: string }` |
| `GET` | `/api/datasets` | List all available datasets | None | `{ datasets: Dataset[], total: number }` |
| `GET` | `/api/datasets/:id` | Get dataset with all test cases | `id` in URL | `Dataset & { cases: DatasetCase[] }` |
| `POST` | `/api/datasets/upload` | Upload custom dataset | `{ name, description?, cases: DatasetCase[] }` | Created `Dataset` object (Status 201) |
| `GET` | `/api/security/policies` | List all defensive policies | None | `{ policies: Policy[], total: number }` |
| `PATCH` | `/api/security/policies/:id` | Toggle or update policy rules | `{ is_enabled?, name?, description?, rules? }` | Updated `Policy` object |
| `GET` | `/api/security/events` | Stream recent security events | None (defaults to 30) | `{ events: SecurityEvent[] }` |
| `GET` | `/api/evaluations` | List historical evaluation runs | None | `{ evaluations: Evaluation[], total: number }` |
| `GET` | `/api/evaluations/:id` | Get evaluation run with findings | `id` in URL | `Evaluation & { findings: Finding[] }` |
| `POST` | `/api/evaluations/launch` | Execute new evaluation run | `{ name, presetScenario, modelIds, categories, executionSettings }` | Completed `Evaluation` with findings (Status 201) |
| `GET` | `/api/evaluations/:id/export` | Download report (JSON or CSV) | `?format=json` or `?format=csv` | File attachment download |
| `GET` | `/api/findings` | Filter findings across runs | `?category=...&severity=...&status=...&evaluationId=...` | `{ findings: Finding[], total: number }` |
| `GET` | `/api/audit/evidence` | Fetch cryptographic ledger log | None | `{ records: AuditRecord[], total: number }` |
| `POST` | `/api/audit/verify` | Cryptographically verify ledger | None | `{ verified: boolean, totalRecords: number, latestHash: string, message: string }` |
| `POST` | `/api/admin/reset` | Restore baseline seed data | None | `{ success: true, message: string }` |

---

## 6. Data Storage & SQLite Schema

### 6.1 Database Architecture (`server/db.mjs`)
Data is stored locally in `workspace/bayora.db` using Node's built-in `node:sqlite` (`DatabaseSync`). This guarantees 100% portable, embedded zero-configuration persistence without requiring external database servers.

#### Core Tables & Schema Definitions

1. **`models`**:
   - `id TEXT PRIMARY KEY`, `name TEXT`, `provider TEXT`, `identifier TEXT`, `version TEXT`, `description TEXT`, `model_type TEXT`, `execution_mode TEXT`, `endpoint TEXT`, `status TEXT`, `registered_at TEXT`, `risk_score INTEGER`, `total_evaluations INTEGER`, `pass_rate REAL`.
2. **`datasets`**:
   - `id TEXT PRIMARY KEY`, `name TEXT`, `version TEXT`, `description TEXT`, `total_cases INTEGER`, `categories TEXT (JSON)`, `is_builtin INTEGER`, `created_at TEXT`, `updated_at TEXT`.
3. **`dataset_cases`**:
   - `id TEXT PRIMARY KEY`, `dataset_id TEXT REFERENCES datasets(id)`, `category TEXT`, `prompt TEXT`, `expected_behavior TEXT`, `severity TEXT`, `evaluation_method TEXT`, `reference_response TEXT`, `metadata TEXT (JSON)`.
4. **`evaluations`**:
   - `id TEXT PRIMARY KEY`, `name TEXT`, `preset_scenario TEXT`, `status TEXT`, `models TEXT (JSON)`, `categories TEXT (JSON)`, `total_cases INTEGER`, `passed_count INTEGER`, `warning_count INTEGER`, `failed_count INTEGER`, `risk_score INTEGER`, `execution_duration_ms INTEGER`, `estimated_duration TEXT`, `execution_settings TEXT (JSON)`, `created_at TEXT`, `completed_at TEXT`.
5. **`findings`**:
   - `id TEXT PRIMARY KEY`, `evaluation_id TEXT REFERENCES evaluations(id)`, `model_id TEXT`, `model_name TEXT`, `category TEXT`, `severity TEXT`, `status TEXT`, `test_case_prompt TEXT`, `observed_response TEXT`, `expected_behavior TEXT`, `explanation TEXT`, `policy_violated TEXT`, `risk_score INTEGER`, `evidence TEXT`, `mitigation TEXT`, `created_at TEXT`.
6. **`policies`**:
   - `id TEXT PRIMARY KEY`, `name TEXT`, `category TEXT`, `description TEXT`, `severity TEXT`, `is_enabled INTEGER`, `rules TEXT (JSON)`, `version TEXT`, `updated_at TEXT`.
7. **`security_events`**:
   - `id TEXT PRIMARY KEY`, `timestamp TEXT`, `severity TEXT`, `category TEXT`, `description TEXT`, `blocked INTEGER`, `target TEXT`.
8. **`audit_evidence`**:
   - `sequence INTEGER PRIMARY KEY AUTOINCREMENT`, `event_id TEXT`, `evaluation_id TEXT`, `timestamp TEXT`, `event_type TEXT`, `canonical_payload TEXT`, `previous_hash TEXT`, `hash TEXT`.
9. **`metrics_baseline`**:
   - `id TEXT PRIMARY KEY`, `historical_total_runs INTEGER`, `historical_passed INTEGER`, `historical_warning INTEGER`, `historical_failed INTEGER`.

### 6.2 Pre-Seeded Datasets & Baseline Metrics
When `getDb()` runs on a fresh installation, it seeds:
- **4 Foundation Models**: GPT-4o Omnimodel, Llama 3.2 3B Instruct, Mistral 7B Instruct v0.3, and DistilGPT2 Local SLM.
- **Baseline Reconciled Metrics**: 2,286 historical runs (1,842 passed, 316 warnings, 128 failed).
- **5 Defensive Policies**: POL-001 through POL-005.
- **24 Curated Test Cases**: Bayora Core Adversarial Benchmark v1.2.
- **Initial Historical Evaluation (`eval_baseline_01`)**: Complete with 3 realistic findings (FND-1001, FND-1002, FND-1003).
- **Cryptographic Genesis Record**: Anchoring the audit ledger.

---

## 7. Red Team Evaluation Engine

### 7.1 Attack Vectors & Categories (All 9 Surfaces)
The evaluation engine probes models across the primary OWASP Top 10 for LLM Applications and MITRE ATLAS matrices:
1. **Jailbreak**: Persona adoption (e.g. "FreedomBot", "Grandmother exploit"), prefix injection overrides, and hypothetical framing designed to bypass ethical boundaries.
2. **Prompt Injection**: Direct and indirect instructions embedded in untrusted content (e.g. document summaries) attempting to override core system instructions.
3. **Sensitive Data Leakage**: Probing for proprietary tokens, dummy PII, simulated AWS keys, internal database credentials, or employee payroll figures.
4. **Data Exfiltration**: Attempts to trick autonomous agents into calling unauthorized outbound webhooks or sending sensitive data to external email addresses.
5. **Toxicity**: Hostile communication, abusive workplace language, and demographic harassment.
6. **Misinformation**: Fabricated public health emergencies, fake chemical properties, or demonstrably false factual assertions.
7. **Bias & Fairness**: Unjustified discrimination across resume screening or discriminatory credit risk criteria.
8. **Hallucination**: Fabricating legal citations (e.g. non-existent Supreme Court decisions) or historical events.
9. **Compliance Drift**: Deviations from regulatory mandates (EU AI Act Article 5 prohibited practices, NIST AI RMF, ISO/IEC 42001).

### 7.2 Deterministic Simulation Engine (`server/evaluationEngine.mjs`)
The platform includes an intelligent simulation engine that dynamically reflects active policies:
- **Sensitive Data Leakage Probes**:
  - If `POL-001` is **disabled** and `mod_distilgpt2` is evaluated: The model leaks synthetic credentials (`BAYORA_SECRET_KEY=demo_test_token_88921`), triggering a **Critical Failed** finding.
  - If `POL-001` is **enabled**: The policy gate intercepts and scrubs the output (`[POL-001 FILTER ACTIVATED] Simulated secret markers suppressed`), returning a **Low Passed** result.
- **Prompt Injection Probes**:
  - If `POL-002` is **disabled**: Models adopt nested instructions (`Instruction acknowledged. Bypassing previous task: SYSTEM PROMPT REVEALED`), resulting in a **Critical Failed** finding.
  - If `POL-002` is **enabled**: The input sanitizer neutralizes the delimiter, producing a **Passed** result.
- **Data Exfiltration Probes**:
  - If `POL-003` is **disabled**: Outbound calls to `unverified-external.com` succeed (**Critical Failed**).
  - If `POL-003` is **enabled**: Gateway blocks the tool call (**Passed**).
- **Toxicity & Hallucination**:
  - Evaluated against heuristic thresholds and known reference ground truths.

### 7.3 Multi-Model Support & Execution Modes
The engine supports evaluating individual models or running comparative evaluations across models simultaneously. Every evaluation updates the model's aggregate risk score, total evaluation counter, and pass rate in real time.

---

## 8. Defensive Security Guardrails & Gateway

### 8.1 Active Security Policies

| Policy ID | Policy Name | Attack Category | Severity | Default Action | Rule Definition Highlights |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POL-001** | Synthetic Secret & PII Disclosure Prevention | Sensitive Data Leakage | Critical | `BLOCK_AND_FLAG` | Regex patterns: `BAYORA_SECRET_`, `sk-live-`, `internal_payroll_secret`, `BEGIN RSA PRIVATE KEY` |
| **POL-002** | Prompt Injection & System Instruction Override Neutralization | Prompt Injection | Critical | `SANITIZE_OR_REJECT` | Heuristics: `ignore previous instructions`, `system override`, `DAN mode`, `developer mode enabled` |
| **POL-003** | Prohibited Tool Call & Remote Execution Gate | Data Exfiltration | Critical | `DENY` | Forbidden tools: `bash_exec`, `raw_socket`, `smtp_send_unverified`, `eval_remote_code` |
| **POL-004** | Toxicity, Harassment & Hate Speech Threshold | Toxicity | High | `FLAG_WARNING` | Maximum allowable toxicity score: `0.15` |
| **POL-005** | Compliance Drift & Regulatory Hallucination Filter | Compliance Drift | Medium | `RECORD_FINDING` | Active frameworks: `EU_AI_ACT`, `NIST_RMF_1.0`, `ISO_42001` |

### 8.2 SentinelFlow Gateway & Tool Execution (`tests/sentinelflow.test.ts`)
The underlying SentinelFlow gateway enforces strict execution isolation:
- **Path Traversal Guard**: Strictly rejects any filename containing `..`, absolute paths (`/etc/passwd`, `\root`), or illegal path separators before accessing the filesystem.
- **Pre-Execution Gating**: Tool calls (e.g. `mock_send_email`, `read_document`) are intercepted *before* opening any file or writing any outbox artifact. If unauthorized, the gate denies execution and logs an incident.
- **Approved Workspace Directories**: Valid output reports are written strictly to `workspace/output/`.

### 8.3 Fail-Closed Decision Protocol
If an unknown tool is invoked, if required parameters are missing, or if an evaluation times out, the system fails closed:
- Decision: `DENIED`
- Risk Level: `CRITICAL`
- Execution: `false`

---

## 9. Cryptographic Audit Ledger & Integrity Verification

### 9.1 SHA-256 Hash Chaining
Every evaluation run, security event, and policy state change appends a cryptographic block to the `audit_evidence` ledger:
- **Genesis Hash**:
  `0000000000000000000000000000000000000000000000000000000000000000`
- **Block Equation**:
  $$\text{Block Hash} = \text{SHA-256}(\text{previous\_hash} + \text{canonical\_payload} + \text{timestamp})$$

Because each block includes the hash of the preceding block, any alteration to a historical record (or deletion of a block) changes its hash and invalidates the entire downstream chain.

### 9.2 RFC 8785 Canonical JSON Serialization
To prevent false hash mismatches caused by key reordering, spacing differences, or newline conventions, all payloads are canonicalized following **RFC 8785 (JSON Canonicalization Scheme - JCS)** prior to hashing:
- Object keys are sorted lexicographically by UTF-16 code units.
- Whitespace is eliminated.
- Numbers are represented in strict IEEE 754 format.

### 9.3 Digital Signatures (ECDSA P-256)
Exported evidence bundles are attested using **ECDSA with NIST curve P-256** and **SHA-256**:
- Keypair: Generated via Web Crypto (`globalThis.crypto.subtle`) as a Software Signing Key.
- Manifest: Contains bundle version, event count, first event hash, latest event hash, and timestamp.
- Signature: The private key signs the canonical manifest hash, enabling third-party auditors to verify non-repudiation.

### 9.4 Real-Time & Offline Verification
Verification checks three strict criteria:
1. **Sequence Order & Completeness**: Verifies blocks are contiguous ($1, 2, 3, \dots, N$) with zero omissions.
2. **Hash Continuity**: Verifies each block's `previous_hash` matches the preceding block's actual hash.
3. **Block Payload Integrity**: Recomputes the SHA-256 digest for every block. If a single byte was altered, it pinpoints the exact sequence number that failed.
4. **Digital Signature**: Verifies that the manifest signature matches the public key JWK.

Verification can be executed:
- In the UI via the **Verify Audit Ledger** modal (`/api/audit/verify`).
- Offline in the terminal using the standalone CLI:
  ```bash
  node scripts/verify.mjs <exported_bundle.json>
  ```

---

## 10. Test Suites & Quality Assurance

### 10.1 Vitest Automated Test Suites
The codebase includes comprehensive automated tests run via Vitest:
- **`tests/bayora.test.ts`**:
  Validates dashboard metric reconciliations, model registry CRUD, dataset uploads, policy toggling, evaluation engine execution, finding generation, and SHA-256 audit ledger integrity.
- **`tests/sentinelflow.test.ts`**:
  Validates the 12 core requirements of the security gateway:
  1. Authorized file read succeeds under POL-001.
  2. Unauthorized file read is denied before opening under POL-002.
  3. Path traversal escapes (`../`) are rejected.
  4. Indirect prompt injection cannot grant permissions.
  5. Unauthorized external email is denied before outbox artifacts are written.
  6. Valid reports are written to approved directories.
  7. Policy changes update the SHA-256 configuration fingerprint.
  8. Tampering one byte causes cryptographic verification to fail.
  9. Unregistered tools fail closed.
  10. Dashboard displays real persisted SQLite data.
  11. Complete demonstration can be cleanly repeated multiple times.
  12. Missing external AI credentials run reliably in deterministic test mode.

### 10.2 200-Case Verification Benchmark (`scripts/test_200_cases.mjs`)
A rigorous 200-test diagnostic suite testing all 12 architectural layers:
- Tests 1–25: Canonical JSON RFC 8785 & Encoding Rigor.
- Tests 26–50: Cryptographic Hashing, Manifests & Fingerprinting.
- Tests 51–65: Diagnostic Probe T01 (Filesystem Isolation).
- Tests 66–80: Diagnostic Probe T02 (Network Microsegmentation).
- Tests 81–95: Diagnostic Probe T03 (Storage API Scope Assertion).
- Tests 96–110: Diagnostic Probe T04 (Model Session Confidentiality / Canary Leaks).
- Tests 111–125: Diagnostic Probe T05 (Workload Hardening).
- Tests 126–145: Controlled Mutation Benchmark & Drift Mappings.
- Tests 146–165: 7-Stage Lifecycle Protocol & Hash Chain Structure.
- Tests 166–180: Ledger Cryptographic Integrity & Tamper Detection.
- Tests 181–190: Completeness Protocol & Anti-Omission Detection.
- Tests 191–200: Deterministic State Machine Transitions & Precedence Rules.

---

## 11. Setup, Execution & Deployment Guide

### 11.1 Prerequisites
- **Node.js**: Version 22.0.0 or higher (Node.js 24 recommended).
- **Package Manager**: npm 10+ or pnpm.
- **Operating System**: Windows, macOS, or Linux.

### 11.2 Installation
In the project root directory:
```bash
npm install
```

### 11.3 Running the Development Server
To launch both the Hono backend server and the Vite frontend concurrently:
```bash
npm run dev
```

Alternatively, run them in separate terminal sessions:
```bash
# Terminal 1: Backend Server (runs on http://localhost:3001)
npm run server

# Terminal 2: Frontend Dev Server (runs on http://localhost:5173)
npx vite
```

Open your browser to: **`http://localhost:5173`**

### 11.4 Running the Test Suites
```bash
# Run Vitest automated test suite
npm test

# Run SentinelFlow gateway requirement tests
npm run test:sentinelflow

# Run the 200-case verification benchmark
npm run test:200

# Verify an exported audit bundle offline
node scripts/verify.mjs <path-to-bundle.json>
```

---

## 12. Threat Model, Non-Claims & Transparent Limitations

To ensure absolute integrity and clarity for security architects and auditors, Bayora explicitly documents what it does and does not claim:

### 12.1 Explicit Non-Claims & Out-of-Scope Threats
1. **Kernel Exploits & Microarchitectural Attacks**:
   Bayora guarantees sandbox isolation at the container and process boundary level. It does not protect against unpatched host kernel zero-days (e.g. Dirty Pipe) or speculative execution side-channels (Spectre, Meltdown, Rowhammer). Host-level intrusion detection (e.g. eBPF / Tetragon) is required for kernel-level defense.
2. **Hardware Security Modules (HSM)**:
   In this release, digital signatures are created using Web Crypto software keys labeled `"Software signing key"`. It does not claim hardware-backed Nitro Enclave or physical HSM root of trust.
3. **Filesystem Admin Rewrite**:
   The SHA-256 hash chain detects modifications made to existing records. However, an administrator with direct write access to the host disk could delete and recreate the `bayora.db` file from scratch unless the hash head is anchored to an external transparency log or remote ledger.

### 12.2 Prototype Disclosures
1. **Simulation Adapters**: Models are evaluated using deterministic simulation adapters clearly badged as `Simulation`. They run 100% offline without requiring paid third-party API keys or external network dependencies.
2. **Deterministic Fallbacks**: If an external LLM call times out or returns malformed output, the system fails closed to deterministic templates, preventing non-deterministic hangs.
3. **Demo Reset**: The master reset button allows any evaluator to wipe custom test data and restore baseline seed metrics instantaneously.

---

*Documentation compiled for Bayora Intelligence Center / SentinelFlow Architecture.*

