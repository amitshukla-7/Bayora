# Software Requirements Specification (SRS)
## Project: Bayora Sentinel — Continuous Security Assurance for AI Evaluation Infrastructure
**Document Version:** 1.0.0  
**Status:** Approved / Engineering Baseline  
**Classification:** Technical Specification & System Requirements  
**Standard:** IEEE 830-1998 / ISO/IEC/IEEE 29148:2018 Compliant  
**Date:** October 2026  
**Repository:** [https://github.com/amitshukla-7/Bayora](https://github.com/amitshukla-7/Bayora)  

---

## Table of Contents
1. [Introduction](#1-introduction)
   - 1.1 Purpose
   - 1.2 Document Scope
   - 1.3 Definitions, Acronyms, and Abbreviations
   - 1.4 References and Applicable Standards
   - 1.5 Document Overview & Governance
2. [Product Overview](#2-product-overview)
   - 2.1 Product Perspective & Context
   - 2.2 Problem Statement & Core Value Proposition
   - 2.3 System Architecture & Logical Topology
   - 2.4 Product Functions Summary
   - 2.5 Operating Environment & Technology Stack
   - 2.6 User Characteristics & Operational Profiles
3. [Users & Stakeholders](#3-users--stakeholders)
   - 3.1 Primary User Personas
   - 3.2 User Needs & Pain Points Matrix
   - 3.3 Authorization & Access Privilege Matrix
4. [Inputs](#4-inputs)
   - 4.1 System & Runtime Manifest Inputs
   - 4.2 Operator & Automated Diagnostic Inputs
   - 4.3 Simulation & Benchmark Inputs
5. [Outputs](#5-outputs)
   - 5.1 Cryptographic Fingerprints & Digest Maps
   - 5.2 Deterministic Assurance Posture & Decoupled Status Schema
   - 5.3 Zero Trust Attestation Certificates & Denial Packages
   - 5.4 Cryptographic Audit Ledger & Verification Reports
   - 5.5 Empirical Benchmark & Telemetry Metrics
6. [Workflow & Operational Lifecycle](#6-workflow--operational-lifecycle)
   - 6.1 End-to-End Operational Lifecycle
   - 6.2 Precedence Rules Enforcement Lifecycle
   - 6.3 5-Minute Evaluation Script Execution Flow
7. [Functional Requirements](#7-functional-requirements)
   - 7.1 FR-1: Environment Ingestion & RFC 8785 Normalization Engine
   - 7.2 FR-2: Per-Guarantee Digest & Dependency Mapping Engine
   - 7.3 FR-3: Automated Isolation Diagnostic Probes ($T_{01}$–$T_{05}$)
   - 7.4 FR-4: State Machine & Inviolable Precedence Rule Enforcement
   - 7.5 FR-5: Selective Retesting Optimization Engine
   - 7.6 FR-6: 7-Stage Cryptographic Evidence Protocol & Hash Chaining
   - 7.7 FR-7: Anti-Tamper & Anti-Omission Verification Engine
   - 7.8 FR-8: Fail-Closed Zero Trust Evaluation Gate Arbiter
   - 7.9 FR-9: Controlled Mutation Lab & Benchmark Framework ($M_1$–$M_5$, $B_1$)
   - 7.10 FR-10: Operator Interactive Workbench & Dual Theme UI
8. [AI Responsibilities](#8-ai-responsibilities)
   - 8.1 Automated Boundary Diagnostic Probing
   - 8.2 Real-Time Drift Analysis & Differential Invalidation
   - 8.3 Deterministic Hash Chain Construction & Checkpoint Signing
   - 8.4 Anti-Omission Plan Contract Verification
   - 8.5 Automated Selective Test Plan Synthesis
   - 8.6 Telemetry & Performance Metric Synthesis
   - 8.7 Autonomous Fail-Closed Enforcement
9. [Human Responsibilities](#9-human-responsibilities)
   - 9.1 Baseline Policy & Invariant Definition
   - 9.2 Infrastructure Parameter Provisioning & Remediation
   - 9.3 Attestation Review & Safety Certification
   - 9.4 Adversarial Red-Team Campaign Governance
   - 9.5 Key Management & Hardware Security Module Governance
   - 9.6 Incident Response & Quarantine Execution
10. [Constraints](#10-constraints)
    - 10.1 Technical & Cryptographic Constraints
    - 10.2 Architectural & Runtime Constraints
    - 10.3 Regulatory & Compliance Constraints
    - 10.4 Performance & Latency Constraints
    - 10.5 Security Boundary Constraints
11. [Failure Handling & Resilience](#11-failure-handling--resilience)
    - 11.1 Perimeter Breach Handling
    - 11.2 Configuration Drift Handling
    - 11.3 Ledger Tampering Detection & Handling
    - 11.4 Event Omission Detection & Handling
    - 11.5 Network & Storage Subnet Isolation Failure Handling
    - 11.6 Remediation & Recovery Protocol
12. [Acceptance Criteria & Verification Matrix](#12-acceptance-criteria--verification-matrix)
    - 12.1 Functional Acceptance Criteria
    - 12.2 Security Acceptance Criteria
    - 12.3 Performance Acceptance Criteria
    - 12.4 Verification Methods & Test Strategy Matrix
13. [Version 1 Exclusions & Future Roadmap](#13-version-1-exclusions--future-roadmap)
    - 13.1 Explicit Out-of-Scope Items for Version 1.0
    - 13.2 Version 2.0 Architectural Roadmap

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) establishes the formal functional, architectural, cryptographic, and operational requirements for **Bayora Sentinel** (Version 1.0.0). Bayora Sentinel is an automated, continuous security assurance and zero-trust verification platform engineered specifically for **Adversarial AI Safety Testing Environments**, where untrusted red-team harnesses execute high-risk jailbreak payloads against model endpoints alongside sensitive blue-team benchmark datasets and proprietary evaluation rubrics.

This document serves as the contractual and engineering baseline for software engineers, security architects, compliance auditors, and AI safety evaluation operators.

### 1.2 Document Scope
This SRS specifies the complete system envelope of Bayora Sentinel, including:
- Ingestion and normalization of container runtime parameters, storage access policies, network namespaces, model gateway contexts, and container security profiles.
- RFC 8785 Canonical JSON serialization and deterministic SHA-256 fingerprinting.
- The five formal isolation guarantees ($G_1$–$G_5$) and their associated automated diagnostic probes ($T_{01}$–$T_{05}$).
- The five-state deterministic assurance state machine (`UNVERIFIED`, `VERIFIED`, `STALE`, `BREACHED`, `RECOVERING`) governed by inviolable precedence rules.
- The selective retesting optimization engine mapping drifted configuration parameters to target tests.
- The 7-stage cryptographic evidence protocol generating an append-only, tamper-evident SHA-256 hash chain with HMAC-SHA256 checkpoint signatures.
- Dual-property audit verification detecting both block tampering and event omission against the declared `expected_plan`.
- The fail-closed zero-trust evaluation gate arbiter issuing verifiable attestation certificates or diagnostic denial packages.
- The controlled mutation laboratory ($M_1$–$M_5$) and benign negative control baseline ($B_1$).
- The dual-theme high-contrast operator workbench interface (Cyber-Defense Dark & Enterprise Light modes).

### 1.3 Definitions, Acronyms, and Abbreviations

| Term / Acronym | Definition |
| :--- | :--- |
| **Assurance State** | The real-time trust posture of an evaluation sandbox (`UNVERIFIED`, `VERIFIED`, `STALE`, `BREACHED`, `RECOVERING`). |
| **Blue Team** | The defensive evaluation control plane managing reference benchmarks, evaluation rubrics, scoring models, and private datasets. |
| **Canary Token** | A high-entropy synthetic string (e.g., 128-bit hex) injected to detect cross-tenant inference context or KV-cache bleed. |
| **Fail-Closed** | A security invariant dictating that in any state other than cryptographically attested `VERIFIED`, access is denied by default. |
| **Genesis Hash** | A 64-character hexadecimal string of zeroes (`000...000`) anchoring the root of the cryptographic evidence chain. |
| **HMAC-SHA256** | Hash-based Message Authentication Code utilizing SHA-256, modeling HSM-backed checkpoint attestation. |
| **KV-Cache** | Key-Value attention cache in large language model inference engines; a primary attack vector for multi-tenant context bleed. |
| **Negative Control ($B_1$)** | A benign modification (e.g., UI metadata, container labels) that must leave the security fingerprint unchanged ($FPR = 0.0\%$). |
| **Red Team** | Adversarial safety evaluators executing untrusted jailbreak payloads, prompt injection, and exploit scripts against model targets. |
| **RFC 8785** | JSON Canonicalization Scheme (JCS) standardizing whitespace stripping, key sorting, and deterministic serialization. |
| **Selective Retesting ($R$)** | Dependency-mapped test optimization executing only the probes invalidated by configuration drift, saving $\ge 70\%$ test latency. |
| **Zero Trust Gate** | An enforcement arbiter that gates execution of evaluation workloads based on real-time cryptographic attestation. |

### 1.4 References and Applicable Standards
1. **RFC 8785**: *JSON Canonicalization Scheme (JCS)*, Internet Engineering Task Force (IETF), 2020.
2. **NIST AI 100-1**: *Artificial Intelligence Risk Management Framework (AI RMF 1.0)*, National Institute of Standards and Technology, 2023.
3. **ISO/IEC 27001:2022**: *Information Security Management Systems — Requirements*.
4. **OWASP Top 10 for LLM Applications**: *LLM02: Sensitive Information Disclosure* & *LLM06: Excessive Agency*, 2025/2026.
5. **FIPS 180-4**: *Secure Hash Standard (SHS) — SHA-256 Specification*.
6. **RFC 2104**: *HMAC: Keyed-Hashing for Message Authentication*.

### 1.5 Document Overview & Governance
This specification is structured hierarchically. Sections 2 through 6 provide architectural and contextual overviews, inputs, outputs, and workflows. Section 7 articulates atomic, verifiable functional requirements. Sections 8 through 13 detail operational bounds, AI vs. human division of responsibility, constraints, failure handling, acceptance criteria, and future evolution.

Changes to this specification require review and cryptographic sign-off by the Bayora Security Architecture Review Board (SARB).

---

## 2. Product Overview

### 2.1 Product Perspective & Context
AI safety testing mandates aggressive, adversarial probing of frontier models. Red teams deliberately construct prompt injection attacks, multi-turn jailbreaks, and tool-use subversion routines. Simultaneously, the evaluation platform relies on proprietary blue-team assets: ground-truth scoring rubrics, private pre-release models, and benchmark evaluation sets.

Traditional deployment audits take a point-in-time snapshot. In dynamic containerized evaluation environments, container bind mounts, IAM roles, network interfaces, and model gateway routing can mutate silently without triggering infrastructure alerts. Bayora Sentinel acts as an active, continuous assurance overlay. It sits between the infrastructure provisioning layer and the adversarial execution harness, establishing an unbreakable cryptographic verification loop.

```
+-------------------------------------------------------------------------------+
|                       AI EVALUATION INFRASTRUCTURE                            |
|                                                                               |
|  +--------------------+                    +-------------------------------+  |
|  | BLUE EVALUATION    |                    | RED TEST WORKLOAD             |  |
|  | CONTROL PLANE      |                    | (Untrusted Jailbreak Payloads)|  |
|  | - Scoring Rubrics  |                    | - Prompt Injections           |  |
|  | - Gold Benchmarks  |                    | - Adversarial Attack Scripts  |  |
|  +---------+----------+                    +---------------+---------------+  |
|            |                                               |                  |
|            | (Confidentiality Perimeter)                   |                  |
|            +-----------------------+-----------------------+                  |
|                                    |                                          |
|                                    v                                          |
|             +---------------------------------------------+                   |
|             |            BAYORA SENTINEL LAYER            |                   |
|             |  1. Canonical Fingerprint & Invalidation    |                   |
|             |  2. Automated Diagnostic Probes (T01-T05)   |                   |
|             |  3. Append-Only Hash Chain Ledger           |                   |
|             |  4. Fail-Closed Zero Trust Policy Gate      |                   |
|             +----------------------+----------------------+                   |
|                                    |                                          |
+------------------------------------|------------------------------------------+
                                     v
                 +---------------------------------------+
                 |       MODEL INFERENCE GATEWAY         |
                 | (Shared Context / KV-Cache Partition) |
                 +---------------------------------------+
```

### 2.2 Problem Statement & Core Value Proposition
- **The Problem:** Modern AI evaluation sandboxes suffer from silent boundary degradation. A single accidental volume mount, subnet route, or IAM permission relaxation allows an adversarial payload to exfiltrate proprietary evaluation data or contaminate multi-tenant model memory.
- **The Solution:** Bayora Sentinel transforms passive compliance into active cryptographic gating. It guarantees that untrusted workloads run **only** when the sandbox's declared isolation guarantees are backed by current, untampered, and complete proof.

### 2.3 System Architecture & Logical Topology
Bayora Sentinel comprises seven modular subsystems:
1. **Manifest Normalizer & Fingerprinting Core:** Ingests raw configurations, filters non-security metadata, applies RFC 8785 canonical serialization, and produces deterministic SHA-256 fingerprints.
2. **Per-Guarantee Digest Engine:** Computes independent hashes for five distinct isolation sub-manifests ($G_1$ to $G_5$).
3. **Change-Aware Invalidation Engine:** Detects configuration drift in real-time, invalidating only the affected guarantee digests and flagging them as `STALE`.
4. **Diagnostic Probing Engine:** Houses non-destructive synthetic probes ($T_{01}$–$T_{05}$) mapped directly to each guarantee.
5. **Decoupled Assurance State Machine:** Manages posture transitions across five distinct states, decoupled into four orthogonal status dimensions.
6. **Dual-Property Cryptographic Ledger:** Generates an immutable, sequence-ordered SHA-256 hash chain with HMAC-signed checkpoints.
7. **Fail-Closed Policy Arbiter:** Issues cryptographically verifiable tickets (`TKT-BAYORA-...`) or actionable denial packages.

### 2.4 Product Functions Summary

| ID | Function Name | Scope / Description | Target Guarantee |
| :--- | :--- | :--- | :--- |
| **F-01** | RFC 8785 Normalization | Deterministic key sorting and whitespace stripping | All Manifests |
| **F-02** | Baseline Fingerprinting | 256-bit environment digest calculation | Environment State |
| **F-03** | Storage Isolation Probe ($T_{01}$) | Confines adversary runners to `/opt/red/workspace`; blocks Blue mounts | $G_1$ (Storage Isolation) |
| **F-04** | Network Microsegmentation Probe ($T_{02}$) | Ensures Red containers cannot bridge to private management subnets | $G_2$ (Network Isolation) |
| **F-05** | Storage API Authorization Probe ($T_{03}$) | Validates signed bearer tokens; rejects unauthenticated access | $G_3$ (API Authorization) |
| **F-06** | Model Gateway Bleed Probe ($T_{04}$) | Injects 128-bit canaries; guarantees 0 ppm cross-tenant context bleed | $G_4$ (Inference Confidentiality) |
| **F-07** | Workload Hardening Probe ($T_{05}$) | Enforces `readOnlyRootFilesystem`, dropped Linux caps, seccomp | $G_5$ (Workload Hardening) |
| **F-08** | Selective Retest Engine | Executes only invalidated probes upon drift, cutting latency by 72% | $G_1$–$G_5$ |
| **F-09** | 7-Stage Hash Chain Logger | Cryptographically links all lifecycle events to `GENESIS_HASH` | Audit Ledger |
| **F-10** | Dual-Property Proof Verifier | Evaluates pointer integrity (tamper) and plan completeness (omission) | Ledger Integrity |
| **F-11** | Fail-Closed Policy Gate | Enforces default-deny; emits cryptographic attestation tickets | Workload Execution |
| **F-12** | Controlled Mutation Benchmarks | Evaluates system against five deliberate security mutations ($M_1$–$M_5$) | Engine Self-Validation |

### 2.5 Operating Environment & Technology Stack
- **Core Runtime:** TypeScript 5.8+ executing natively under Node.js v24 LTS and modern web browsers (Chromium 120+, Firefox 125+, Safari 18+).
- **Frontend Presentation:** React 19, Vite 8, Tailwind CSS v4.
- **Cryptographic Primitives:** Native Web Crypto API (`crypto.subtle`) for SHA-256 digest computation and HMAC-SHA256 signature verification. No external daemon or native C++ crypto dependencies.
- **Operating System Compatibility:** Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL 9), macOS (Sonoma / Sequoia), Windows 11 / Server 2025.

### 2.6 User Characteristics & Operational Profiles
Operators of Bayora Sentinel are expected to possess intermediate to advanced familiarity with containerized environments (OCI/Docker/Kubernetes), network security concepts (VLANs, CIDRs, microsegmentation), and cryptographic hash concepts. The platform provides both a rich graphical workbench for visual oversight and a deterministic CLI tool for automated CI/CD and deployment gating.

---

## 3. Users & Stakeholders

### 3.1 Primary User Personas

#### Persona 1: AI Security & Red-Team Engineers
- **Role:** Executes adversarial jailbreaking, model extraction, and red-team evaluation campaigns.
- **Objective:** Run dangerous attack payloads at scale without risking lateral compromise of proprietary blue-team benchmark models or datasets.
- **Primary Interaction:** Interacts with the Fail-Closed Policy Gate to receive evaluation execution tickets; triggers targeted retesting after infrastructure updates.

#### Persona 2: Blue-Team Infrastructure & MLOps Platform Engineers
- **Role:** Deploys and manages Kubernetes clusters, container runtimes, model proxies, and evaluation pipelines.
- **Objective:** Prevent configuration drift and eliminate silent isolation regressions before untrusted jobs execute.
- **Primary Interaction:** Utilizes the Drift & Mutation Lab to test topology updates; reviews the Guarantees Matrix ($G_1$–$G_5$) to resolve drifted infrastructure.

#### Persona 3: AI Safety Regulators & Compliance Officers
- **Role:** Independent overseers, compliance certifiers, and regulatory auditors.
- **Objective:** Verify that an evaluation environment maintained rigorous isolation during safety benchmarks without trusting operator claims.
- **Primary Interaction:** Exports and cryptographically validates the append-only SHA-256 evidence ledger using the standalone CLI verifier (`verify_ledger.mjs`).

#### Persona 4: Enterprise Tenants & Model Consumers
- **Role:** Organizations submitting proprietary models or evaluation rubrics to a shared evaluation facility.
- **Objective:** Absolute guarantee against inference context leakage, rubric theft, or canary token bleed.
- **Primary Interaction:** Inspects real-time Decoupled Assurance Snapshots and verifies Gateway Session Confidentiality ($G_4$).

### 3.2 User Needs & Pain Points Matrix

| Stakeholder Persona | Core Pain Point | Bayora Sentinel Solution |
| :--- | :--- | :--- |
| **AI Red-Teamer** | Blocked by slow, manual sandbox verification between test batches. | Automated selective retesting completes in under 500 ms ($R \ge 70\%$). |
| **MLOps Engineer** | Silent configuration drift breaks tenant isolation without alerting. | Continuous canonical fingerprinting detects drift in $\le 8\text{ ms}$ and revokes tickets. |
| **Safety Regulator** | Post-hoc audit logs are vulnerable to tampering and event deletion. | Dual-property ledger detects both payload manipulation and missing events. |
| **Enterprise Tenant** | Shared LLM inference proxies can bleed KV-cache across sessions. | Automated canary probe ($T_{04}$) enforces 0 ppm cross-session context bleed. |

### 3.3 Authorization & Access Privilege Matrix

| Function / Action | Red-Team Engineer | MLOps Engineer | Compliance Auditor | System Administrator |
| :--- | :---: | :---: | :---: | :---: |
| Request Evaluation Access Ticket | **Execute** | **Execute** | **View** | **Execute** |
| Run Full Diagnostic Suite ($T_{01}$–$T_{05}$) | **Execute** | **Execute** | **View** | **Execute** |
| Trigger Selective Retest | **Execute** | **Execute** | **View** | **Execute** |
| Apply Mutation Scenarios ($M_1$–$M_5$) | **Execute (Lab)** | **Execute (Lab)** | **View** | **Execute** |
| Export Audit Hash Chain Ledger | **Read** | **Read** | **Read / Verify** | **Read / Verify** |
| Alter Isolation Baseline Policies | **Deny** | **Propose** | **Review** | **Authorize** |

---

## 4. Inputs

### 4.1 System & Runtime Manifest Inputs
The system ingests raw environment specifications formatted as structured JSON manifests. To prevent nondeterministic hashing, inputs are categorized into security-relevant fields and filtered metadata:

```json
{
  "container": {
    "redRunnerId": "runner-red-c14-eval",
    "blueEvaluationId": "runner-blue-control-01",
    "bindMounts": [
      {
        "hostPath": "/data/tenants/red/workspace",
        "containerPath": "/opt/red/workspace",
        "readonly": false
      }
    ],
    "capabilitiesDropped": ["ALL"],
    "capabilitiesAdded": [],
    "readOnlyRootFilesystem": true,
    "privileged": false,
    "seccompProfile": "runtime/default"
  },
  "network": {
    "networkNamespace": "netns-red-sandbox-01",
    "egressAllowedCIDRs": ["10.244.0.0/16"],
    "crossTenantBridging": false,
    "allowHostNetwork": false,
    "dnsIsolated": true
  },
  "storageAuth": {
    "bucketName": "ai-eval-artifacts-us-east-1",
    "requiredScope": "read:red-artifacts",
    "assignedRole": "arn:aws:iam::123456789012:role/RedSandboxRunnerRole",
    "allowAnonymousAccess": false,
    "tokenTtlSeconds": 900
  },
  "modelGateway": {
    "gatewayEndpoint": "https://gateway.internal.eval/v1",
    "sessionIsolation": true,
    "cacheShared": false,
    "canaryTokens": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
  },
  "metadata": {
    "environmentId": "eval-sandbox-us-east",
    "cluster": "eval-redteam-sandbox",
    "region": "us-east-1",
    "labels": {
      "purpose": "adversarial-jailbreak-eval",
      "cost-center": "safety-research"
    }
  }
}
```

### 4.2 Operator & Automated Diagnostic Inputs
1. **Probe Execution Trigger:** Initiation signal for individual probes ($T_i$), selective test batches ($T_{\text{sel}}$), or the full suite.
2. **Evaluation Access Request:** Dynamic request submitted by execution harnesses to obtain cryptographic authorization.
3. **Audit Chain Verification Invocation:** Command instructing the verifier to validate ledger continuity.
4. **External Ledger File:** JSON payload representing an imported evidence log for verification.
5. **Theme Preference:** User selection (`dark` or `light`), persisted to browser storage.

### 4.3 Simulation & Benchmark Inputs
1. **Security Mutations ($M_1$–$M_5$):**
   - $M_1$: Storage API authorization relaxation (`allowAnonymousAccess: true`).
   - $M_2$: Cross-tenant filesystem mount leak (`hostPath: /data/tenants/blue/benchmarks`).
   - $M_3$: Cross-tenant network bridging (`crossTenantBridging: true`, `egressAllowedCIDRs: ["10.0.0.0/8"]`).
   - $M_4$: Model gateway cache sharing (`cacheShared: true`).
   - $M_5$: Workload hardening degradation (`readOnlyRootFilesystem: false`, `privileged: true`).
2. **Negative Control Mutation ($B_1$):**
   - Benign label modification (`labels.purpose: benign-ui-metadata-update`).
3. **Adversarial Tamper Simulation:**
   - Payload manipulation (e.g., status forgery `FAIL` $\rightarrow$ `PASS`).
   - Block omission (deleting an intermediate `test.completed` block).

---

## 5. Outputs

### 5.1 Cryptographic Fingerprints & Digest Maps
- **Manifest Fingerprint (`manifest_digest`):** A 64-character lowercase hexadecimal SHA-256 hash computed over the RFC 8785 canonical representation of the configuration.
- **Guarantee Digest Map (`currentDigests`):** A map of five distinct SHA-256 hashes:
  - $D(G_1)$: Storage isolation parameters digest.
  - $D(G_2)$: Network namespace and route configuration digest.
  - $D(G_3)$: Storage API authorization and IAM scope digest.
  - $D(G_4)$: Model inference gateway routing and cache configuration digest.
  - $D(G_5)$: Container workload hardening and security context digest.

### 5.2 Deterministic Assurance Posture & Decoupled Status Schema
The system outputs a real-time Decoupled Assurance Snapshot decoupling assurance into four explicit orthogonal dimensions:

```json
{
  "run_id": "run-49599cac",
  "environment_id": "eval-sandbox-us-east",
  "manifest_digest": "sha256:49599cacb85c0775eec04a5a8e9df899998a848006a53fa4d71be9d554f6453b",
  "configuration_status": "BASELINE",
  "policy_test_status": "PASS",
  "evidence_integrity_status": "VALID",
  "evidence_completeness_status": "COMPLETE",
  "assurance_state": "VERIFIED",
  "drift_details": {
    "affected_guarantees": [],
    "required_retests": []
  },
  "gate_evaluation": {
    "decision": "GRANTED",
    "reasons": [
      "All boundaries cryptographically attested.",
      "Zero Trust evaluation access granted with verifiable certificate."
    ],
    "required_retests": [],
    "ticket_id": "TKT-BAYORA-49599CAC-OK"
  }
}
```

### 5.3 Zero Trust Attestation Certificates & Denial Packages
- **Granted Attestation Certificate:** Issued when `assurance_state == VERIFIED`:
  - `ticketId`: Unique cryptographic token (e.g., `TKT-BAYORA-49599CAC-OK`).
  - `decision`: `"GRANTED"`.
  - `timestamp`: ISO 8601 creation time.
  - `currentFingerprint`: Verified SHA-256 digest.
- **Denied Diagnostic Package:** Issued when `assurance_state != VERIFIED`:
  - `decision`: `"DENIED"`.
  - `reasons`: Explicit failure explanations (e.g., `"Active boundary failure on G3 (T03: Storage API returned HTTP 200 to anonymous probe)"`).
  - `requiredTests`: List of target probes required to regain compliance (`["T03"]`).

### 5.4 Cryptographic Audit Ledger & Verification Reports
- **Append-Only Evidence Ledger:** An array of structured event blocks chained via SHA-256.
- **Verification Report:** Structured verdict output by the verification engine:
  - `status`: `"VALID"`, `"TAMPERED"`, or `"INCOMPLETE"`.
  - `validCount`: Number of consecutive valid blocks.
  - `totalEvents`: Total block count.
  - `signatureValid`: Boolean indicating HMAC authenticity.
  - `brokenSequenceIndex`: Integer pinpointing the exact block of failure.
  - `discrepancy`: Expected vs. actual hash digests.
  - `missingEvents`: Array of omitted lifecycle events.

### 5.5 Empirical Benchmark & Telemetry Metrics
- **Mutation Detection Rate ($D$):** Target $100\%$ ($5/5$ mutations detected).
- **False Positive Rate ($FPR$):** Target $0.0\%$ under negative control $B_1$.
- **Selective Retest Latency Reduction ($R$):** Target $\ge 70\%$, calculated as:
  $$R = 1 - \frac{T_{\text{selective}}}{T_{\text{full}}}$$
- **Time to Detect Drift ($TTD$):** Target $\le 10\text{ ms}$.
- **Recovery Latency ($T_{\text{retest}}$):** Duration to execute selective remedial tests.

---

## 6. Workflow & Operational Lifecycle

### 6.1 End-to-End Operational Lifecycle
The system operates across eight deterministic, sequential operational stages:

```
[ Stage 1: Environment Inputs ]
  Ingests container bind mounts, netns, storage authz policies, and gateway contexts.
             |
             v
[ Stage 2: Canonical Manifest Capture ]
  Filters benign metadata, applies RFC 8785 canonicalization, computes SHA-256 fingerprint.
             |
             v
[ Stage 3: Change-Aware Drift Detection ]
  Compares runtime digests against verified baseline; flags mutated guarantees as STALE.
             |
             v
[ Stage 4: Automated Boundary Probes (T01-T05) ]
  Executes non-destructive diagnostic probes against active container boundaries.
             |
             v
[ Stage 5: State Machine Posture Evaluation ]
  Applies Precedence Rules (1-3) to determine real-time state (VERIFIED, STALE, BREACHED).
             |
             v
[ Stage 6: 7-Stage Cryptographic Hash Chain Logging ]
  Appends sequence blocks anchored to GENESIS_HASH; signs checkpoints via HMAC-SHA256.
             |
             v
[ Stage 7: Fail-Closed Zero Trust Policy Gate ]
  Evaluates posture; issues cryptographic access ticket OR denies with remedial actions.
             |
             v
[ Stage 8: Independent Multi-Party Audit Verification ]
  External auditors verify hash continuity (anti-tamper) and plan contract (anti-omission).
```

### 6.2 Precedence Rules Enforcement Lifecycle
To ensure strict security guarantees, the state machine enforces three inviolable precedence rules:
1. **Rule 1 (Breach Precedence):** An active test failure ($T_i = \text{FAIL}$) immediately forces `assurance_state = BREACHED`, overriding all baseline matching or fresh fingerprints.
2. **Rule 2 (Audit Tamper Precedence):** A detected ledger tampering or omission forces immediate transition to `UNVERIFIED` lockdown, revoking all active tickets.
3. **Rule 3 (No Inheritance Across Drift):** When configuration drift occurs ($M_i$), the affected guarantee digest invalidates prior test results. Prior passing test results **cannot** be inherited across a drifted configuration boundary.

### 6.3 5-Minute Evaluation Script Execution Flow
The platform embeds an automated, step-by-step benchmark script:
- **Step 1 (0:00–0:45):** Demonstrate default-deny (`UNVERIFIED`). Request evaluation access; confirm denial.
- **Step 2 (0:45–1:30):** Execute full verification suite ($T_{01}$–$T_{05}$). Transition to `VERIFIED`; obtain ticket.
- **Step 3 (1:30–2:30):** Inject Mutation $M_1$. Observe immediate drift detection ($TTD \le 8\text{ ms}$), ticket invalidation, and state transition to `STALE`. Execute selective retest $T_{03}$; confirm transition to `BREACHED`.
- **Step 4 (2:30–3:15):** Remediate baseline. State transitions to `RECOVERING`. Run targeted retest $T_{03}$; restore `VERIFIED`. Apply negative control $B_1$; confirm fingerprint remains invariant ($FPR = 0.0\%$).
- **Step 5 (3:15–4:15):** Validate cryptographic hash chain. Simulate status tampering; confirm detection (`TAMPERED`). Simulate event deletion; confirm omission detection (`INCOMPLETE`).
- **Step 6 (4:15–5:00):** Review empirical metrics ($D = 100\%$, $FPR = 0.0\%$, $R = 72\%$, $TTD = 8\text{ ms}$).

---

## 7. Functional Requirements

### 7.1 FR-1: Environment Ingestion & RFC 8785 Normalization Engine
- **FR-1.1:** The system shall ingest configuration manifests containing container bind mounts, network namespaces, storage authorization roles, model gateway configurations, and workload security contexts.
- **FR-1.2:** The system shall filter benign metadata (e.g., container labels, display names, telemetry tags) from the cryptographic manifest to prevent false positives.
- **FR-1.3:** The system shall implement RFC 8785 JSON Canonicalization Scheme (JCS) by sorting all dictionary keys lexicographically by UTF-16 code units and eliminating unnecessary whitespace.
- **FR-1.4:** The system shall compute a 256-bit SHA-256 hexadecimal hash representing the canonical manifest fingerprint.

### 7.2 FR-2: Per-Guarantee Digest & Dependency Mapping Engine
- **FR-2.1:** The system shall compute five independent cryptographic SHA-256 digests corresponding to isolation guarantees $G_1$ through $G_5$:
  - $D(G_1) = \text{SHA256}(\text{Canonical}(C.\text{bindMounts}))$.
  - $D(G_2) = \text{SHA256}(\text{Canonical}(N.\text{networkNamespace}, N.\text{egressAllowedCIDRs}, N.\text{crossTenantBridging}))$.
  - $D(G_3) = \text{SHA256}(\text{Canonical}(S.\text{requiredScope}, S.\text{assignedRole}, S.\text{allowAnonymousAccess}))$.
  - $D(G_4) = \text{SHA256}(\text{Canonical}(M.\text{sessionIsolation}, M.\text{cacheShared}))$.
  - $D(G_5) = \text{SHA256}(\text{Canonical}(C.\text{capabilitiesDropped}, C.\text{readOnlyRootFilesystem}, C.\text{privileged}, C.\text{seccompProfile}))$.
- **FR-2.2:** The system shall maintain a direct mapping between each guarantee $G_i$ and its dedicated automated diagnostic probe $T_i$.
- **FR-2.3:** When runtime configuration changes, the system shall compute new digests and determine the exact subset of drifted guarantees where $D_{\text{current}}(G_i) \neq D_{\text{verified}}(G_i)$.

### 7.3 FR-3: Automated Isolation Diagnostic Probes ($T_{01}$–$T_{05}$)
- **FR-3.1 (Probe $T_{01}$):** The system shall inspect container mount points. It shall return `PASS` if and only if Red runner container mounts are strictly confined to `/opt/red/workspace` and contain zero Blue evaluation paths.
- **FR-3.2 (Probe $T_{02}$):** The system shall verify network namespace microsegmentation. It shall return `PASS` if and only if `crossTenantBridging == false` and egress routes exclude Blue control subnets.
- **FR-3.3 (Probe $T_{03}$):** The system shall execute synthetic storage API authorization queries. It shall return `PASS` if unauthenticated or relaxed access attempts receive HTTP 403 Forbidden.
- **FR-3.4 (Probe $T_{04}$):** The system shall inject 128-bit canary tokens into inference requests. It shall return `PASS` if and only if concurrent cross-tenant inference sessions yield 0 ppm canary token leakage.
- **FR-3.5 (Probe $T_{05}$):** The system shall verify container security contexts. It shall return `PASS` if and only if `readOnlyRootFilesystem == true`, `privileged == false`, and Linux capabilities dropped include `["ALL"]`.

### 7.4 FR-4: State Machine & Inviolable Precedence Rule Enforcement
- **FR-4.1:** The system shall maintain an assurance state machine with five distinct states:
  - `UNVERIFIED`: Initial boot posture or state following ledger tampering. Default deny active.
  - `VERIFIED`: All five diagnostic probes passed on the current configuration digest. Gating open.
  - `STALE`: Configuration drift detected; affected guarantees pending selective retest. Gating locked.
  - `BREACHED`: One or more diagnostic probes failed. Perimeter compromised. Gating locked.
  - `RECOVERING`: Configuration restored to baseline following breach, pending remedial test execution.
- **FR-4.2:** The system shall enforce Precedence Rule 1: Active probe failure forces immediate transition to `BREACHED`.
- **FR-4.3:** The system shall enforce Precedence Rule 2: Evidence chain tampering or omission forces immediate transition to `UNVERIFIED`.
- **FR-4.4:** The system shall enforce Precedence Rule 3: No test result inheritance across configuration drift. Prior results for drifted guarantees are expunged (`undefined`).

### 7.5 FR-5: Selective Retesting Optimization Engine
- **FR-5.1:** Upon configuration drift, the system shall identify affected guarantees and populate `required_retests`.
- **FR-5.2:** The system shall provide an executable selective retest trigger running **only** the diagnostic probes mapped to the drifted guarantees.
- **FR-5.3:** The selective retest engine shall achieve a reduction in test execution latency of $R \ge 70\%$ compared to full suite execution.
- **FR-5.4:** If the selective test passes and all remaining guarantees match their verified digests, the system shall transition posture directly from `STALE` (or `RECOVERING`) to `VERIFIED`.

### 7.6 FR-6: 7-Stage Cryptographic Evidence Protocol & Hash Chaining
- **FR-6.1:** The system shall log every lifecycle event in an append-only cryptographic sequence.
- **FR-6.2:** The genesis event (sequence `#1`) shall set `previous_event_hash` to `GENESIS_HASH` (`0000000000000000000000000000000000000000000000000000000000000000`).
- **FR-6.3:** Every subsequent event block $k$ ($k > 1$) shall compute its hash over:
  $$H_k = \text{SHA256}(k \parallel \text{run\_id} \parallel \text{timestamp} \parallel \text{event\_type} \parallel \text{Canonical}(\text{payload}) \parallel H_{k-1})$$
- **FR-6.4:** The system shall enforce the 7-stage declared lifecycle sequence:
  1. `run.started`: Emits the initial block containing the declared `expected_plan`.
  2. `manifest.captured`: Records canonical environment configuration and digest.
  3. `test.started`: Emitted prior to executing probe $T_i$.
  4. `test.completed`: Emitted upon probe completion with status and diagnostic telemetry.
  5. `policy.decision`: Records posture transition verdict and fail-closed determination.
  6. `checkpoint.signed`: Appends an HMAC-SHA256 signature generated over the current event hash.
  7. `run.completed`: Concludes execution with terminal run summary metrics.

### 7.7 FR-7: Anti-Tamper & Anti-Omission Verification Engine
- **FR-7.1:** The verification engine shall recompute all event hashes from sequence `#1` to sequence `#N` to detect payload modification (`TAMPERED`).
- **FR-7.2:** The verification engine shall verify that `previous_event_hash` pointers match predecessors monotonically.
- **FR-7.3:** The verification engine shall validate HMAC-SHA256 checkpoint signatures using key ID `secp256k1-hsm-signer-01`.
- **FR-7.4:** The verification engine shall evaluate plan completeness by comparing recorded events against the `expected_plan` contract declared in `run.started`. If any planned event was omitted, the verifier shall return status `INCOMPLETE`.
- **FR-7.5:** The system shall provide a standalone, zero-dependency Node.js CLI script (`scripts/verify_ledger.mjs`) enabling independent third-party audit verification.

### 7.8 FR-8: Fail-Closed Zero Trust Evaluation Gate Arbiter
- **FR-8.1:** The policy gate shall enforce default-deny. Evaluation access requests shall be `DENIED` unless `assurance_state == VERIFIED`, current fingerprint matches verified baseline, and ledger status is `VALID`.
- **FR-8.2:** When granted, the gate shall emit a signed attestation ticket containing `ticketId`, timestamp, and manifest fingerprint.
- **FR-8.3:** If configuration drift occurs after ticket issuance, the system shall immediately mark the ticket `INVALIDATED` and transition the gate to lockdown.
- **FR-8.4:** When denied, the gate shall emit an actionable diagnosis detailing exact drifted guarantees and required remedial probes.

### 7.9 FR-9: Controlled Mutation Lab & Benchmark Framework ($M_1$–$M_5$, $B_1$)
- **FR-9.1:** The system shall provide reversible one-click mutation triggers for five distinct security failure modes ($M_1$–$M_5$).
- **FR-9.2:** The system shall provide a reversible negative control trigger ($B_1$) altering benign labels without modifying security configuration.
- **FR-9.3:** The system shall demonstrate a Mutation Detection Rate of $D = 100\%$ ($5/5$) and a False Positive Rate of $FPR = 0.0\%$ under $B_1$.
- **FR-9.4:** The system shall calculate real-time detection latency ($TTD$) upon mutation injection, achieving $TTD \le 10\text{ ms}$.

### 7.10 FR-10: Operator Interactive Workbench & Dual Theme UI
- **FR-10.1:** The system shall provide an interactive operator dashboard incorporating:
  - Executive Posture Banner with real-time indicators and metrics strip.
  - Subnav Navigation with six dedicated workbench views.
  - Guarantees Matrix ($G_1$–$G_5$) with automated probe execution triggers.
  - Mutation Lab with interactive topology visualization and diff views.
  - Fail-Closed Gate Arbiter with ticket display and export capabilities.
  - Cryptographic Evidence Log with live hash chain inspector and tamper simulators.
  - Empirical Benchmark Panel with guided 5-minute evaluation walkthrough.
  - Threat Model & Architectural Scope documentation panel.
- **FR-10.2:** The interface shall support seamless toggling between Cyber-Defense Dark Mode and Enterprise Light Mode.
- **FR-10.3:** Light Mode shall maintain high contrast across all cards, badges, and certificates, adhering to WCAG 2.1 AA accessibility standards.
- **FR-10.4:** User theme preference shall persist across sessions via `localStorage`.

---

## 8. AI Responsibilities

### 8.1 Automated Boundary Diagnostic Probing
The system autonomously executes synthetic diagnostic probes ($T_{01}$–$T_{05}$) against live container boundaries without human intervention. The AI agent:
- Generates high-entropy canary payloads for inference isolation evaluation.
- Issues non-destructive synthetic authorization requests to object storage endpoints.
- Validates active Linux namespaces and container capability masks.

### 8.2 Real-Time Drift Analysis & Differential Invalidation
The system continuously monitors runtime configuration changes. Upon detecting configuration mutations:
- It autonomously computes differential digests across all five isolation domains.
- It identifies precisely which guarantees have been compromised.
- It automatically invalidates prior test attestations for affected guarantees.

### 8.3 Deterministic Hash Chain Construction & Checkpoint Signing
The verification engine autonomously maintains the cryptographic ledger:
- Formats and normalizes event payloads using RFC 8785 canonical serialization.
- Chains SHA-256 digests in strictly monotonic sequence order.
- Generates HMAC-SHA256 signatures for checkpoint blocks at declared lifecycle milestones.

### 8.4 Anti-Omission Plan Contract Verification
During ledger verification, the agent:
- Extracts the declared `expected_plan` array from the `run.started` genesis event.
- Systematically cross-references every executed test against the planned contract.
- Automatically flags omitted tests as security violations (`INCOMPLETE`), triggering fail-closed lockdown.

### 8.5 Automated Selective Test Plan Synthesis
Upon configuration drift, the system:
- Synthesizes an optimal selective test execution graph.
- Minimizes test execution overhead while ensuring zero regression leakage.
- Calculates and displays real-time efficiency metrics ($R \ge 70\%$).

### 8.6 Telemetry & Performance Metric Synthesis
The system autonomously measures, records, and aggregates operational metrics:
- Time to Detect ($TTD$) in milliseconds.
- Recovery latency following baseline remediation.
- False positive rates under negative controls.

### 8.7 Autonomous Fail-Closed Enforcement
The policy gate engine autonomously revokes active attestation tickets the instant configuration drift or probe failure is detected, locking out untrusted workloads without awaiting human confirmation.

---

## 9. Human Responsibilities

### 9.1 Baseline Policy & Invariant Definition
Human security architects and infrastructure owners are responsible for:
- Formally defining the baseline configuration manifest (`BASELINE_CONFIG`).
- Specifying mandatory dropped Linux capabilities, network CIDR boundaries, and storage IAM roles.
- Setting acceptable token TTL thresholds and cryptographic key rotation intervals.

### 9.2 Infrastructure Parameter Provisioning & Remediation
Human MLOps engineers and administrators are responsible for:
- Provisioning physical host hardware, hypervisors, and container runtime engines.
- Executing infrastructure remediation when the system reports `STALE` or `BREACHED` states.
- Re-aligning drifted runtime parameters with certified baseline values.

### 9.3 Attestation Review & Safety Certification
Human safety officers and compliance auditors are responsible for:
- Performing formal reviews of exported cryptographic audit logs.
- Executing the independent offline CLI verifier (`verify_ledger.mjs`) prior to safety certification.
- Archiving signed attestation packages for regulatory oversight.

### 9.4 Adversarial Red-Team Campaign Governance
Human red-team operators are responsible for:
- Authoring and selecting adversarial jailbreak payloads and attack scripts.
- Requesting evaluation access tickets through the platform interface.
- Ensuring evaluation jobs operate strictly within the bounds granted by the attestation certificate.

### 9.5 Key Management & Hardware Security Module Governance
Human security officers are responsible for:
- Managing and safeguarding root signing keys used in HMAC-SHA256 checkpoint attestation.
- Provisioning and configuring Hardware Security Modules (HSMs) or cloud KMS equivalents.
- Performing key retirement and revocation operations.

### 9.6 Incident Response & Quarantine Execution
Human security operations (SecOps) teams are responsible for:
- Responding to `BREACHED` perimeter notifications.
- Quarantining compromised container nodes and conducting root-cause forensic investigations.
- Authorizing sandbox re-commissioning following security incident clearance.

---

## 10. Constraints

### 10.1 Technical & Cryptographic Constraints
- **Standardized Serialization:** All hashing operations must utilize RFC 8785 Canonical JSON. Implementations must strictly adhere to lexicographical key sorting and whitespace stripping.
- **Fixed-Length Hashing:** All configuration fingerprints, guarantee digests, and event hashes must be standard 256-bit SHA-256 strings (64 hexadecimal characters).
- **Zero Daemon Dependencies:** Cryptographic operations must execute natively via Web Crypto API (`crypto.subtle`) without requiring external cryptographic background services or third-party cloud connections.

### 10.2 Architectural & Runtime Constraints
- **Dual Execution Environment:** Core business logic and cryptographic verifiers must execute deterministically in both browser runtimes (V8/SpiderMonkey/JavaScriptCore) and serverless/CLI Node.js environments (v24+).
- **Zero-Impact Probing:** Diagnostic probes ($T_{01}$–$T_{05}$) must be non-destructive and executable against live sandboxes without disrupting active evaluation jobs or corrupting benchmark datasets.

### 10.3 Regulatory & Compliance Constraints
- **Non-Repudiation:** Audit log entries must be append-only. No facility shall exist to update, edit, or overwrite existing event blocks.
- **Tamper Evident:** Any alteration to recorded event payloads or pointer linkages must immediately cause downstream verification failure.

### 10.4 Performance & Latency Constraints
- **Drift Detection Latency:** Configuration drift detection and state invalidation must complete in $TTD \le 15\text{ ms}$ (empirically measured at $\le 8\text{ ms}$).
- **Selective Retesting Savings:** Selective retesting must reduce test execution overhead by at least $60\%$ (target $R \ge 70\%$) compared to full suite execution.
- **Hash Chain Verification:** Verifying a 15-block audit chain must execute in under $50\text{ ms}$.

### 10.5 Security Boundary Constraints
- **Trusted Roots of Trust:** The host operating system kernel, container hypervisor (e.g., KVM/containerd), and underlying physical CPU/RAM are assumed to be trusted foundations.
- **Boundary Scope:** Bayora Sentinel operates at the configuration, authorization, and network boundary level; it does not protect against zero-day Linux kernel privilege escalations (e.g., Dirty Pipe, container breakout exploits) or physical hardware fault injection.

---

## 11. Failure Handling & Resilience

### 11.1 Perimeter Breach Handling
- **Failure Trigger:** One or more automated diagnostic probes fail ($T_i = \text{FAIL}$).
- **Immediate Action:** The state machine transitions immediately to `BREACHED`.
- **Gating Action:** The Zero Trust Policy Gate locks down instantly; any active attestation tickets are revoked.
- **Operator Notification:** The dashboard displays an alert identifying the failed guarantee, probe ID, and diagnostic error output.
- **Recovery Requirement:** The underlying infrastructure must be remediated to baseline, transitioning posture to `RECOVERING`, followed by a successful retest.

### 11.2 Configuration Drift Handling
- **Failure Trigger:** Runtime manifest digests diverge from verified baseline values ($D_{\text{current}} \neq D_{\text{verified}}$).
- **Immediate Action:** The state machine transitions posture to `STALE`.
- **Gating Action:** The Policy Gate blocks evaluation requests under default-deny.
- **Selective Invalidation:** Only the specific guarantees whose digests mutated are invalidated; unaffected guarantees retain valid status.
- **Recovery Requirement:** Execution of the targeted selective retest suite restores `VERIFIED` state once tests pass.

### 11.3 Ledger Tampering Detection & Handling
- **Failure Trigger:** An adversary or system failure alters a historical ledger event payload, timestamp, or status.
- **Detection Mechanism:** The verification engine detects a discrepancy between the recorded `event_hash` and the freshly recomputed hash.
- **System Response:** Ledger verification status shifts immediately to `TAMPERED`.
- **Security Action:** In accordance with Precedence Rule 2, the assurance posture drops to `UNVERIFIED` lockdown, revoking all issued certificates.

### 11.4 Event Omission Detection & Handling
- **Failure Trigger:** An adversary deletes an intermediate block (e.g., a failing test block) and re-hashes subsequent pointer linkages to simulate hash continuity.
- **Detection Mechanism:** The verification engine cross-references the recomputed chain against the `expected_plan` contract anchored in sequence block `#1` (`run.started`).
- **System Response:** The engine flags missing events and emits status `INCOMPLETE`.
- **Security Action:** The system triggers fail-closed lockdown (`UNVERIFIED`).

### 11.5 Network & Storage Subnet Isolation Failure Handling
- **Failure Trigger:** Subnet route leakage or network namespace bridging enables communication between Red and Blue subnets.
- **Detection Mechanism:** Probe $T_{02}$ detects reachable IP endpoints on protected subnets.
- **System Response:** Immediate failure on $G_2$, transition to `BREACHED`, policy gate lockdown.

### 11.6 Remediation & Recovery Protocol
- **Step 1:** Operator identifies root cause using the denial diagnostic package.
- **Step 2:** Operator applies infrastructure configuration remediation.
- **Step 3:** System detects baseline configuration alignment; state shifts to `RECOVERING`.
- **Step 4:** Operator triggers selective retesting for previously failed or drifted guarantees.
- **Step 5:** Upon passing, the system logs a clean 7-stage run, signs a new checkpoint, and transitions posture to `VERIFIED`.

---

## 12. Acceptance Criteria & Verification Matrix

### 12.1 Functional Acceptance Criteria
- **AC-01:** System computes identical SHA-256 fingerprints for manifests with identical key-value pairs regardless of key insertion order.
- **AC-02:** Benign label modifications ($B_1$) produce zero change in the manifest fingerprint ($FPR = 0.0\%$).
- **AC-03:** Each of the five controlled mutations ($M_1$–$M_5$) triggers immediate drift detection ($D = 100\%$) and state transition to `STALE`.
- **AC-04:** Selective retest targets strictly the probes mapped to drifted guarantees.
- **AC-05:** Full 5-probe declared lifecycle run generates exactly 15 sequential ledger blocks.
- **AC-06:** Selective 1-probe lifecycle run generates exactly 7 sequential ledger blocks.
- **AC-07:** Ledger verification detects single-character payload alterations, accurately reporting sequence index and hash mismatch.
- **AC-08:** Ledger verification detects block deletions, accurately reporting `INCOMPLETE` status and missing event IDs.

### 12.2 Security Acceptance Criteria
- **AC-09:** Zero Trust Policy Gate denies access in `UNVERIFIED`, `STALE`, `BREACHED`, and `RECOVERING` states.
- **AC-10:** Access is granted if and only if state is `VERIFIED`, manifest matches verified baseline, and ledger is `VALID`.
- **AC-11:** Configuration drift immediately revokes previously issued attestation tickets.
- **AC-12:** Prior test results are never inherited across configuration drift boundaries.

### 12.3 Performance Acceptance Criteria
- **AC-13:** Drift detection latency ($TTD$) is $\le 10\text{ ms}$.
- **AC-14:** Selective retesting latency reduction ($R$) is $\ge 70\%$.
- **AC-15:** All 200 automated benchmark test cases in `test_200_cases.mjs` pass with $100\%$ pass rate.

### 12.4 Verification Methods & Test Strategy Matrix

| Requirement | Description | Verification Method | Automated Test Suite |
| :--- | :--- | :--- | :--- |
| **FR-1** | Canonical JSON & SHA-256 | Automated Unit Test | `test_200_cases.mjs` (Cases 1–25) |
| **FR-2** | Guarantee Digest Mapping | Automated Unit Test | `test_200_cases.mjs` (Cases 26–50) |
| **FR-3** | Diagnostic Probes ($T_{01}$–$T_{05}$) | Automated Integration Test | `test_200_cases.mjs` (Cases 51–80) |
| **FR-4** | State Machine & Precedence | Automated State Machine Test | `test_200_cases.mjs` (Cases 81–110) |
| **FR-5** | Selective Retesting ($R$) | Automated Performance Test | `test_200_cases.mjs` (Cases 111–135) |
| **FR-6** | 7-Stage Evidence Hash Chain | Cryptographic Verifier Test | `test_200_cases.mjs` (Cases 136–165) |
| **FR-7** | Anti-Tamper & Anti-Omission | Adversarial Injection Test | `test_200_cases.mjs` (Cases 166–190) |
| **FR-8** | Zero Trust Policy Gate | Security Authorization Test | `test_200_cases.mjs` (Cases 191–200) |
| **FR-10** | Dual Theme Workbench UI | Headless Browser Validation | Browser Subagent E2E Test |

---

## 13. Version 1 Exclusions & Future Roadmap

### 13.1 Explicit Out-of-Scope Items for Version 1.0
The following capabilities are explicitly excluded from the Version 1.0.0 release baseline:
1. **Kernel Privilege Escalation Detection:** Detection of zero-day Linux kernel vulnerabilities or container breakout exploits (e.g., Dirty Pipe, runc CVE-2024-21626) is excluded. The host kernel is treated as an assumed root of trust.
2. **Hardware & Microarchitectural Side Channels:** Physical fault injection attacks (Rowhammer), CPU cache timing channels (Spectre/Meltdown), and GPU co-location memory bus timing attacks are outside the operational model.
3. **Decentralized Multi-Party Consensus:** Version 1.0 utilizes HMAC-SHA256 checkpoint signatures. Decentralized Byzantine fault-tolerant consensus ledgers (e.g., multi-party Raft, distributed validators) are deferred.
4. **Automated Live Kernel Remediation:** The platform detects drift, invalidates assurance, and blocks workloads; it does not automatically patch host Linux kernel configs or rewrite Kubernetes CRDs without human intervention.
5. **Multi-Cluster Federation:** Version 1.0 addresses single-cluster or multi-tenant sandboxes within a single infrastructure domain. Cross-cloud multi-cluster policy federation is excluded.

### 13.2 Version 2.0 Architectural Roadmap
Planned future enhancements for post-V1.0 milestones include:
- **eBPF-Based Live Telemetry Capture:** Integrating an eBPF sensor (Extended Berkeley Packet Filter) to continuously monitor container syscall boundaries (`openat`, `connect`, `bpf`) in real time without synthetic polling.
- **Hardware Security Module (HSM) TPM 2.0 Integration:** Replacing synthetic HMAC signing with native TPM 2.0 hardware quoting and Ed25519 asymmetric enclave attestation.
- **Kubernetes Admission Controller Operator:** Packaging Bayora Sentinel as a native Kubernetes Mutating/Validating Admission Webhook to automatically intercept and gate Pod execution requests.
- **Distributed Multi-Verifier Quorum:** Implementing threshold signature schemes (BLS12-381) allowing multiple independent compliance auditors to co-sign attestation checkpoints.

---

**End of Specification**  
*Document maintained by the Bayora Security Architecture Review Board (SARB).*
