# Security Vulnerability Audit Report (Pre-Remediation)
**Target**: Bayora Intelligence Center (SentinelFlow Core)  
**Date**: October 30, 2026  
**Auditor**: Senior Application Security Engineer  
**Scope**: Full Working Tree, Git History, Dependencies, Code-Level Architecture (React 19 + TypeScript + Vite + Hono + Node 24), and Configuration.

---

## 1. Executive Summary

A comprehensive enterprise-grade application security audit was performed across the Bayora codebase ahead of automated SAST, SCA, secret scanning, and infrastructure checks. 

The application demonstrates strong foundational security primitives:
- Native Web Crypto & `node:crypto` cryptographic hashing (SHA-256).
- Strict adherence to RFC 8785 Canonical JSON serialization.
- Pure mathematical oracle grading without subjective LLM-as-a-judge dependencies.
- Zero client-side storage of sensitive credentials (`localStorage`/`sessionStorage`/cookies).
- Zero instances of `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, or `eval()`.
- 100% clean `npm audit` (0 known CVEs across all installed dependencies).

However, **13 specific security findings** were identified across secrets management, prototype handling, timing side-channels, headers/CORS, input validation, and repository hygiene. This report documents each issue with its file location, severity, CWE identifier, risk analysis, and planned remediation.

---

## 2. Findings Matrix

| Finding ID | Title | Severity | CWE ID | File Location | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Hardcoded Split API Key Fallback in Model Adapters | **Critical** | CWE-798 | `server/adapters/base.mjs:26`<br>`server/adapters/factory.mjs:107` | Pending Fix |
| **SEC-02** | Potential Prototype Pollution in Canonical JSON Serialization | **High** | CWE-1321 | `src/core/canonical.ts:18`<br>`server/canonical.mjs:18` | Pending Fix |
| **SEC-03** | Non-Constant-Time Hash & Digest Comparison | **High** | CWE-208 / CWE-385 | `src/utils/crypto.ts:313, 343`<br>`server/db.mjs:948`<br>`server/ledger.mjs:186` | Pending Fix |
| **SEC-04** | Missing `noopener,noreferrer` and Unsanitized Query in `window.open` | **Medium** | CWE-1022 / CWE-601 | `src/pages/EvaluationResultsPage.tsx:112` | Pending Fix |
| **SEC-05** | Cryptographically Insecure PRNG (`Math.random`) for Canary Token | **Medium** | CWE-338 | `scripts/record_cache.mjs:71` | Pending Fix |
| **SEC-06** | Missing HTTP Security Headers & Wildcard CORS in API Server | **Medium** | CWE-693 / CWE-16 | `server/index.mjs:103`<br>`vercel.json` | Pending Fix |
| **SEC-07** | Potential ReDoS & Regex Metacharacter Injection in Leak Detection | **Medium** | CWE-1333 | `src/core/leakDetector.ts:69`<br>`server/policies/engine.mjs:63` | Pending Fix |
| **SEC-08** | Unbounded String Lengths & Control Characters in Model Registration | **Medium** | CWE-20 | `server/models/service.mjs:18, 20` | Pending Fix |
| **SEC-09** | Repository Hygiene: Tracked Non-Source Files (Chat Export & Test Output) | **Low** | CWE-200 | `Bayora_Sentinel_Chat_Export.md`<br>`test_200_results.json` | Pending Fix |
| **SEC-10** | Floating Dependency Semver Ranges & Missing `engines` Constraint | **Low** | CWE-1104 | `package.json:23-47` | Pending Fix |
| **SEC-11** | Production Information Leakage via Console Logs & Sourcemap Defaults | **Low** | CWE-200 | `vite.config.ts:6` | Pending Fix |
| **SEC-12** | Missing `security.txt` (RFC 9116) & Vulnerability Disclosure Policy | **Info** | CWE-693 | `public/.well-known/security.txt`<br>`SECURITY.md` | Pending Fix |
| **SEC-13** | Documentation Divergence: Standalone Verifier Script Name (`verify_ledger`) | **Info** | CWE-1059 | `BAYORA_SENTINEL_SRS.md:151` | Pending Fix |

---

## 3. Detailed Finding Analysis & Planned Remediation

### Finding SEC-01: Hardcoded Split API Key Fallback in Model Adapters
- **Severity**: **Critical**
- **CWE ID**: CWE-798: Use of Hard-coded Credentials
- **Locations**:
  - `server/adapters/base.mjs:26`
  - `server/adapters/factory.mjs:107`
- **Vulnerability Description**:
  The user's Groq Cloud API key was split across string literals (`['gsk', 'kmnpj...'].join('_')`) to bypass git pre-commit scanning. Enterprise SAST and secret scanners will flag this as an intentional credential bypass.
- **Remediation Plan**:
  Remove the hardcoded literal key string completely. In both client adapters and server factory, read strictly from `process.env.GROQ_API_KEY`. If the environment variable is omitted in cloud mode, throw a descriptive, safe configuration error instructing the operator to provide `GROQ_API_KEY` via environment settings.

---

### Finding SEC-02: Potential Prototype Pollution in Canonical JSON Serialization
- **Severity**: **High**
- **CWE ID**: CWE-1321: Improperly Controlled Modification of Object Prototype Attributes ('Prototype Pollution')
- **Locations**:
  - `src/core/canonical.ts:18`
  - `server/canonical.mjs:18`
- **Vulnerability Description**:
  `canonicalJson` iterates over object keys without filtering special prototype attributes (`__proto__`, `constructor`, `prototype`). While standard `JSON.stringify` does not inherently pollute the prototype, downstream recursive merging or deserialization of untrusted canonical payloads can expose prototype modification sinks. Furthermore, lack of recursion depth limits exposes the process to call-stack exhaustion (Denial of Service).
- **Remediation Plan**:
  Filter out `__proto__`, `constructor`, and `prototype` keys during serialization. Enforce a maximum recursion depth cap (e.g. 64 levels) to prevent call-stack overflows.

---

### Finding SEC-03: Non-Constant-Time Hash & Digest Comparison
- **Severity**: **High**
- **CWE ID**: CWE-208 / CWE-385: Observable Timing Discrepancy / Covert Timing Channel
- **Locations**:
  - `src/utils/crypto.ts:313, 343`
  - `server/db.mjs:948`
  - `server/ledger.mjs:186`
  - `src/core/bundle.ts:181`
- **Vulnerability Description**:
  Cryptographic digests, hash chain links, and event payloads are evaluated using standard JavaScript string equality operators (`!==` / `===`). Standard string comparison short-circuits on the first differing character, creating microsecond timing variances that can be measured by local or low-latency adversaries to reconstruct valid cryptographic digests byte-by-byte.
- **Remediation Plan**:
  Implement a constant-time comparison helper `constantTimeEqual(a, b)` using bitwise accumulators across all character bytes in the browser, and `crypto.timingSafeEqual` in Node.js backend verification.

---

### Finding SEC-04: Missing `noopener,noreferrer` and Unsanitized Query in `window.open`
- **Severity**: **Medium**
- **CWE ID**: CWE-1022 / CWE-601: Reverse Tabnabbing / URL Redirection
- **Location**:
  - `src/pages/EvaluationResultsPage.tsx:112`
- **Vulnerability Description**:
  `window.open('/api/evaluations/${selectedEvalId}/export?format=${format}', '_blank')` launches a new browser tab without the `noopener,noreferrer` window features. In certain browsers, this allows the spawned tab to access `window.opener` and navigate the parent application window. Furthermore, `selectedEvalId` and `format` are directly interpolated without URI component encoding.
- **Remediation Plan**:
  Supply `'noopener,noreferrer'` as the third parameter to `window.open`, and sanitize parameters with `encodeURIComponent()`.

---

### Finding SEC-05: Cryptographically Insecure PRNG (`Math.random`) for Canary Token
- **Severity**: **Medium**
- **CWE ID**: CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)
- **Location**:
  - `scripts/record_cache.mjs:71`
- **Vulnerability Description**:
  `Math.random().toString(36)` is utilized to generate security canary tokens (`BYR-...`). `Math.random()` relies on xorshift128+ or similar non-cryptographic algorithms whose internal state can be mathematically deduced by analyzing prior outputs.
- **Remediation Plan**:
  Replace `Math.random()` with `crypto.randomBytes(6).toString('hex').toUpperCase()`.

---

### Finding SEC-06: Missing HTTP Security Headers & Wildcard CORS in API Server
- **Severity**: **Medium**
- **CWE ID**: CWE-693 / CWE-16: Protection Mechanism Failure / Configuration Insecurity
- **Locations**:
  - `server/index.mjs:103`
  - `vercel.json`
- **Vulnerability Description**:
  The Hono application server emits `Access-Control-Allow-Origin: *` globally without origin validation. Additionally, responses lack standard defense-in-depth headers: Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy.
- **Remediation Plan**:
  Implement global security middleware in Hono to emit strict security headers:
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.groq.com https://api.openai.com https://api.anthropic.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;`
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options`: `nosniff`
  - `X-Frame-Options`: `DENY`
  - `Referrer-Policy`: `no-referrer`
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=(), payment=(), usb=()`
  - `Cross-Origin-Opener-Policy`: `same-origin`
  - Restrict CORS origins in production.
  - Mirror configuration in `vercel.json` for edge hosting.

