# Bayora Intelligence Center — Simulation & Mock Purge Audit

This document certifies the systematic eradication of runtime simulations, mock fallbacks, synthetic numbers, and fake latencies across the Bayora codebase in accordance with the **"Real Only"** and **"AI Explains, Math Decides"** directives.

---

## 1. Summary of Removed Simulations & Synthetic Mechanics

| Category | File & Location | Prior (Simulated / Fake) Code | Purged & Replaced With (Real Deterministic Engineering) |
| :--- | :--- | :--- | :--- |
| **Fake Latency** | `server/mutations.mjs:197` | `latencyMs: Math.round(Math.random() * 5 + 2)` | `const tStart = performance.now();`<br>`latencyMs: Math.max(1, Math.round(performance.now() - tStart))` (Real monotonic timer) |
| **Silent Mock Adapter** | `server/models/service.mjs:301-306` | Catch block generated synthetic fallback adapter: `{ generate: () => ({ text: "Echo token: " + nonce }) }` | Removed fallback. Uses real `createModelAdapter(model)`; on failure, fails closed with `FAILED_VERIFICATION`. |
| **Adapter Error Masquerading** | `server/eval/runner.mjs:578-589` | Adapter network/timeout errors were fabricated into model test failures: `verdict: 'Failed', failedCount++` | Fail loud: `verdict: 'ERRORED', erroredCount++`. Errors are never counted as model breach/pass or graded as text. |
| **Subjective Refusal Text Matching** | `server/policies/engine.mjs:172-179`<br>`server/grading/oracles.mjs` | Grader checked if model output matched canned refusal phrases or input prompt regexes. | Ground-truth dynamic canaries (`CANARY_<hex>`) and target markers (`MARKER_<hex>`). Verdict is determined solely by output tokens. |
| **Default UI Simulation Mode** | `src/pages/ModelsPage.tsx:56, 720-730` | Model registration defaulted to `Simulation` mode and offered `Mock API`. | Defaulted to `Live Provider (Real Execution)`. `Mock API` removed. Simulation doubles strictly confined to unit test doubles. |
| **Simulated Playground Label** | `src/pages/SecurityPage.tsx:1073` | UI label read `"Simulated Model Output (Gateway Outbound)"`. | Updated to `"Candidate Model Output (Gateway Outbound)"`. POL-004 explicitly labeled `"(Heuristic, UNVALIDATED)"`. |
| **Hardcoded Baseline Ribbon** | `server/db.mjs:169-188` | (Old demo baseline `2,286 / 1,842 / 316 / 128` previously removed) | Live 4-way SQLite query: `COUNT(*) FILTER (...)` for passed, warning, failed, errored. Ribbon is verified live in SQL. |
| **Fake Vector Embeddings** | Runtime paths | Mock cosine similarity over random vectors. | Purged. Documented as `NOT IMPLEMENTED` in `docs/ML_COMPONENTS.md` until real on-device embedding model is wired. |

---

## 2. Invariant Verification Commands

Run these terminal checks to prove the absolute absence of runtime simulations:

```bash
# 1. Assert ZERO Math.random() in runtime code (src/ and server/)
git grep -n "Math.random" src/ server/
# Result: 0 matches (exit code 1)

# 2. Run the live model 2-case ground-truth sanity suite against local Ollama (smollm:135m)
npm run demo:check
# Result: Both control (Passed) and canary breach (Failed) pass assertions with real model telemetry.

# 3. Verify SQLite 4-way reconciliation invariant
node -e "import('./server/db.mjs').then(({getDashboardSummary}) => console.log(getDashboardSummary()))"
# Result: ribbonValid === true, all metrics aggregated purely from SQLite rows.
```

