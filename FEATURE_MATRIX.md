# Bayora Intelligence Center — Comprehensive Feature & Endpoint Matrix

> **Audit Date:** 2026-10-30  
> **Platform Version:** 1.2.0  
> **Evaluation Engine:** Node 24 ESM, Hono, node:sqlite (WAL mode), node:crypto (RFC 8785, SHA-256, ECDSA P-256)  
> **Verdict Rule:** "AI Explains, Math Decides" — All security verdicts are deterministic; LLMs provide labeled advisory text only.

---

## 1. UI Pages, Buttons, Forms & Controls

| Element / Control | Component / File | Expected Behavior | Actual Behavior | Status | Root Cause | Proposed Fix |
|---|---|---|---|---|---|---|
| **Health Diagnostics Status** | `server/index.mjs`, `server/health.mjs` | Return live status of Node 24, SQLite DB + WAL, ECDSA signing authority, workspace disk space, Ollama, Docker. | Returns live diagnostic object with HTTP 200/503. | **WORKING** | Initial stub resolved; wired to `checkSystemHealth()`. | Maintain health monitoring on startup. |
| **System Doctor CLI** | `scripts/doctor.mjs` (`npm run doctor`) | Print formatted console table of 6 vital platform components with colored status and remediation instructions. | Prints full 6-item diagnostics table with ANSI color coding and remediation advice. | **WORKING** | Implemented and integrated into `package.json`. | Add automated check in CI/CD pipeline. |
| **Date Range Filter (7D / 30D / 90D)** | `src/pages/DashboardPage.tsx` | Fetch and render historical testing volume and hallucination rates for selected date interval. | Modifies local state `selectedRange`, but chart solely renders `summary.trends7d` without fetching 30D or 90D data. | **FAKE** | API and SQL backend only aggregate 7-day rolling window (`trends7d`); front-end filter has no effect. | Add `days` query param to `/api/dashboard/summary?days=7|30|90` and compute date window in SQLite. |
| **Launch Red Team Evaluation Button** | `src/pages/DashboardPage.tsx` | Navigate to `/redteam` view to start safety evaluations. | Calls `onNavigate('redteam')` which renders `RedTeamPage`. | **WORKING** | Functional routing handler. | Persist active route in URL search params. |
| **Register Model Button (Hero)** | `src/pages/DashboardPage.tsx` | Open model registration modal on Models page. | Sets `isUploadModalOpen = true` and navigates to Models page. | **WORKING** | Functional callback. | Persist modal state in query params or lifted store. |
| **Attack Success Bar Click** | `src/pages/DashboardPage.tsx` | Drill down to Evaluation Findings filtered by clicked attack category. | Navigates to `/evaluations` and passes category filter. | **WORKING** | Handled by `onNavigate('evaluations', category)`. | Ensure category filter persists across tab switches. |
| **Preset Scenario Cards (A-G)** | `src/pages/RedTeamPage.tsx` | Clicking preset updates max test cases, duration, objective, and test categories. | Updates `selectedPreset` string only; does not update `maxCases`, `selectedCategories`, or `objective`. | **BROKEN** | Card `onClick` only invokes `setSelectedPreset(p.id)` without mapping preset configuration. | Update `setSelectedPreset` to populate `maxCases`, `selectedCategories`, and `objective` from preset config. |
| **Model Multi-Select Chips** | `src/pages/RedTeamPage.tsx` | Select or deselect target models for evaluation. | Toggles model IDs in local array `selectedModelIds`. | **PARTIAL** | Functional while on page, but state completely resets if user changes tab or refreshes. | Lift configuration to persistent store backed by SQLite `settings` table. |
| **Category Selection Pills** | `src/pages/RedTeamPage.tsx` | Select or deselect threat categories (Jailbreak, Injection, etc.). | Toggles category array in local component state. | **PARTIAL** | State resets upon navigating away from Red Team tab. | Persist selected category state in SQLite settings and URL query parameters. |
| **Launch Attack Test (Stream)** | `src/pages/RedTeamPage.tsx` | Stream evaluation execution via SSE, show live progress bar, and navigate to results. | Executes `/api/evaluations/launch-stream`, updates progress bar, refreshes data, and redirects. | **WORKING** | Functional SSE reader in `api.ts`. | Add connection abort handling and failure recovery. |
| **Model Creation Form** | `src/pages/ModelsPage.tsx` | Register external or local model with validated endpoint, credentials, and adapter. | Submits hardcoded `risk_score: 25`, `pass_rate: 90.0`, and fake `execution_mode: 'Simulation'`. | **FAKE** | No real smoke test verification; no GGUF upload or Ollama pull; accepts unverified inputs. | Implement verification job with nonce echo test; add chunked GGUF upload & Ollama `/api/pull`. |
| **Model Delete Button** | `src/pages/ModelsPage.tsx` | Delete registered model from SQLite database. | Issues `DELETE /api/models/:id` and refreshes list. | **WORKING** | Functional DB delete. | Add confirmation modal with impact warning on historic evaluations. |
| **Model Provider Filters** | `src/pages/ModelsPage.tsx` | Filter model list by provider (OpenAI, Meta, Mistral, HF). | Filters in-memory array in React. | **PARTIAL** | Filter resets on tab change. | Move provider filter state to persistent settings. |
| **Policy Enforcement Toggles** | `src/pages/SecurityPage.tsx` | Toggle policy between OFF, MONITOR, and ENFORCE modes. | Binary toggle `0` or `1` for `is_enabled`; does not support MONITOR mode; bypasses confirmation on Critical policies. | **BROKEN** | Policy engine in backend evaluates rules regardless of active state; no typed reason recorded. | Implement `policy_config` table with `OFF \| MONITOR \| ENFORCE`, live DB re-reading, and RFC 8785 fingerprinting. |
| **Policy JSON Rule Editor** | `src/pages/SecurityPage.tsx` | Edit policy regexes, entropy thresholds, and allowed tools. | Parses JSON and sends `PATCH /api/security/policies/:id`. | **PARTIAL** | Saves raw JSON to DB, but backend does not recompile active engine regexes dynamically. | Trigger policy engine cache invalidation and compute new canonical SHA-256 fingerprint on save. |
| **Isolation Probes (T01–T05)** | `src/pages/SecurityPage.tsx` | Execute active container isolation checks against Docker runtime. | Calls `/api/probes/run`; if Docker is offline, returns `UNVERIFIED` fail-closed status. | **WORKING** | Strict fail-closed design implemented in `server/probes/runner.mjs`. | Add Tier A probes that test host boundary without requiring Docker daemon. |
| **Raw Probe Evidence Modal** | `src/pages/SecurityPage.tsx` | Inspect stdout, stderr, exit code, and command for a probe run. | Displays raw execution artifact in modal dialog. | **WORKING** | Functional modal component. | Format evidence logs with copyable hashes. |
| **Mutation Lab Injections (M1–M5, B1)** | `src/pages/SecurityPage.tsx`, `server/mutations.mjs` | Inject controlled boundary and policy faults to test detection sensitivity. | Injections fail with "REQUIRES DOCKER LAB" because Docker is offline; no Tier A (Docker-free) mutations exist. | **BROKEN** | Mutations hardcoded to stop Docker containers; non-Docker environments have zero working mutations. | Implement Tier A (policy & gateway config mutations) and Tier B (Docker compose container faults). |
| **Remediate to Baseline Button** | `src/pages/SecurityPage.tsx` | Restore all security configurations, mounts, and network policies to certified baseline. | Invokes `/api/lab/mutate/REMEDIATE`, which resets demo data. | **PARTIAL** | Resets DB seed, but doesn't restore container states or verify state recovery transitions. | Implement 6-step mutation contract with panic restore and startup auto-remediation. |
| **Audit Ledger Verification Modal** | `src/pages/EvaluationResultsPage.tsx` | Cryptographically verify SHA-256 hash chain and RFC 8785 canonical payloads. | Calls `/api/audit/verify` and displays verified block count and root hash. | **WORKING** | Fully functional RFC 8785 hash verification in `server/db.mjs`. | Show visual block graph of ledger chain. |
| **Report Export (JSON / CSV)** | `src/pages/EvaluationResultsPage.tsx` | Download evaluation findings as structured JSON or RFC 4180 CSV file. | Uses `window.open('/api/evaluations/:id/export?format=...')` to trigger file download. | **WORKING** | Fully functional export endpoint on backend. | Add checksum headers (SHA-256) to export downloads. |
| **AI Advisor Incident Guidance** | `src/pages/EvaluationResultsPage.tsx` | Generate incident root cause and mitigation guidance. | Calls `/api/advisor/explain`. Returns LLM or fallback deterministic template advice. | **WORKING** | Validated with Zod; clearly marked as "Advisory – not a decision". | Maintain schema validation and template fallbacks. |
| **Dataset Upload Form** | `src/pages/DatasetsPage.tsx` | Upload custom CSV or JSON benchmark dataset. | Parses CSV/JSON in browser and calls `POST /api/datasets/upload`. | **WORKING** | Creates dataset and test cases in SQLite. | Add dataset deduplication and SHA-256 fingerprint generation. |
| **Dataset CSV Export** | `src/pages/DatasetsPage.tsx` | Export test cases for selected dataset as CSV. | Generates client-side blob download. | **WORKING** | Functional client download. | Standardize export headers across platform. |
| **TopBar Search (Command Palette)** | `src/components/CommandPalette.tsx` | Global search across models, policies, findings, and datasets via Ctrl+K. | Filters active lists and navigates to target pages. | **WORKING** | Functional modal and keyboard shortcut. | Add search index caching. |
| **TopBar Notifications Popover** | `src/components/TopBar.tsx` | Display unread platform alerts and security notifications. | Displays 3 hardcoded static notifications; "mark read" only updates local component state. | **FAKE** | Hardcoded mock items in `TopBar.tsx`; not connected to `security_events` table. | Wire notifications directly to live `security_events` where `blocked = 1` or `severity = 'Critical'`. |
| **Reset Workspace Fixtures** | `src/pages/ProfilePage.tsx`, `Sidebar.tsx` | Reset database fixtures back to seed. | Calls `/api/admin/reset` and refreshes UI data. | **WORKING** | Fully functional database re-seeder. | Add warning banner and confirmation step. |
| **Settings Page** | Missing | Configure system defaults, evaluation timeouts, grading thresholds, and provider keys. | No settings page exists in navigation or application routes. | **NOT IMPLEMENTED** | Route was never implemented in the new UI architecture. | Implement dedicated `/settings` page backed by SQLite `settings` table. |