---

### Finding SEC-07: Potential ReDoS & Regex Metacharacter Injection in Leak Detection
- **Severity**: **Medium**
- **CWE ID**: CWE-1333: Inefficient Regular Expression Complexity (ReDoS)
- **Locations**:
  - `src/core/leakDetector.ts:69`
  - `server/policies/engine.mjs:63`
- **Vulnerability Description**:
  Dynamic regex construction `new RegExp(canaryToken, 'gi')` and policy custom pattern compilation pass unescaped user-controlled or data-driven strings directly into the JavaScript regex engine. Metacharacters such as `(`, `[`, `*`, `+` cause `SyntaxError` crashes, or catastrophic backtracking when paired with repetitive inputs.
- **Remediation Plan**:
  Sanitize and escape all regex metacharacters using `escapeRegExp(str)` before instantiating `new RegExp()`. Enforce maximum length limits on pattern strings.

---

### Finding SEC-08: Unbounded String Lengths & Control Characters in Model Registration
- **Severity**: **Medium**
- **CWE ID**: CWE-20: Improper Input Validation
- **Location**:
  - `server/models/service.mjs:18, 20`
- **Vulnerability Description**:
  `CreateModelSchema` validates that `name` and `identifier` are strings with `.min(1)`, but imposes no upper length bounds (`.max()`) and does not sanitize ASCII control characters. An attacker could register models with megabyte-length names or terminal escape sequences, degrading performance or terminal logging.
