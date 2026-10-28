# Architecture Decisions Log

## DEC-001: Pure Core Architecture & Test Framework
- **Decision**: Adopt Vitest for modular in-source and test-suite unit testing of pure core modules (`src/core/`), while preserving `scripts/test_engine.mjs` and `scripts/test_200_cases.mjs`.
- **Rationale**: Meets the requirement to test pure core canonicalization, truth tables, planner minimality, ticket validation, and leak detection deterministically without browser overhead.

## DEC-002: Duration Measurement vs UI Sequencing
- **Decision**: All reported test and probe `durationMs` values are measured strictly via `performance.now()` around actual computation (hashing, canonicalization, network calls). UI animation or pacing is strictly separate and never reflected in `durationMs`.
- **Rationale**: Adheres to the rule: "Never display a fake number. Durations shown in the UI must come from performance.now() around real work."

## DEC-003: Results Keying by Guarantee Digest
- **Decision**: Results are indexed by `GuaranteeDigest` (e.g. `resultsByDigest: Record<string, TestExecutionResult>`). A guarantee is only satisfied if `resultsByDigest[currentDigests[gid]]?.status === 'PASS'`.
- **Rationale**: Guarantees that old results for an earlier configuration digest can never satisfy a mutated or drifted guarantee.

## DEC-004: Ticket Signing via ECDSA P-256
- **Decision**: Generate an ECDSA P-256 keypair via Web Crypto (`subtle.generateKey`), persist public/private keys in localStorage (per workspace), and label the key explicitly as "Software signing key". Checkpoints and tickets are signed with this key.
- **Rationale**: Removes fake HSM claims and static shared HMAC keys while maintaining offline verifiability.
