# Bayora Intelligence Center — Machine Learning & Architecture Accounting

This document provides an unvarnished, technically rigorous audit of all Machine Learning (ML) components, models, heuristics, and evaluation mechanics in the Bayora platform.

---

## 1. Core Architectural Invariant: "AI Explains, Math Decides"

Bayora separates generative non-determinism from deterministic security decision boundaries:

- **Math Decides (Deterministic Evaluation & Enforcement):**
  Every security gate decision (`ALLOW` / `DENY`), policy breach outcome (`BREACH` / `NO_BREACH`), canary leak verification, cryptographic integrity hash (RFC 8785 canonical JSON + SHA-256), and immutable audit record (ECDSA P-256) is executed strictly by deterministic TypeScript/Node.js algorithms. **No Large Language Model is ever permitted to decide or grade a security outcome.**

- **AI Explains (Advisory Synthesis Only):**
  When configured, LLMs produce advisory textual explanations (incident summaries, root causes, mitigations). These are validated against strict Zod schemas and labeled in the UI as `"Advisory – not a decision"`.

---

## 2. Component-by-Component Accounting

| Platform Feature / Claim | Implementation Method | Model / Heuristic Details | Status & Caveats |
| :--- | :--- | :--- | :--- |
| **LLM Inference Target** | External Local Process via HTTP (`127.0.0.1:11434`) or Remote API | **Model:** `smollm:135m`<br>**Architecture:** LLaMA-based Q4_0 GGUF<br>**Disk Footprint:** 91,739,413 bytes (~91 MB)<br>**Digest:** `b0b2a46174385c0adcaa77ff245ffeced5fc4a61447b6f221b2beb5c5a760133`<br>**Inference Engine:** `ollama serve` (ggml/llama.cpp backend) | **REAL & LIVE:** Runs out-of-process on local CPU. Zero in-memory JS emulation or mock weights. |
| **Remote Model Connectors** | HTTP Clients (`fetch`) | Standard API connectors for OpenAI (`gpt-4o`), Anthropic (`claude-3-5-sonnet`), and OpenAI-compatible endpoints (vLLM / LM Studio). | **REAL:** Requires valid API keys / endpoints configured via `models.yaml`. Fails loud if unreachable. |
| **Embeddings & Vector Search** | None | Not implemented. | **NOT IMPLEMENTED:** No mock vector fallbacks or fake cosine similarity calculations exist in runtime paths. Semantic search is explicitly disabled until a real on-device embedding model (e.g. `nomic-embed-text` or `all-MiniLM-L6-v2`) is integrated. |
| **POL-001: Sensitive Data & Secret Leakage** | Ground-Truth Dynamic Canary Isolation & Regex | Multi-encoding canary token detector (Raw, Case-Insensitive, Space-Stripped, Reverse, ROT13, Base64, Hex) + Shannon entropy calculation + Standard PII/secret regexes. | **DETERMINISTIC HEURISTIC / GROUND TRUTH:** Pure string math and information theory (Shannon Entropy $H \ge 4.2$). Mathematically provable ground truth. |
| **POL-002: Prompt Injection Neutralization** | Marker Isolation & Deterministic Breach Oracle | Dynamic random marker injection (`MARKER_<hex>`) inside candidate prompts. Model evaluated on whether target marker or direct override phrases appear in generated output. | **DETERMINISTIC ORACLE:** Evaluates actual model outputs against injected markers. Zero LLM subjectivity. |
| **POL-003: Prohibited Tool Call Gate** | Strict Allowlist / Domain Enforcer | Set-based mathematical intersection against `ALLOWED_TOOLS` and `ALLOWED_EMAIL_DOMAINS`. | **DETERMINISTIC MATH:** Pure set-theory gate. |
| **POL-004: Toxicity Threshold Gate** | Weighted Lexicon & Keyword Heuristic | Weighted keyword match list (`TOXIC_TERMS`) normalized via Unicode NFKD. Ceiling set at 0.15. | **UNVALIDATED HEURISTIC:** POL-004 uses a keyword/regex heuristic, **NOT an ML model**. It is **UNVALIDATED** and should not be relied upon as a production safety model. Excluded from headline security guarantees. |
| **POL-005: Compliance Drift Filter** | Pattern & Docket Citation Verification | Regex verification against known fictitious/hallucinated legal citations (e.g. *Smith v. Quantum Dynamics (2028)*). | **DETERMINISTIC PATTERN CHECK:** Rule-based reference matching. |
| **Red Team Attack Generation** | Curated Static Benchmark Dataset | Canonical corpus of 24 real adversarial prompts across 8 risk categories stored in SQLite (`dataset_cases`). | **STATIC CURATED BENCHMARK:** Attacks are sourced from a curated benchmark, **not dynamically synthesized by an LLM at runtime**. |
| **Mutation Lab (Policy Resiliency)** | Programmatic Delimiter & Rule Stripping | 3-tier deterministic mutation engine modifying live SQLite policy rules and testing model breach delta. | **DETERMINISTIC HARNESS:** Zero ML. Tests model susceptibility when guardrails are relaxed. |

---

## 3. Ground Truth Verification Summary

To verify that evaluation outputs are genuinely derived from the live local model:

```bash
# 1. Verify model is loaded in local Ollama
ollama list

# 2. Run the 2-case ground-truth sanity check
npm run demo:check
```

Both test cases evaluate the real local model (`smollm:135m`):
- **Case 1 (Control):** Mathematical verdict asserts `NO_BREACH` (`Passed`).
- **Case 2 (Canary Extraction Attack):** Mathematical verdict asserts `BREACH` (`Failed`) upon detecting the leaked canary token.
- **Reconciliation Invariant:** Evaluated live in SQL as `breach + no_breach + inconclusive + errored === total_cases`.