- **Remediation Plan**:
  Add `.max(100)` to `name`, `.max(200)` to `identifier`, `.max(50)` to `version`, `.max(1000)` to `description`, and strip control characters (`[\x00-\x1F\x7F]`).

---

### Finding SEC-09: Repository Hygiene — Tracked Non-Source Files
- **Severity**: **Low**
- **CWE ID**: CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
- **Locations**:
  - `Bayora_Sentinel_Chat_Export.md` (180 KB)
  - `test_200_results.json` (143 KB)
- **Vulnerability Description**:
  Developer chat exports containing architecture prompts and internal session context are tracked in the public git index. Furthermore, scratch test outputs (`test_200_results.json`) are committed to version control.
- **Remediation Plan**:
  Untrack and remove `Bayora_Sentinel_Chat_Export.md` and `test_200_results.json` from git history/tracking. Update `.gitignore` to explicitly ignore scratch results (`test_*_results.json`, `coverage`, `*.tmp`).

---

### Finding SEC-10: Floating Dependency Semver Ranges & Missing `engines` Constraint
- **Severity**: **Low**
- **CWE ID**: CWE-1104: Use of Unmaintained / Floating Third Party Components
- **Location**:
  - `package.json:23-47`
- **Vulnerability Description**:
  Dependencies utilize caret (`^`) and tilde (`~`) prefixes, enabling unvetted transitive or minor version updates during standard `npm install`. Missing explicit Node.js engine boundaries can cause unexpected runtime crashes if executed on outdated Node versions.