---

## 2. API Routes & Endpoints

| Method | Endpoint | Description | Status | Verification Detail |
|---|---|---|---|---|
| `GET` | `/api/health` | Comprehensive system health & diagnostics. | **WORKING** | Returns Node 24, SQLite DB, signing key, workspace disk space, Ollama, and Docker statuses. |
| `GET` | `/api/dashboard/summary` | Summary metrics, 7-day trend, 8 risk scores, radar profile, ASR. | **WORKING** | Computed directly via live SQL aggregation over `eval_runs` and `eval_cases`. |
| `GET` | `/api/models` | List all registered models. | **WORKING** | Reads from `models` table. |
| `GET` | `/api/models/:id` | Fetch specific model details. | **WORKING** | Returns model row from SQLite. |
| `POST` | `/api/models` | Register a new model. | **PARTIAL** | Inserts row into `models`, but lacks preflight verification and real upload. |
| `DELETE` | `/api/models/:id` | Delete a registered model. | **WORKING** | Deletes row from `models` table. |
| `GET` | `/api/datasets` | List all available datasets. | **WORKING** | Reads from `datasets` table. |
| `GET` | `/api/datasets/:id` | Fetch dataset and its test cases. | **WORKING** | Reads dataset and joins `eval_cases`. |
| `POST` | `/api/datasets/upload` | Upload new dataset with cases. | **WORKING** | Inserts dataset and batch-inserts test cases. |
| `GET` | `/api/security/policies` | List all defensive policies. | **WORKING** | Reads from `policies` table. |
| `PATCH` | `/api/security/policies/:id` | Update policy rules or enabled state. | **PARTIAL** | Updates DB row, but lacks `MONITOR` mode and doesn't recompute canonical fingerprint. |
| `GET` | `/api/security/events` | List security audit events. | **WORKING** | Reads from `security_events` table (fixed migration schema). |
| `GET` | `/api/evaluations` | List evaluation runs. | **WORKING** | Reads from `eval_runs` table. |
| `GET` | `/api/evaluations/:id` | Fetch evaluation run with findings. | **WORKING** | Reads run and joins `eval_findings`. |
| `GET` | `/api/evaluations/:id/export` | Export evaluation as JSON or CSV. | **WORKING** | Formats and streams attachment. |
| `POST` | `/api/evaluations/launch` | Launch evaluation synchronously. | **WORKING** | Runs evaluation and returns summary. |
| `POST` | `/api/evaluations/launch-stream` | Launch evaluation with SSE progress. | **WORKING** | Streams SSE events (`progress`, `complete`). |
| `GET` | `/api/findings` | List findings with optional filters. | **WORKING** | Queries `eval_findings` with SQL filters. |
| `GET` | `/api/audit/evidence` | Fetch SHA-256 cryptographic audit chain. | **WORKING** | Reads `audit_evidence_ledger`. |
| `POST` | `/api/audit/verify` | Verify cryptographic ledger integrity. | **WORKING** | Traverses hash chain; flags tampered blocks. |
| `POST` | `/api/advisor/explain` | Generate AI advisory guidance for finding. | **WORKING** | Uses Zod schema validation; falls back to template. |
| `POST` | `/api/probes/run` | Execute container isolation probes (T01–T05). | **WORKING** | Returns probe results with fail-closed guarantee. |
| `GET` | `/api/lab/status` | Get mutation lab and Docker status. | **WORKING** | Returns Docker daemon and lab mode status. |
| `POST` | `/api/lab/mutate/:id` | Inject mutation or remediate. | **BROKEN** | Fails with "REQUIRES DOCKER LAB" when Docker is offline; no Tier A mutations. |
| `POST` | `/api/admin/reset` | Reset DB to baseline seed fixtures. | **WORKING** | Clears tables and re-populates seed data. |
| `POST` | `/api/attestation/ticket` | Issue ECDSA P-256 attestation ticket. | **WORKING** | Generates 5-minute signed token. |
| `GET` | `/api/attestation/fingerprint` | Compute RFC 8785 policy pack fingerprint. | **WORKING** | Computes SHA-256 hash of enabled policies. |
| `POST` | `/api/attestation/verify` | Verify attestation ticket signature & TTL. | **WORKING** | Verifies P-256 signature and freshness. |
| `POST` | `/v1/chat/completions` | OpenAI-compatible proxy gateway. | **WORKING** | Evaluates input/output against policies; logs events. |

