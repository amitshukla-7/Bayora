# Bayora Intelligence Center — Settings Specification Matrix

> **Specification Standard:** Server is Source of Truth (SQLite `settings` table).  
> **Validation Engine:** Strict Zod Schema Validation.  
> **Concurrency Guarantee:** Atomic SQLite transactions with optimistic concurrency rollbacks.

---

## 1. Complete Settings Reference

| Section | Key | Type | Default Value | Zod Validation Rule | UI Location & Effect |
|---|---|---|---|---|---|
| **Execution & Runner** | `timeout_seconds` | `number` (integer) | `60` | `z.number().int().min(1).max(300)` | `SettingsPage.tsx` & `server/adapters/base.mjs`<br>Defines the HTTP inference execution deadline for LLM adapters. Queries exceeding this value fail closed as `TIMEOUT`. |
| **Execution & Runner** | `concurrency` | `number` (integer) | `4` | `z.number().int().min(1).max(16)` | `SettingsPage.tsx` & `RedTeamPage.tsx`<br>Controls the size of the worker pool executing parallel evaluation cases in the Red Team engine. |
| **Execution & Runner** | `streaming_enabled` | `boolean` | `true` | `z.boolean()` | `SettingsPage.tsx` & `RedTeamPage.tsx`<br>Toggles between real-time chunked SSE streaming (`/api/evaluations/launch-stream`) and synchronous batch mode. |
| **Model & Dataset Defaults** | `active_models` | `string[]` | `['mod_llama32', 'mod_gpt4o']` | `z.array(z.string().min(1)).min(1)` | `SettingsPage.tsx` & `RedTeamPage.tsx`<br>Default target models automatically selected when an operator opens the Red Team test studio. |
| **Model & Dataset Defaults** | `default_dataset` | `string` | `'ds_standard_safety_v1'` | `z.string().min(1)` | `SettingsPage.tsx` & `DatasetsPage.tsx`<br>Default benchmark dataset pre-selected for adversarial evaluation runs and regression suites. |
| **Defensive Guardrails** | `active_policies` | `string[]` | `['POL-001', 'POL-002', 'POL-003', 'POL-004', 'POL-005']` | `z.array(z.enum(['POL-001'...'POL-005'])).min(1)` | `SettingsPage.tsx` & `SecurityPage.tsx`<br>Set of defensive policies enforced during model evaluation and gateway proxy inference. |
| **Appearance & Diagnostics** | `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | `z.enum(['light', 'dark', 'system'])` | `SettingsPage.tsx` & `TopBar.tsx`<br>Operator interface theme mode for charts, inspection panels, and tables. |
| **Appearance & Diagnostics** | `log_level` | `'error' \| 'warn' \| 'info' \| 'debug'` | `'info'` | `z.enum(['error', 'warn', 'info', 'debug'])` | `SettingsPage.tsx` & `server/index.mjs`<br>Minimum severity threshold for ingesting events into `security_events` and console tracing. |

---

## 2. API Endpoints & Request Contracts

### `GET /api/settings`
Returns all settings as a JSON object, merged with defaults:
```json
{
  "settings": {
    "timeout_seconds": 60,
    "concurrency": 4,
    "active_models": ["mod_llama32", "mod_gpt4o"],
    "active_policies": ["POL-001", "POL-002", "POL-003", "POL-004", "POL-005"],
    "theme": "system",
    "log_level": "info",
    "default_dataset": "ds_standard_safety_v1",
    "streaming_enabled": true
  }
}
```

### `GET /api/settings/:key`
Returns single setting key and parsed value:
```json
{
  "key": "timeout_seconds",
  "value": 60
}
```
*HTTP 400 returned if `:key` is not a registered setting.*

### `PUT /api/settings/:key`
Updates a single setting:
```json
// Request Body
{
  "value": 120
}

// Response (HTTP 200)
{
  "success": true,
  "key": "timeout_seconds",
  "value": 120,
  "updated_at": "2026-10-30T00:35:00.000Z"
}
```
*HTTP 400 returned if value violates validation constraints (e.g. `value: 999` or `value: "fast"`).*

### `PATCH /api/settings`
Atomically updates multiple settings within an SQLite transaction:
```json
// Request Body
{
  "concurrency": 8,
  "theme": "dark"
}

// Response (HTTP 200)
{
  "success": true,
  "settings": { ... }
}
```
*Strict validation rejects any payload containing unrecognized keys with HTTP 400.*

### `POST /api/settings/reset`
Restores defaults globally or per section:
```json
// Request Body (Optional)
{
  "section": "runner" // "runner" | "models_datasets" | "policies" | "appearance" | "all"
}
```

---

## 3. UI State Preservation & Deep Linking

To prevent state loss upon tab switching or page reload, state is bound to URL search parameters:
- `tab`: Active page identifier (`dashboard`, `models`, `security`, `redteam`, `evaluations`, `datasets`, `profile`, `settings`).
- `evalId`: Selected evaluation run ID (e.g. `eval_q3_enterprise`).
- `category`: Selected category filter for findings.

Changes to these parameters update `window.history.replaceState()`, ensuring that browser refreshes, back/forward buttons, and deep links land on the exact operator state.

