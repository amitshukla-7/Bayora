# Bayora Upgrade Plan

## 1. What Exists and Works
- **Deterministic Canonical Serialization & Hashing**: RFC 8785 canonical JSON sorting and SHA-256 Web Crypto digest computation in `src/utils/crypto.ts`.
- **Guarantee Digests & Fingerprints**: Per-guarantee digests for G1–G5 and security-relevant configuration fingerprint excluding benign metadata (`labels`).
- **Five-State Machine**: Inviolable precedence rules across `UNVERIFIED`, `VERIFIED`, `STALE`, `BREACHED`, and `RECOVERING`.
- **7-Stage Lifecycle Hash Chain**: Monotonic sequences, Genesis pointer (`0000...`), payload hashing, and `expected_plan` completeness verification catching missing events (`INCOMPLETE`).
- **Mutation Lab Controls**: Reversible mutations M1–M5 and B1 negative control.
- **Automated Test Suites**: Script-based tests (`scripts/test_engine.mjs` and `scripts/test_200_cases.mjs`).

## 2. What Is Buggy or Fake
- **Fake Probe Timing**: `executeSimulatedTest` in `src/services/simulation.ts` wrapped `durationMs` around artificial `setTimeout(resolve, 350..550)` delays, presenting artificial delays as real measured durations.
- **Results Keying**: Test results in `App.tsx` were keyed by `TestId` rather than guarantee digest, risking stale result satisfaction across drift.
- **Mock Tickets**: Tickets were unauthenticated string tags (`TKT-BAYORA-...`) without signatures, expiration, or formal `validateTicket` verification against current manifest.
- **Misleading Signatures**: Checkpoint signatures claimed `secp256k1-hsm-signer-01` but used static HMAC with a hardcoded string.
- **Purely Synthetic G4**: Session confidentiality was a boolean switch check rather than an empirical behavioral canary token probe against a model gateway.
- **Marketing Fluff**: Buzzwords ("enterprise-grade", "attestation certificate") and emojis throughout UI and README.
- **Canonical JSON Edge Case**: `canonicalJson` serialized `{ key: undefined }` to `"key":undefined` instead of omitting undefined properties.

## 3. What to Keep, Refactor, and Delete
- **Keep**: Core state machine transitions, pure crypto primitives, Tailwind layout, 7-stage event types, reversible mutation definitions, and the 200-case automated test framework.
- **Refactor**:
  - G4: Real behavioral probe with 5 paired trials testing a vulnerable shared-cache test gateway, local Ollama execution with fallback to cached runs.
  - Results Store & Planner: Key results by guarantee digest, ensuring minimality in retest planning.
  - Signing & Evidence: ECDSA P-256 Web Crypto keypair labeled "Software signing key", signed checkpoints, signed tickets with 15-minute expiry, and `bayora.evidence/1` export bundle.
  - Timing: Measure durations via `performance.now()` around real computational work only.
  - AI Analyst & Assurance Statement: Advisory structured JSON analyst with schema validation and fallback template; printable plain-language assurance statement.
  - UI: Sentence-case copy, status text labels, "Simulated environment" and "Live / Cached" tags, accessible focus rings.
- **Delete**:
  - Outdated plan/SRS files from root (archive to `docs/archive/`).
  - Standalone Threat Model tab (consolidate into Limits and Non-claims on Evidence screen).
  - Artificial delay measurements and hardcoded metrics.