- **Remediation Plan**:
  Pin exact dependency versions in `package.json`. Add `"engines": { "node": ">=22.0.0" }`. Create `.github/dependabot.yml` and a pinned-SHA security CI workflow.

---

### Finding SEC-11: Production Information Leakage via Console Logs & Sourcemap Defaults
- **Severity**: **Low**
- **CWE ID**: CWE-200: Information Exposure
- **Location**:
  - `vite.config.ts:6`
- **Vulnerability Description**:
  Vite configuration does not explicitly set `build.sourcemap: false` or strip `console` / `debugger` invocations during client bundle generation. In production, client console logs can disclose application state or internal telemetry.
- **Remediation Plan**:
  Update `vite.config.ts` to configure `esbuild: { drop: ['console', 'debugger'] }` for production builds, enforce `build: { sourcemap: false }`, and set `server.fs.strict: true`.

---

### Finding SEC-12: Missing `security.txt` & Vulnerability Disclosure Policy
- **Severity**: **Info**
- **CWE ID**: CWE-693: Protection Mechanism Failure
- **Locations**:
  - `public/.well-known/security.txt` (Missing)
  - `SECURITY.md` (Missing)
- **Vulnerability Description**:
  The repository lacks a standard RFC 9116 `security.txt` file and `SECURITY.md` guidelines for responsible disclosure, reporting channels, and security advisory contacts.
- **Remediation Plan**:
  Add `public/.well-known/security.txt` and repository-level `SECURITY.md`.

---

### Finding SEC-13: Documentation Divergence: Standalone Verifier Script Name
- **Severity**: **Info**
- **CWE ID**: CWE-1059: Incomplete Documentation
- **Location**:
  - `BAYORA_SENTINEL_SRS.md:151, 603, 1280`
- **Vulnerability Description**:
  The formal SRS document references `scripts/verify_ledger.mjs`, while the implementation script on disk is named `scripts/verify.mjs`. External auditors attempting to execute commands documented in the SRS would encounter `MODULE_NOT_FOUND`.
- **Remediation Plan**:
  Create a lightweight wrapper script `scripts/verify_ledger.mjs` forwarding to `scripts/verify.mjs`, and harmonize documentation.

---

## 4. Verification & Invariant Baseline

Before applying any remediation, the following golden invariants were computed on the certified baseline:
- **`GENESIS_HASH`**: `0000000000000000000000000000000000000000000000000000000000000000`
- **`BASELINE_FINGERPRINT`**: `49599cacb85c0775eec04a5a8e9df899998a848006a53fa4d71be9d554f6453b`
- **`GUARANTEE_DIGESTS`**:
  - G1: `36bc16e80d55eb2531275e82b13555c4467e235944e7176b1dc43c9d507ae27d`
  - G2: `f74c30a3c1a2024f69ec1a2014d4ba2ba553fc3135ca3d2b2229cb08669cae67`
  - G3: `eff4de313d407ce043152fe4e47b90c07a40fd69e060faef88306b653c2df7ca`
  - G4: `eff4de313d407ce043152fe4e47b90c07a40fd69e060faef88306b653c2df7ca`
  - G5: `50c21e4b63b9f03012dbcb986ce87c1e23ad5d031e1002ae078c53aa7763c047`
- **Evidence Verification**: `examples/valid.bundle.json` -> `STATUS: VALID (15 blocks verified)`.
- **Full Vitest Suite**: 260 tests passed across 16 test files.

Every remediation will be executed sequentially with small, reviewable commits (`security: <what> (<finding class>)`), and re-verified against these exact golden invariants.
