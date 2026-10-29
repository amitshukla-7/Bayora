# Bayora Intelligence Center — AI Model Security & Governance

> **Monitor, evaluate and secure your AI models — continuous red teaming, safety evidence and compliance in one calm surface.**

Bayora Intelligence Center is an enterprise AI model security testing, evaluation, and governance platform. It helps developers and security teams assess the safety, reliability, robustness, and compliance of AI models through configurable automated red teaming, deterministic guardrails, and cryptographic audit evidence.

---

## 1. Product Vision & Architecture

The platform provides end-to-end AI security capabilities:

1. **Dashboard Analytics**: Executive visibility into testing trends, pass/fail reconciliations, security overview across 8 risk surfaces, 6-axis benchmark profile radar, and attack success distributions.
2. **Model Registry**: Management of models (GPT-4o, Llama 3.2 3B, Mistral 7B, DistilGPT2) with explicit execution mode tracking (`Simulation`, `Mock API`, `Live`).
3. **Red Team Evaluation Engine**: Interactive configuration with 7 preset scenarios, target model selector chips, 9 attack surface toggles, execution parameter bounds, and live execution progress.
4. **Security Governance & Guardrails**: Active defensive policies (POL-001 through POL-005) directly linked to the evaluation engine, plus a live security monitoring log.
5. **Datasets Management**: Built-in *Bayora Core Adversarial Benchmark v1.2* (24 test cases), CSV/JSON upload with validation, preview inspection, and export options.
6. **Findings & Reports**: Granular inspection of adversarial prompts, observed outputs, root cause analysis, and downloadable JSON/CSV reports.
7. **Audit Evidence & Integrity**: SHA-256 hash-chained cryptographic ledger with real-time mathematical tamper verification.
8. **AI Security Assistant**: Context-aware assistant grounded in stored evaluation records and security policies.
9. **Profile & Workspace**: Identity management, workspace storage meters (`1.2 GB / 5.0 GB · Demo`), and a "Coming Soon" Pricing tiers showcase.

---

## 2. Visual Design System

Built to mirror the soft lavender, pale-grey, and frosted enterprise design language:
- **Background**: Soft blue-grey gradient (`#f8faff` to `#f6f3fe`)
- **Primary Accent**: Lavender/Purple (`#9B7DE8` / `#8762e0`)
- **Typography**: Dark navy primary text (`#101827`), muted slate secondary text (`#64748b`)
- **Cards**: Large rounded surfaces (`rounded-[28px]` / `rounded-[32px]`) with frosted glass backdrop blur and subtle diffuse shadows
- **Indicators**: Green (`#10b981`), amber (`#f59e0b`), coral/red (`#ef4444`)

---

## 3. Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 with custom design tokens
- **Charts**: Recharts (AreaChart, PieChart donut, RadarChart, BarChart)
- **Icons**: Lucide Icons
- **HTTP Client**: Native Fetch API

### Backend & Storage
- **Server**: Node.js 24 with Hono REST API framework
- **Database**: SQLite (`node:sqlite` `DatabaseSync`) stored in `workspace/bayora.db`
- **Crypto**: Native Node.js `crypto` (SHA-256 hash-chaining)
- **Testing**: Vitest automated test suite

---

## 4. Quick Start & Startup Instructions

### Prerequisites
- Node.js 22+ (tested on Node.js 24)
- npm 10+

### Installation & Execution

#### On Windows (PowerShell):
```powershell
# 1. Install dependencies
npm install

# 2. Run backend and frontend concurrently
npm run dev

# Alternatively, in two separate terminal tabs:
# Tab 1 (Backend on http://localhost:3001):
npm run server

# Tab 2 (Frontend on http://localhost:5173):
npx vite --port 5173
```

#### On macOS / Linux:
```bash
# 1. Install dependencies
npm install

# 2. Start services
npm run dev
```

Open your browser to: **`http://localhost:5173`**

---

## 5. Automated Tests

Run the complete Vitest test suite validating database models, policy enforcement, evaluation runs, and SHA-256 evidence integrity:

```bash
npx vitest run tests/bayora.test.ts
```

All 9 tests pass with 100% test coverage over core features:
- Dashboard metric reconciliation (2,286 runs: 1,842 pass, 316 warn, 128 fail)
- Model adapter lifecycle
- Custom dataset upload and parsing
- Dynamic policy enforcement (POL-001 secret suppression)
- Red Team evaluation engine execution
- SHA-256 cryptographic chain verification

---

## 6. API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Platform health status and version |
| `/api/dashboard/summary` | `GET` | Reconciled metrics, trends, and risk distributions |
| `/api/models` | `GET`, `POST` | Model registry management |
| `/api/models/:id` | `DELETE` | Remove registered model |
| `/api/datasets` | `GET` | List available adversarial datasets |
| `/api/datasets/upload` | `POST` | Upload CSV/JSON dataset with validation |
| `/api/security/policies` | `GET` | Active defensive guardrail policies |
| `/api/security/policies/:id` | `PATCH` | Update policy rules or toggle enabled state |
| `/api/security/events` | `GET` | Live security enforcement events stream |
| `/api/evaluations` | `GET` | List all Red Team evaluations |
| `/api/evaluations/launch` | `POST` | Launch evaluation against models |
| `/api/evaluations/:id/export` | `GET` | Download evaluation report (JSON or CSV) |
| `/api/audit/verify` | `POST` | Verify SHA-256 hash-chained audit ledger |
| `/api/assistant/query` | `POST` | Query grounded AI security assistant |
| `/api/admin/reset` | `POST` | Reset workspace to initial seed data |

---

## 7. Transparent Limitations & Disclosures

1. **Simulation Adapters**: In this local prototype, models are evaluated using deterministic simulation adapters clearly labelled as `Simulation`. They run 100% offline without requiring paid external API keys.
2. **Billing Preview**: The Pricing page displays an informational preview marked "Coming Soon". Billing and payment card collection are disabled in this prototype.
3. **Audit Ledger**: The SHA-256 hash chain provides mathematical tamper detection across stored logs. While it detects modifications made to existing records, it does not prevent an administrator with direct filesystem access from recreating the database file.