---

## 3. Scripts & Tooling

| Script / Command | Purpose | Expected Behavior | Actual Behavior | Status |
|---|---|---|---|---|
| `npm run doctor` (`scripts/doctor.mjs`) | Diagnostic health check | Verify 6 core system prerequisites with colored status and fixes. | PASS for Node 24, SQLite DB, Signing Key, Workspace; OFFLINE warning for Ollama and Docker. | **WORKING** |
| `npm run verify` (`scripts/verify.mjs`) | System verification | Check DB schema, policies, models, and attestation tickets. | Verified 5 policies, 5 models, and cryptographic attestation ticket generation. | **WORKING** |
| `npm test` (`vitest`) | Unit & integration tests | Execute all 9 test suites across security, crypto, and UI. | All 9 test files passed (114 tests passing). | **WORKING** |
| `npm run build` (`tsc && vite build`) | Production build | Compile TypeScript and bundle frontend with Vite. | Clean compilation with zero TypeScript errors. | **WORKING** |
| `npm run lint` (`oxlint`) | Code linting | Fast static analysis across codebase. | Clean lint pass; 0 warnings or errors. | **WORKING** |
| `npm run test:200` (`scripts/test_200_cases.mjs`) | Benchmark 200 cases | Run 200 evaluation cases and output JSON. | Cycles through static templates; prone to refusal phrase false positives. | **PARTIAL** |

