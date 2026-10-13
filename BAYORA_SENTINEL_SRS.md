# Software Requirements Specification (SRS)
## Project: Bayora Sentinel — Continuous Security Assurance for AI Evaluation Infrastructure
**Document Version:** 1.2.0  
**Status:** Approved / Enterprise Engineering Baseline  
**Classification:** Technical Architecture, Formal Semantics & System Requirements Specification  
**Standard:** IEEE 830-1998 / ISO/IEC/IEEE 29148:2018 Compliant  
**Date:** October 2026  
**Repository:** [https://github.com/amitshukla-7/Bayora](https://github.com/amitshukla-7/Bayora)  

---

## Executive Summary & Document Control

```
+----------------------------------------------------------------------------------------------------+
|                                      DOCUMENT METADATA                                             |
+----------------------+-----------------------------------------------------------------------------+
| Project Codename     | Bayora Sentinel                                                             |
| Formal Designation   | Continuous Cryptographic Posture Engine for AI Red-Teaming Sandboxes        |
| Target Environment   | Multi-Tenant AI Safety Evaluation Clusters & LLM Inference Sandboxes        |
| Core Primitives      | RFC 8785 Canonical JSON, SHA-256 Hash Chaining, HMAC-SHA256 Checkpoints      |
| Authoring Body       | Bayora Security Architecture Review Board (SARB)                            |
| Compliance Standards | NIST AI RMF 1.0, ISO/IEC 27001:2022, SOC 2 Type II, OWASP Top 10 for LLMs    |
| Baseline Hash (Git)  | Commit ce306bb / 2c5569e                                                    |
+----------------------+-----------------------------------------------------------------------------+
```

---

## Complete Table of Contents

- [1. Introduction](#1-introduction)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Document Scope](#12-document-scope)
  - [1.3 Definitions, Acronyms, and Abbreviations](#13-definitions-acronyms-and-abbreviations)
  - [1.4 References and Applicable Standards](#14-references-and-applicable-standards)
  - [1.5 Document Overview & Governance](#15-document-overview--governance)
- [2. Product Overview](#2-product-overview)
  - [2.1 Product Perspective & Context](#21-product-perspective--context)
  - [2.2 Problem Statement & Core Value Proposition](#22-problem-statement--core-value-proposition)
  - [2.3 System Architecture & Logical Topology](#23-system-architecture--logical-topology)
  - [2.4 Product Functions Summary (F-01 to F-14)](#24-product-functions-summary-f-01-to-f-14)
  - [2.5 Operating Environment & Technology Stack](#25-operating-environment--technology-stack)
  - [2.6 User Characteristics & Operational Profiles](#26-user-characteristics--operational-profiles)
- [3. Users & Stakeholders](#3-users--stakeholders)
  - [3.1 Primary User Personas](#31-primary-user-personas)
  - [3.2 User Needs & Pain Points Matrix](#32-user-needs--pain-points-matrix)
  - [3.3 Role-Based Authorization & Privilege Matrix](#33-role-based-authorization--privilege-matrix)
- [4. Inputs](#4-inputs)
  - [4.1 System & Runtime Manifest Inputs](#41-system--runtime-manifest-inputs)
  - [4.2 Operator & Automated Diagnostic Inputs](#42-operator--automated-diagnostic-inputs)
  - [4.3 Simulation & Benchmark Inputs ($M_1$–$M_5$, $B_1$)](#43-simulation--benchmark-inputs-m_1m_5-b_1)
- [5. Outputs](#5-outputs)
  - [5.1 Cryptographic Fingerprints & Digest Maps](#51-cryptographic-fingerprints--digest-maps)
  - [5.2 Deterministic Assurance Posture & Decoupled Status Schema](#52-deterministic-assurance-posture--decoupled-status-schema)
  - [5.3 Zero Trust Attestation Certificates & Denial Packages](#53-zero-trust-attestation-certificates--denial-packages)
  - [5.4 Cryptographic Audit Ledger & Verification Reports](#54-cryptographic-audit-ledger--verification-reports)
  - [5.5 Empirical Benchmark & Telemetry Metrics](#55-empirical-benchmark--telemetry-metrics)
- [6. Workflow & Operational Lifecycle](#6-workflow--operational-lifecycle)
  - [6.1 End-to-End Operational Lifecycle (8 Stages)](#61-end-to-end-operational-lifecycle-8-stages)
  - [6.2 Inviolable Precedence Rules Lifecycle](#62-inviolable-precedence-rules-lifecycle)
  - [6.3 5-Minute Evaluation Script Execution Flow](#63-5-minute-evaluation-script-execution-flow)
- [7. Functional Requirements](#7-functional-requirements)
  - [7.1 FR-1: Environment Ingestion & RFC 8785 Normalization Engine](#71-fr-1-environment-ingestion--rfc-8785-normalization-engine)
  - [7.2 FR-2: Per-Guarantee Digest & Dependency Mapping Engine](#72-fr-2-per-guarantee-digest--dependency-mapping-engine)
  - [7.3 FR-3: Automated Isolation Diagnostic Probes ($T_{01}$–$T_{05}$)](#73-fr-3-automated-isolation-diagnostic-probes-t_01t_05)
  - [7.4 FR-4: State Machine & Inviolable Precedence Rule Enforcement](#74-fr-4-state-machine--inviolable-precedence-rule-enforcement)
  - [7.5 FR-5: Selective Retesting Optimization Engine](#75-fr-5-selective-retesting-optimization-engine)
  - [7.6 FR-6: 7-Stage Cryptographic Evidence Protocol & Hash Chaining](#76-fr-6-7-stage-cryptographic-evidence-protocol--hash-chaining)
  - [7.7 FR-7: Anti-Tamper & Anti-Omission Verification Engine](#77-fr-7-anti-tamper--anti-omission-verification-engine)
  - [7.8 FR-8: Fail-Closed Zero Trust Evaluation Gate Arbiter](#78-fr-8-fail-closed-zero-trust-evaluation-gate-arbiter)
  - [7.9 FR-9: Controlled Mutation Lab & Benchmark Framework](#79-fr-9-controlled-mutation-lab--benchmark-framework)
  - [7.10 FR-10: Operator Interactive Workbench & Dual Theme UI](#710-fr-10-operator-interactive-workbench--dual-theme-ui)
- [8. AI Responsibilities](#8-ai-responsibilities)
  - [8.1 Automated Boundary Diagnostic Probing](#81-automated-boundary-diagnostic-probing)
  - [8.2 Real-Time Drift Analysis & Differential Invalidation](#82-real-time-drift-analysis--differential-invalidation)
  - [8.3 Deterministic Hash Chain Construction & Checkpoint Signing](#83-deterministic-hash-chain-construction--checkpoint-signing)
  - [8.4 Anti-Omission Plan Contract Verification](#84-anti-omission-plan-contract-verification)
  - [8.5 Automated Selective Test Plan Synthesis](#85-automated-selective-test-plan-synthesis)
  - [8.6 Telemetry & Performance Metric Synthesis](#86-telemetry--performance-metric-synthesis)
  - [8.7 Autonomous Fail-Closed Denial Enforcement](#87-autonomous-fail-closed-denial-enforcement)
- [9. Human Responsibilities](#9-human-responsibilities)
  - [9.1 Baseline Policy & Invariant Definition](#91-baseline-policy--invariant-definition)
  - [9.2 Infrastructure Parameter Provisioning & Remediation](#92-infrastructure-parameter-provisioning--remediation)
  - [9.3 Attestation Review & Safety Certification](#93-attestation-review--safety-certification)
  - [9.4 Adversarial Red-Team Campaign Governance](#94-adversarial-red-team-campaign-governance)
  - [9.5 Key Management & Hardware Security Module Governance](#95-key-management--hardware-security-module-governance)
  - [9.6 Incident Response & Quarantine Execution](#96-incident-response--quarantine-execution)
- [10. Constraints](#10-constraints)
  - [10.1 Technical & Cryptographic Constraints](#101-technical--cryptographic-constraints)
  - [10.2 Architectural & Runtime Constraints](#102-architectural--runtime-constraints)
  - [10.3 Regulatory & Compliance Constraints](#103-regulatory--compliance-constraints)
  - [10.4 Performance & Latency Constraints](#104-performance--latency-constraints)
  - [10.5 Security Boundary Constraints](#105-security-boundary-constraints)
- [11. Failure Handling & Resilience](#11-failure-handling--resilience)
  - [11.1 Perimeter Breach Handling](#11-failure-handling--resilience)
  - [11.2 Configuration Drift Handling](#112-configuration-drift-handling)
  - [11.3 Ledger Tampering Detection & Handling](#113-ledger-tampering-detection--handling)
  - [11.4 Event Omission Detection & Handling](#114-event-omission-detection--handling)
  - [11.5 Network & Storage Subnet Isolation Failure Handling](#115-network--storage-subnet-isolation-failure-handling)
  - [11.6 Remediation & Recovery Protocol](#116-remediation--recovery-protocol)
- [12. Acceptance Criteria & Verification Matrix](#12-acceptance-criteria--verification-matrix)
  - [12.1 Functional Acceptance Criteria](#121-functional-acceptance-criteria)
  - [12.2 Security Acceptance Criteria](#122-security-acceptance-criteria)
  - [12.3 Performance Acceptance Criteria](#123-performance-acceptance-criteria)
  - [12.4 Verification Methods & Test Strategy Matrix](#124-verification-methods--test-strategy-matrix)
- [13. Version 1 Exclusions & Future Roadmap](#13-version-1-exclusions--future-roadmap)
  - [13.1 Explicit Out-of-Scope Items for Version 1.0](#131-explicit-out-of-scope-items-for-version-10)
  - [13.2 Version 2.0 Architectural Roadmap](#132-version-20-architectural-roadmap)
- [14. Mathematical & Cryptographic Foundations](#14-mathematical--cryptographic-foundations)
  - [14.1 Canonical State Function & Collision Resistance](#141-canonical-state-function--collision-resistance)
  - [14.2 Hash Chain Induction & Monotonic Integrity Proof](#142-hash-chain-induction--monotonic-integrity-proof)
  - [14.3 Dependency Graph Theory for Selective Retesting](#143-dependency-graph-theory-for-selective-retesting)
  - [14.4 Cryptographic Checkpoint Signing Model](#144-cryptographic-checkpoint-signing-model)
- [15. Threat Modeling & Attack Surface Analysis (STRIDE & MITRE ATT&CK)](#15-threat-modeling--attack-surface-analysis-stride--mitre-attck)
  - [15.1 STRIDE Threat Analysis Matrix](#151-stride-threat-analysis-matrix)
  - [15.2 MITRE ATT&CK for LLM / AI Infrastructure Matrix](#152-mitre-attck-for-llm--ai-infrastructure-matrix)
  - [15.3 Blast Radius & Defense-in-Depth Model](#153-blast-radius--defense-in-depth-model)
- [16. Formal Data Dictionary & JSON Schemas](#16-formal-data-dictionary--json-schemas)
  - [16.1 SimulatedConfig Schema](#161-simulatedconfig-schema)
  - [16.2 EvidenceEvent Schema](#162-evidenceevent-schema)
  - [16.3 DecoupledAssuranceSnapshot Schema](#163-decoupledurancesnapshot-schema)
  - [16.4 ChainVerificationReport Schema](#164-chainverificationreport-schema)
  - [16.5 EvaluationTicket Schema](#165-evaluationticket-schema)
- [17. Diagnostic Probes Deep Technical Specification ($T_{01}$–$T_{05}$)](#17-diagnostic-probes-deep-technical-specification-t_01t_05)
  - [17.1 Probe $T_{01}$: Filesystem Boundary & Mount Containment](#171-probe-t_01-filesystem-boundary--mount-containment)
  - [17.2 Probe $T_{02}$: Network Microsegmentation & Namespace Isolation](#172-probe-t_02-network-microsegmentation--namespace-isolation)
  - [17.3 Probe $T_{03}$: Storage Object Scope & Signed Token Authorization](#173-probe-t_03-storage-object-scope--signed-token-authorization)
  - [17.4 Probe $T_{04}$: Model Gateway KV-Cache & Canary Bleed Detection](#174-probe-t_04-model-gateway-kv-cache--canary-bleed-detection)
  - [17.5 Probe $T_{05}$: Workload Hardening & Capability Containment](#175-probe-t_05-workload-hardening--capability-containment)
- [18. Operational Runbooks & Incident Response Playbooks](#18-operational-runbooks--incident-response-playbooks)
  - [18.1 Runbook RB-01: Triaging a BREACHED Perimeter Alert](#181-runbook-rb-01-triaging-a-breached-perimeter-alert)
  - [18.2 Runbook RB-02: Remediating Configuration Drift (STALE to VERIFIED)](#182-runbook-rb-02-remediating-configuration-drift-stale-to-verified)
  - [18.3 Runbook RB-03: Handling Tampered or Incomplete Audit Ledgers](#183-runbook-rb-03-handling-tampered-or-incomplete-audit-ledgers)
  - [18.4 Runbook RB-04: Emergency Fail-Closed Quarantine Procedure](#184-runbook-rb-04-emergency-fail-closed-quarantine-procedure)
- [19. Regulatory & Security Standards Compliance Mapping](#19-regulatory--security-standards-compliance-mapping)
  - [19.1 NIST AI RMF 1.0 Alignment](#191-nist-ai-rmf-10-alignment)
  - [19.2 ISO/IEC 27001:2022 Annex A Controls](#192-isoiec-270012022-annex-a-controls)
  - [19.3 SOC 2 Type II Trust Services Criteria](#193-soc-2-type-ii-trust-services-criteria)
  - [19.4 OWASP Top 10 for Large Language Models (LLM AI)](#194-owasp-top-10-for-large-language-models-llm-ai)
- [20. Deployment Topologies & Infrastructure Architectures](#20-deployment-topologies--infrastructure-architectures)
  - [20.1 Standalone Evaluation Sandbox Architecture](#201-standalone-evaluation-sandbox-architecture)
  - [20.2 Kubernetes Multi-Tenant Evaluation Cluster Topology](#202-kubernetes-multi-tenant-evaluation-cluster-topology)
  - [20.3 Zero-Trust Sidecar & Model Proxy Gateway Topology](#203-zero-trust-sidecar--model-proxy-gateway-topology)
- [21. 200-Case Automated Verification Benchmark Architecture](#21-200-case-automated-verification-benchmark-architecture)
  - [21.1 Benchmark Suite Breakdown (200 Test Cases)](#211-benchmark-suite-breakdown-200-test-cases)
  - [21.2 Negative Control Validation ($B_1$)](#212-negative-control-validation-b_1)
  - [21.3 CI/CA Automated Pipeline Integration](#213-cica-automated-pipeline-integration)
- [22. Appendices](#22-appendices)
  - [22.1 Appendix A: Golden Test Vectors & Genesis Constants](#221-appendix-a-golden-test-vectors--genesis-constants)
  - [22.2 Appendix B: Standalone CLI Verifier Implementation (`verify_ledger.mjs`)](#222-appendix-b-standalone-cli-verifier-implementation-verify_ledgermjs)
  - [22.3 Appendix C: Document History & Revision Audit Trail](#223-appendix-c-document-history--revision-audit-trail)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) establishes the complete, binding, and verifiable engineering requirements for **Bayora Sentinel** (Version 1.2.0). Bayora Sentinel is a continuous cryptographic posture engine and fail-closed Zero Trust arbiter engineered to safeguard multi-tenant **Adversarial AI Safety Testing Environments**.

In frontier model evaluations, untrusted adversarial evaluation harnesses (Red Teams) deliberately execute prompt injections, multi-turn jailbreaks, model weight extraction routines, and tool-use exploits. Concurrently, the defensive evaluation control plane (Blue Team) maintains proprietary benchmarks, ground-truth scoring rubrics, and unreleased target models. Bayora Sentinel mathematically guarantees that these adversarial payloads cannot bleed across tenant boundaries, leak inference contexts, access host storage volumes, or compromise evaluation integrity.

### 1.2 Document Scope
This document covers:
1. Canonical serialization and deterministic SHA-256 environment fingerprinting under RFC 8785.
2. The five formal perimeter isolation guarantees ($G_1$–$G_5$) and their executable diagnostic probes ($T_{01}$–$T_{05}$).
3. The five-state deterministic assurance state machine governed by inviolable precedence rules.
4. Selective retesting optimization, achieving $\ge 70\%$ latency reduction without regression leakage.
5. The 7-stage cryptographic evidence protocol generating an append-only SHA-256 hash chain with HMAC-SHA256 signatures.
6. Dual-property evidence verification detecting both payload manipulation (`TAMPERED`) and block deletion (`INCOMPLETE`).
7. The Fail-Closed Zero Trust Evaluation Gate issuing signed attestation tickets (`TKT-BAYORA-...`) or actionable denial packages.
8. The Controlled Mutation Benchmark Lab ($M_1$–$M_5$, $B_1$).
9. The high-contrast, dual-theme Operator Workbench (Cyber-Defense Dark & Enterprise Light modes).
10. The 200-case automated test suite and standalone offline CLI verifier.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term / Acronym | Formal Definition |
| :--- | :--- |
| **Assurance State** | The real-time trust posture of an evaluation sandbox (`UNVERIFIED`, `VERIFIED`, `STALE`, `BREACHED`, `RECOVERING`). |
| **Blue Team** | The trusted defensive plane managing reference evaluation sets, scoring weights, gold rubrics, and proprietary target models. |
| **Canary Token** | A 128-bit synthetic UUID injected into model inference streams to detect multi-tenant memory or cache bleed ($0\text{ ppm}$ tolerance). |
| **CI/CA** | Continuous Integration / Continuous Assurance: an automated pipeline where infrastructure changes require cryptographic attestation before test payloads execute. |
| **Fail-Closed** | A non-negotiable security invariant where any state other than cryptographically certified `VERIFIED` results in default-deny enforcement. |
| **Genesis Hash** | A constant 64-character hexadecimal string of sixty-four zeroes (`0000000000000000000000000000000000000000000000000000000000000000`) anchoring sequence `#1`. |
| **HMAC-SHA256** | Keyed-Hash Message Authentication Code utilizing SHA-256, modeling Hardware Security Module (HSM) attestation checkpointing. |
| **KV-Cache** | Key-Value attention cache in LLM transformer inference engines. Shared KV-caches across sessions represent a high-severity context-bleed vulnerability. |
| **Negative Control ($B_1$)** | A benign modification to non-security parameters (e.g., container labels, display metadata) that must leave the cryptographic fingerprint invariant ($FPR = 0.0\%$). |
| **Red Team** | The untrusted adversarial evaluation workload executing automated jailbreaks, prompt subversions, and boundary penetration scripts. |
| **RFC 8785 (JCS)** | JSON Canonicalization Scheme: an IETF standard enforcing deterministic whitespace stripping and UTF-16 code-point lexicographical key sorting. |
| **Selective Retesting ($R$)** | A dependency-mapped optimization executing strictly the probes mapped to drifted guarantees, saving $\ge 70\%$ test latency. |
| **Zero Trust Gate** | An enforcement arbiter that gates execution of evaluation workloads based on real-time cryptographic attestation. |

### 1.4 References and Applicable Standards
1. **RFC 8785**: *JSON Canonicalization Scheme (JCS)*, Internet Engineering Task Force (IETF), 2020.
2. **NIST AI 100-1**: *Artificial Intelligence Risk Management Framework (AI RMF 1.0)*, National Institute of Standards and Technology, 2023.
3. **ISO/IEC 27001:2022**: *Information Security Management Systems — Requirements*, International Organization for Standardization.
4. **FIPS PUB 180-4**: *Secure Hash Standard (SHS)*, National Institute of Standards and Technology, 2015.
5. **RFC 2104**: *HMAC: Keyed-Hashing for Message Authentication*, IETF, 1997.
6. **OWASP Top 10 for LLM Applications v2.0**: *LLM02: Sensitive Information Disclosure*, *LLM06: Excessive Agency*, *LLM07: System Prompt Leakage*, 2025/2026.
7. **Center for Internet Security (CIS)**: *CIS Docker & Kubernetes Benchmark v1.8.0*.

### 1.5 Document Overview & Governance
This document is authored and maintained by the **Bayora Security Architecture Review Board (SARB)**. Any modifications to formal state machine transitions, cryptographic hashing algorithms, or precedence rules require formal review, mathematical validation, and consensus approval by SARB.

---

## 2. Product Overview

### 2.1 Product Perspective & Context
AI evaluation sandboxes are inherently high-risk environments. Unlike standard enterprise microservices where all containers are presumed benign or semi-trusted, adversarial safety testing environments deliberately run untrusted, hostile code. If a red-team evaluation payload breaks out of its sandbox or accesses a cross-tenant network bridge, it can exfiltrate pre-release model weights or bias evaluation scoring.

Traditional cloud security relies on point-in-time deployment audits. However, cloud infrastructure is dynamic: automated autoscalers, CI/CD pipelines, operator debugging sessions, and Kubernetes mutations alter bind mounts, IAM roles, and network security policies in real time. Bayora Sentinel acts as an active, continuous assurance overlay. It sits between infrastructure management and test harness orchestration, enforcing an unbreakable cryptographic verification loop.

```
+---------------------------------------------------------------------------------------------------+
|                                 BAYORA SENTINEL LOGICAL TOPOLOGY                                  |
|                                                                                                   |
|   +------------------------------------+               +--------------------------------------+   |
|   |         BLUE CONTROL PLANE         |               |           RED TEST HARNESS           |   |
|   | - Benchmark Datasets               |               | - Untrusted Jailbreak Scripts        |   |
|   | - Ground-Truth Scoring Rubrics     |               | - Prompt Injection Payloads          |   |
|   | - Evaluation Ground Truth          |               | - Model Extraction Attacks           |   |
|   +-----------------+------------------+               +------------------+-------------------+   |
|                     |                                                     |                       |
|                     | [Confidentiality Perimeter]                         |                       |
|                     +--------------------------+--------------------------+                       |
|                                                |                                                  |
|                                                v                                                  |
|             +------------------------------------------------------------------+                  |
|             |                       BAYORA SENTINEL LAYER                      |                  |
|             |  1. Canonical Manifest Normalization & SHA-256 Fingerprint       |                  |
|             |  2. Per-Guarantee Independent Digests (G1-G5)                    |                  |
|             |  3. Change-Aware Invalidation Engine (Real-Time TTD <= 8ms)      |                  |
|             |  4. Automated Boundary Diagnostic Probes (T01-T05)               |                  |
|             |  5. Decoupled Assurance State Machine (Precedence Rules 1-3)     |                  |
|             |  6. 7-Stage Append-Only SHA-256 Cryptographic Hash Chain         |                  |
|             |  7. Fail-Closed Zero Trust Evaluation Gate Arbiter               |                  |
|             +----------------------------------+-------------------------------+                  |
|                                                |                                                  |
+------------------------------------------------|--------------------------------------------------+
                                                 v
                       +-----------------------------------+
                       |      MODEL INFERENCE GATEWAY      |
                       |  - Strict Session Separation      |
                       |  - Isolated KV-Cache Contexts     |
                       |  - 0 ppm Canary Bleed Enforcement |
                       +-----------------------------------+
```

### 2.2 Problem Statement & Core Value Proposition
- **The Core Problem:** Security regressions occur silently. A single operator error (e.g., mounting `/data/tenants/blue` into a red runner, or setting `allowAnonymousAccess: true` on an S3 bucket) compromises an entire safety benchmark without failing traditional software unit tests.
- **The Solution:** Bayora Sentinel transforms passive compliance into active cryptographic gating. It guarantees that adversarial payloads run **only** when the sandbox's declared isolation guarantees are mathematically proven by current, untampered, and complete cryptographic evidence.

### 2.3 System Architecture & Logical Topology
Bayora Sentinel comprises seven tightly coupled architectural subsystems:
1. **Manifest Normalizer & Fingerprinting Core:** Ingests raw configurations, filters non-security metadata, applies RFC 8785 canonical serialization, and produces deterministic SHA-256 fingerprints.
2. **Per-Guarantee Digest Engine:** Computes independent hashes for five distinct isolation sub-manifests ($G_1$ to $G_5$).
3. **Change-Aware Invalidation Engine:** Detects configuration drift in real-time ($TTD \le 8\text{ ms}$), invalidating only the affected guarantee digests and flagging them as `STALE`.
4. **Diagnostic Probing Engine:** Houses non-destructive synthetic probes ($T_{01}$–$T_{05}$) mapped directly to each guarantee.
5. **Decoupled Assurance State Machine:** Manages posture transitions across five distinct states, decoupled into four orthogonal status dimensions.
6. **Dual-Property Cryptographic Ledger:** Generates an immutable, sequence-ordered SHA-256 hash chain with HMAC-signed checkpoints.
7. **Fail-Closed Policy Arbiter:** Issues cryptographically verifiable tickets (`TKT-BAYORA-...`) or actionable denial packages.

### 2.4 Product Functions Summary (F-01 to F-14)

| ID | Function Name | Scope / Description | Target Guarantee |
| :--- | :--- | :--- | :--- |
| **F-01** | RFC 8785 Normalization | Deterministic key sorting and whitespace stripping | All Manifests |
| **F-02** | Baseline Fingerprinting | 256-bit environment digest calculation | Environment State |
| **F-03** | Storage Isolation Probe ($T_{01}$) | Confines adversary runners to `/opt/red/workspace`; blocks Blue mounts | $G_1$ (Storage Isolation) |
| **F-04** | Network Microsegmentation Probe ($T_{02}$) | Ensures Red containers cannot bridge to private management subnets | $G_2$ (Network Isolation) |
| **F-05** | Storage API Authorization Probe ($T_{03}$) | Validates signed bearer tokens; rejects unauthenticated access | $G_3$ (API Authorization) |
| **F-06** | Model Gateway Bleed Probe ($T_{04}$) | Injects 128-bit canaries; guarantees 0 ppm cross-tenant context bleed | $G_4$ (Inference Confidentiality) |
| **F-07** | Workload Hardening Probe ($T_{05}$) | Enforces `readOnlyRootFilesystem`, dropped Linux caps, seccomp | $G_5$ (Workload Hardening) |
| **F-08** | Selective Retest Engine | Executes only invalidated probes upon drift, cutting latency by $\ge 70\%$ | $G_1$–$G_5$ |
| **F-09** | 7-Stage Hash Chain Logger | Cryptographically links all lifecycle events to `GENESIS_HASH` | Audit Ledger |
| **F-10** | Anti-Tamper Proof Verifier | Recomputes all hashes; validates pointer continuity and HMAC signatures | Ledger Integrity |
| **F-11** | Anti-Omission Plan Verifier | Validates executed events against `expected_plan` contract | Ledger Completeness |
| **F-12** | Fail-Closed Policy Gate | Enforces default-deny; emits cryptographic attestation tickets | Workload Execution |
| **F-13** | Controlled Mutation Benchmarks | Evaluates system against five deliberate security mutations ($M_1$–$M_5$) | Engine Self-Validation |
| **F-14** | Dual Theme Presentation Engine | Renders high-contrast dark/light UI with instant local persistence | User Experience |

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

### 3.3 Role-Based Authorization & Privilege Matrix

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
The system ingests structured configuration manifests representing container runtime parameters, network namespaces, storage IAM permissions, model gateway settings, and container security profiles.

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
1. **Full Verification Suite Trigger:** Command initiating sequential execution of all five diagnostic probes ($T_{01}$–$T_{05}$) and full 7-stage evidence logging.
2. **Selective Retest Trigger:** Command executing targeted probes for guarantees invalidated by drift.
3. **Evaluation Access Request:** Invocation from an evaluation harness requesting a cryptographic execution token from the Policy Gate.
4. **Audit Ledger Verification Trigger:** Command instructing the verifier to validate hash continuity, HMAC signatures, and plan completeness.
5. **External Ledger File Upload:** Raw JSON file uploaded by an auditor for offline independent verification.
6. **Theme Toggle Action:** UI event toggling visual theme (`light` or `dark`), persisted to `localStorage`.

### 4.3 Simulation & Benchmark Inputs ($M_1$–$M_5$, $B_1$)
1. **Mutation $M_1$ (Relax Storage Authz):** Sets `allowAnonymousAccess: true` in storage policy.
2. **Mutation $M_2$ (Cross-Tenant Mount Leak):** Injects `/data/tenants/blue/benchmarks` into red runner bind mounts.
3. **Mutation $M_3$ (Cross-Tenant Network Bridge):** Sets `crossTenantBridging: true` and adds `10.0.0.0/8` to allowed egress CIDRs.
4. **Mutation $M_4$ (Model Gateway Cache Sharing):** Sets `cacheShared: true` in model gateway settings.
5. **Mutation $M_5$ (Workload Hardening Relaxation):** Sets `readOnlyRootFilesystem: false` and `privileged: true`.
6. **Negative Control $B_1$ (Benign Metadata Change):** Modifies `metadata.labels.purpose` to `benign-ui-metadata-update`. Security fingerprint must remain identical ($FPR = 0.0\%$).
7. **Adversarial Ledger Tamper Injection:** Directly alters an event payload string (e.g., status `FAIL` to `PASS`) without recomputing cryptographic hashes.
8. **Adversarial Ledger Omission Injection:** Removes an intermediate `test.completed` block while maintaining outer block boundaries.

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

### 6.1 End-to-End Operational Lifecycle (8 Stages)

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

### 6.2 Inviolable Precedence Rules Lifecycle
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

### 7.9 FR-9: Controlled Mutation Lab & Benchmark Framework
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

### 8.7 Autonomous Fail-Closed Denial Enforcement
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

## 14. Mathematical & Cryptographic Foundations

### 14.1 Canonical State Function & Collision Resistance
Let $S$ denote the raw environment configuration state tuple:
$$S = (C, N, S_{\text{auth}}, M, \mathcal{M})$$
where $C$ is the container context, $N$ is the network context, $S_{\text{auth}}$ is the storage authorization context, $M$ is the model gateway context, and $\mathcal{M}$ is benign telemetry metadata.

We define the security normalization projection $\pi_{\text{sec}}(S) \to S^*$ by stripping all non-security metadata:
$$\pi_{\text{sec}}(S) = (C, N, S_{\text{auth}}, M)$$

The canonical transformation $\mathcal{C}: S^* \to \Sigma^*$ enforces RFC 8785 JSON Canonicalization Scheme (JCS):
1. **Key Ordering:** For every dictionary object $\{k_1: v_1, k_2: v_2, \dots, k_n: v_n\}$, keys are sorted such that $k_1 <_{\text{UTF-16}} k_2 < \dots < k_n$.
2. **Whitespace Invariance:** All insignificant whitespace (spaces, tabs, newlines outside string literals) is stripped.
3. **Number Representation:** Numbers conform to ECMAScript standard serialization without exponential notation for small integers.

The environment fingerprint $\Phi(S)$ is defined as:
$$\Phi(S) = \text{SHA-256}(\mathcal{C}(\pi_{\text{sec}}(S))) \in \{0, 1\}^{256}$$

**Theorem 1 (Benign Invariance):**  
Let $S$ and $S'$ be two configuration states differing strictly in metadata $\mathcal{M} \neq \mathcal{M}'$ while $\pi_{\text{sec}}(S) = \pi_{\text{sec}}(S')$. Then:
$$\Phi(S) = \Phi(S')$$
*Proof:* Since $\pi_{\text{sec}}(S) = \pi_{\text{sec}}(S')$, $\mathcal{C}(\pi_{\text{sec}}(S)) = \mathcal{C}(\pi_{\text{sec}}(S'))$. Determinism of SHA-256 implies $\Phi(S) = \Phi(S')$. Thus, False Positive Rate $FPR = 0.0\%$. $\blacksquare$

### 14.2 Hash Chain Induction & Monotonic Integrity Proof
Let $\mathcal{L} = (E_1, E_2, \dots, E_n)$ be an evidence event log sequence. Each event $E_k$ ($1 \le k \le n$) is defined as a 7-tuple:
$$E_k = (k, \text{run\_id}, t_k, \text{type}_k, P_k, h_{k-1}, h_k)$$
where $k \in \mathbb{N}$ is the monotonic sequence index, $t_k$ is the ISO 8601 timestamp ($t_k \ge t_{k-1}$), $P_k$ is the event payload dictionary, $h_{k-1}$ is the predecessor pointer, and $h_k$ is the cryptographic event hash.

The chain is inductively defined by:
$$h_0 = \text{GENESIS\_HASH} = 0^{64}$$
$$h_k = \text{SHA-256}\left( k \parallel \text{run\_id} \parallel t_k \parallel \text{type}_k \parallel \mathcal{C}(P_k) \parallel h_{k-1} \right), \quad \forall k \ge 1$$

**Theorem 2 (Tamper Detection Inductive Proof):**  
Suppose an adversary modifies any historical payload $P_j \to P_j'$ at index $j$ ($1 \le j < n$) where $P_j \neq P_j'$. If the adversary does not re-hash all subsequent blocks $k > j$, then the pointer continuity check fails at block $j+1$:
$$h_j' \neq h_{j+1}.\text{previous\_event\_hash}$$
If the adversary attempts to re-hash all subsequent blocks to restore pointer continuity up to block $n$, the root checkpoint signature $\sigma = \text{HMAC}_{K}(h_n)$ is invalidated because $h_n' \neq h_n$, and the adversary lacks key $K$. Thus, the chain is non-repudiable and tamper-evident under standard cryptographic assumptions. $\blacksquare$

### 14.3 Dependency Graph Theory for Selective Retesting
Let $\mathcal{G} = \{G_1, G_2, G_3, G_4, G_5\}$ be the set of isolation guarantees, and let $\mathcal{T} = \{T_{01}, T_{02}, T_{03}, T_{04}, T_{05}\}$ be the set of diagnostic probes. We define the bipartite dependency relation:
$$\mathcal{M}_{\text{dep}} \subseteq \mathcal{G} \times \mathcal{T}$$
In Bayora Sentinel, the mapping is bijective:
$$\forall G_i \in \mathcal{G}, \quad \exists! T_i \in \mathcal{T} \text{ such that } (G_i, T_i) \in \mathcal{M}_{\text{dep}}$$

Let $\Delta \subseteq \mathcal{G}$ be the set of drifted guarantees identified by differential digest comparison:
$$\Delta = \{G_i \in \mathcal{G} \mid D_{\text{current}}(G_i) \neq D_{\text{verified}}(G_i)\}$$

The selective test set $\mathcal{T}_{\text{sel}}$ is synthesized by:
$$\mathcal{T}_{\text{sel}} = \{T_i \in \mathcal{T} \mid \exists G_i \in \Delta \text{ such that } (G_i, T_i) \in \mathcal{M}_{\text{dep}}\}$$

Let $t(T_i)$ denote the execution duration of probe $T_i$. The total execution time of the full suite is:
$$T_{\text{full}} = \sum_{T \in \mathcal{T}} t(T)$$
The execution time of the selective retest is:
$$T_{\text{sel}} = \sum_{T \in \mathcal{T}_{\text{sel}}} t(T)$$
The selective retest efficiency metric $R$ is defined as:
$$R = 1 - \frac{T_{\text{sel}}}{T_{\text{full}}}$$
When a single guarantee drifts ($|\Delta| = 1$), assuming approximately uniform probe execution times $t(T_i) \approx \bar{t}$:
$$R = 1 - \frac{\bar{t}}{5\bar{t}} = 1 - 0.20 = 0.80 \quad (80\% \text{ latency savings})$$

### 14.4 Cryptographic Checkpoint Signing Model
To bind the audit chain to a hardware-rooted trust anchor without relying on vulnerable local storage, Bayora Sentinel issues cryptographic checkpoints:
$$\text{checkpoint\_payload} = \{\text{checkpoint\_id}, \text{run\_id}, \text{root\_event\_hash}, t\}$$
$$\text{message} = \text{checkpoint\_id} \parallel \text{run\_id} \parallel \text{root\_event\_hash} \parallel t$$
$$\Sigma_{\text{checkpoint}} = \text{HMAC-SHA256}(K_{\text{HSM}}, \text{message})$$
The verifier validates $\Sigma_{\text{checkpoint}}$ using the public identity key `secp256k1-hsm-signer-01`.

---

## 15. Threat Modeling & Attack Surface Analysis (STRIDE & MITRE ATT&CK)

### 15.1 STRIDE Threat Analysis Matrix

| STRIDE Category | Threat Description | Attack Vector / Mechanism | Bayora Sentinel Mitigation |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates a valid evaluation runner to obtain attestation ticket. | Forging container runner ID or injecting false manifest hashes. | RFC 8785 canonical digest enforcement; tickets bind to exact SHA-256 manifest hash. |
| **Tampering** | Operator or compromised pod alters past audit logs to hide an isolation breach. | Modifying `payload.status` from `FAIL` to `PASS` in audit JSON file. | Append-only SHA-256 hash chaining; any payload modification alters $h_k$ and breaks pointers. |
| **Repudiation** | Operator denies that an environment configuration drift took place. | Claiming that configuration matched baseline during an adversarial leak. | Immutable signed checkpoints bind configuration digest to timestamp and run ID. |
| **Information Disclosure** | Untrusted Red runner accesses proprietary Blue evaluation datasets. | Accidental container bind mount (`/data/tenants/blue`) or shared KV-cache context. | Diagnostic Probe $T_{01}$ (mount inspection) and $T_{04}$ (128-bit canary tokens, 0 ppm bleed). |
| **Denial of Service** | Red payload saturates network or exhausts storage to blind verification probes. | Fork-bombing or flooding internal management subnets. | Probe $T_{05}$ enforces dropped Linux capabilities (`CAP_SYS_ADMIN`), read-only rootfs, and cgroups. |
| **Elevation of Privilege** | Container runner breaks out of container to obtain root privileges on host. | Exploiting writable host filesystem mounts or added Linux capabilities. | Strict baseline invariant validation: `privileged: false`, `capabilitiesDropped: ["ALL"]`. |

### 15.2 MITRE ATT&CK for LLM / AI Infrastructure Matrix

| MITRE ATT&CK ID | Tactic / Technique | Real-World Scenario | Bayora Sentinel Defense |
| :--- | :--- | :--- | :--- |
| **AML.T0024** | *Model Inversion / Extraction* | Adversary extracts proprietary scoring model weights via cross-tenant storage access. | Probe $T_{03}$ rejects relaxed or anonymous S3 bucket access; verifies signed bearer tokens. |
| **AML.T0043** | *Craft Adversarial Data* | Red team executes prompt injection payloads designed to breach proxy boundaries. | Isolation guarantees $G_1$–$G_5$ confine payloads strictly to `/opt/red/workspace`. |
| **AML.T0048** | *Inference Context Exfiltration* | Adversary triggers LLM attention context leakage to read prior tenant prompts. | Probe $T_{04}$ injects 128-bit synthetic canaries; enforces 0 ppm context bleed in proxy cache. |
| **T1611** | *Escape to Host* | Attacker utilizes container volume mount to access sensitive host `/etc` or `/var` paths. | Probe $T_{01}$ validates that mounts have zero host root overlap and zero Blue path exposure. |
| **T1557** | *Adversary-in-the-Middle* | Red runner bridges into private management network to snoop blue evaluation traffic. | Probe $T_{02}$ asserts network microsegmentation; detects cross-tenant routing bridges. |

### 15.3 Blast Radius & Defense-in-Depth Model
Bayora Sentinel implements concentric defense-in-depth perimeters:
- **Layer 1: Manifest Normalization:** Invariant baseline checking at deployment time.
- **Layer 2: Continuous Fingerprint Invalidation:** Instant detection of drift ($TTD \le 8\text{ ms}$).
- **Layer 3: Diagnostic Boundary Probes:** Automated synthetic penetration testing ($T_{01}$–$T_{05}$).
- **Layer 4: Fail-Closed Zero Trust Gate:** Cryptographic denial of evaluation execution tickets.
- **Layer 5: Dual-Property Cryptographic Ledger:** Independent forensic proof for regulatory audit.

---

## 16. Formal Data Dictionary & JSON Schemas

### 16.1 SimulatedConfig Schema
```typescript
interface SimulatedConfig {
  container: {
    redRunnerId: string;
    blueEvaluationId: string;
    bindMounts: Array<{
      hostPath: string;
      containerPath: string;
      readonly: boolean;
    }>;
    capabilitiesDropped: string[];
    capabilitiesAdded: string[];
    readOnlyRootFilesystem: boolean;
    privileged: boolean;
    seccompProfile: string;
  };
  network: {
    networkNamespace: string;
    egressAllowedCIDRs: string[];
    crossTenantBridging: boolean;
    allowHostNetwork: boolean;
    dnsIsolated: boolean;
  };
  storageAuth: {
    bucketName: string;
    requiredScope: string;
    assignedRole: string;
    allowAnonymousAccess: boolean;
    tokenTtlSeconds: number;
  };
  modelGateway: {
    gatewayEndpoint: string;
    sessionIsolation: boolean;
    cacheShared: boolean;
    canaryTokens: string[];
  };
  metadata: {
    environmentId: string;
    cluster: string;
    region: string;
    labels: Record<string, string>;
  };
}
```

### 16.2 EvidenceEvent Schema
```typescript
interface EvidenceEvent {
  sequence: number;                                      // Monotonic sequence index 1..N
  run_id: string;                                        // Unique evaluation run identifier
  timestamp: string;                                     // ISO 8601 UTC timestamp
  event_type:                                            // Declared 7-stage lifecycle event type
    | 'run.started'
    | 'manifest.captured'
    | 'test.started'
    | 'test.completed'
    | 'policy.decision'
    | 'checkpoint.signed'
    | 'run.completed';
  payload: Record<string, any>;                          // Canonical event payload
  previous_event_hash: string;                           // SHA-256 pointer to predecessor
  event_hash: string;                                    // SHA-256 hash over block contents
}
```

### 16.3 DecoupledAssuranceSnapshot Schema
```typescript
interface DecoupledAssuranceSnapshot {
  run_id: string;
  environment_id: string;
  manifest_digest: string;
  configuration_status: 'BASELINE' | 'DRIFTED' | 'REMEDIATED';
  policy_test_status: 'PASS' | 'FAIL' | 'PENDING';
  evidence_integrity_status: 'VALID' | 'TAMPERED' | 'UNCHECKED';
  evidence_completeness_status: 'COMPLETE' | 'INCOMPLETE' | 'UNCHECKED';
  assurance_state: 'UNVERIFIED' | 'VERIFIED' | 'STALE' | 'BREACHED' | 'RECOVERING';
  drift_details: {
    affected_guarantees: GuaranteeId[];
    required_retests: TestId[];
  };
  gate_evaluation: {
    decision: 'GRANTED' | 'DENIED';
    reasons: string[];
    required_retests: TestId[];
    ticket_id?: string;
  };
}
```

### 16.4 ChainVerificationReport Schema
```typescript
interface ChainVerificationReport {
  status: 'VALID' | 'TAMPERED' | 'INCOMPLETE';
  validCount: number;
  totalEvents: number;
  signatureValid: boolean;
  brokenSequenceIndex?: number;
  discrepancy?: {
    expectedHash: string;
    actualHash: string;
  };
  missingEvents?: string[];
  errorMessage?: string;
}
```

### 16.5 EvaluationTicket Schema
```typescript
interface EvaluationTicket {
  ticketId: string;                     // e.g. TKT-BAYORA-49599CAC-OK
  decision: 'GRANTED' | 'DENIED';
  timestamp: string;
  currentFingerprint: string;
  verifiedFingerprint?: string | null;
  reasons: string[];
  requiredTests: TestId[];
}
```

---

## 17. Diagnostic Probes Deep Technical Specification ($T_{01}$–$T_{05}$)

### 17.1 Probe $T_{01}$: Filesystem Boundary & Mount Containment
- **Target Guarantee:** $G_1$ (Storage Isolation).
- **Execution Target:** Red runner container mount namespace (`/proc/mounts`).
- **Pre-Conditions:** Container runtime active; mount namespaces mapped.
- **Probe Logic:**
  1. Inspect all active bind mount tuples $(H_p, C_p, \text{ro})$.
  2. Evaluate invariant: $\forall (H_p, C_p), \quad H_p \cap \text{BluePath} = \emptyset$.
  3. Validate containment: $C_p \subseteq \text{"/opt/red/workspace"}$.
- **Exit Criteria:** Returns `PASS` if no blue directories (e.g., `/data/tenants/blue`) or host root paths are mounted; otherwise `FAIL`.

### 17.2 Probe $T_{02}$: Network Microsegmentation & Namespace Isolation
- **Target Guarantee:** $G_2$ (Network Isolation).
- **Execution Target:** Linux `netns` routing table and `iptables` / Cilium eBPF egress rules.
- **Pre-Conditions:** Isolated veth pair provisioned; egress CIDR policies attached.
- **Probe Logic:**
  1. Verify `crossTenantBridging == false`.
  2. Synthetic egress probe: Dispatch synthetic SYN packet to Blue control plane IP (`10.0.10.5:443`).
  3. Verify packet is dropped or rejected by network filter.
- **Exit Criteria:** Returns `PASS` if egress probe is blocked and bridging is false; returns `FAIL` if Blue subnet is reachable.

### 17.3 Probe $T_{03}$: Storage Object Scope & Signed Token Authorization
- **Target Guarantee:** $G_3$ (Storage API Authorization).
- **Execution Target:** S3-compatible evaluation artifact bucket.
- **Pre-Conditions:** IAM bucket policy active; token validation service reachable.
- **Probe Logic:**
  1. Issue synthetic unauthenticated HTTP GET request to `/ai-eval-artifacts-us-east-1/blue-gold-rubric.json`.
  2. Verify response status is HTTP 403 Forbidden.
  3. Issue valid signed request with `read:red-artifacts` scope; verify response is HTTP 200 OK.
  4. Assert `allowAnonymousAccess == false`.
- **Exit Criteria:** Returns `PASS` if anonymous access is denied and role scopes hold; returns `FAIL` if anonymous request succeeds.

### 17.4 Probe $T_{04}$: Model Gateway KV-Cache & Canary Bleed Detection
- **Target Guarantee:** $G_4$ (Model Gateway Confidentiality).
- **Execution Target:** Shared LLM Inference Gateway endpoint.
- **Pre-Conditions:** Model proxy active; session context isolation enabled.
- **Probe Logic:**
  1. Blue session initiates prompt containing 128-bit canary token $\kappa_B \in \{0, 1\}^{128}$.
  2. Red session executes concurrent prompt injection query requesting memory recall.
  3. Inspect Red session output stream for occurrence of $\kappa_B$.
  4. Measure cross-tenant context bleed concentration.
- **Exit Criteria:** Returns `PASS` if canary bleed concentration is exactly $0\text{ ppm}$; returns `FAIL` if $\kappa_B$ is detected in Red output.

### 17.5 Probe $T_{05}$: Workload Hardening & Capability Containment
- **Target Guarantee:** $G_5$ (Workload Hardening).
- **Execution Target:** OCI container runtime specification (`config.json`).
- **Pre-Conditions:** Target container spawned.
- **Probe Logic:**
  1. Assert `readOnlyRootFilesystem == true`.
  2. Assert `privileged == false`.
  3. Assert `capabilitiesDropped` contains `"ALL"`.
  4. Assert `capabilitiesAdded` is empty (`[]`).
  5. Assert seccomp profile is `runtime/default` or stricter.
- **Exit Criteria:** Returns `PASS` if all hardening invariants hold; returns `FAIL` if rootfs is writable or privileges are elevated.

---

## 18. Operational Runbooks & Incident Response Playbooks

### 18.1 Runbook RB-01: Triaging a BREACHED Perimeter Alert
- **Incident Description:** An automated probe has failed ($T_i = \text{FAIL}$), triggering an immediate transition to `BREACHED` and locking the policy gate.
- **Severity:** High / P1.
- **Action Steps:**
  1. **Immediate Quarantine:** Verify that the Fail-Closed Policy Gate has denied all evaluation access. Active runner processes must be paused.
  2. **Inspect Diagnostic Output:** Open the Policy Gate Arbiter tab and read the specific failure reason (e.g., `Active boundary failure on G2 (T02: Network bridge active)`).
  3. **Isolate Compromised Node:** Query the node ID and cordon the Kubernetes node: `kubectl cordon <node-id>`.
  4. **Perform Invariant Audit:** Compare live container inspect output against `BASELINE_CONFIG`.
  5. **Remediate Configuration:** Apply configuration fix via Terraform / GitOps pipeline.

### 18.2 Runbook RB-02: Remediating Configuration Drift (STALE to VERIFIED)
- **Incident Description:** A runtime configuration mutation occurred without a probe failure, shifting posture to `STALE`.
- **Severity:** Medium / P2.
- **Action Steps:**
  1. Review drifted guarantees in the Guarantees Matrix ($G_1$–$G_5$).
  2. If the configuration change was unauthorized: revert infrastructure to baseline. Posture will shift to `RECOVERING`.
  3. If the configuration change was intentional and authorized: initiate baseline update review.
  4. Click **Run Selective Retest** to execute the targeted diagnostic probes.
  5. Confirm that probes pass and assurance transitions to `VERIFIED`.

### 18.3 Runbook RB-03: Handling Tampered or Incomplete Audit Ledgers
- **Incident Description:** Independent ledger verification failed with status `TAMPERED` or `INCOMPLETE`.
- **Severity:** Critical / P0 (Potential Forensic Breach).
- **Action Steps:**
  1. Trigger immediate emergency lockdown. All active attestation tickets are revoked.
  2. Run standalone verifier with debug output: `node scripts/verify_ledger.mjs --verbose`.
  3. Identify `brokenSequenceIndex`:
     - If `TAMPERED`: compare recorded event payload against predecessor pointer to identify unauthorized block alteration.
     - If `INCOMPLETE`: inspect `missingEvents` array against the initial `expected_plan`.
  4. Export forensic ledger dump and preserve cluster audit logs for formal incident investigation.

### 18.4 Runbook RB-04: Emergency Fail-Closed Quarantine Procedure
- **Trigger:** Suspicious lateral movement detection or active security advisory.
- **Action Steps:**
  1. Access the Operator Workbench and click **Simulate Ledger Tampering** or manually invoke quarantine API.
  2. Verify that `assurance_state` shifts to `UNVERIFIED`.
  3. Confirm that the Zero Trust Policy Gate displays `ACCESS DENIED · FAIL-CLOSED`.
  4. Ensure zero jailbreak evaluation workloads are admitted until SARB cryptographic re-certification.

---

## 19. Regulatory & Security Standards Compliance Mapping

### 19.1 NIST AI RMF 1.0 Alignment

| NIST AI RMF Function | Category | Bayora Sentinel Technical Implementation |
| :--- | :--- | :--- |
| **GOVERN 1.2** | Trustworthy AI Policies | Inviolable Precedence Rules formalize policy boundaries into executable code. |
| **MAP 1.5** | AI System Boundaries | RFC 8785 canonical manifests strictly delineate Red vs. Blue sandbox boundaries. |
| **MEASURE 2.6** | Robustness & Security Verification | Diagnostic Probes ($T_{01}$–$T_{05}$) continuously test perimeter resilience against mutations. |
| **MEASURE 2.11** | Transparent Auditability | Append-only SHA-256 hash chains provide independent verifiable evidence of isolation. |
| **MANAGE 2.4** | Incident Response & Fail-Safe Controls | Fail-Closed Zero Trust Gate arbiter terminates untrusted access upon drift or breach. |

### 19.2 ISO/IEC 27001:2022 Annex A Controls

| ISO 27001 Control | Control Name | Bayora Sentinel Fulfillment |
| :--- | :--- | :--- |
| **A.8.9** | Configuration Management | Continuous baseline fingerprinting ($\Phi$) prevents silent security configuration drift. |
| **A.8.15** | Logging | 7-Stage Cryptographic Evidence Protocol creates immutable, sequence-ordered event blocks. |
| **A.8.20** | Network Security | Probe $T_{02}$ asserts microsegmentation between adversarial and benchmark subnets. |
| **A.8.26** | Application Security Requirements | Strict workload hardening (read-only rootfs, dropped capabilities) verified via $T_{05}$. |

### 19.3 SOC 2 Type II Trust Services Criteria

| Criteria | Objective | Technical Fulfillment in Bayora Sentinel |
| :--- | :--- | :--- |
| **CC6.1** | Logical Access Controls | Policy Gate enforces default-deny; emits cryptographic tickets for verified sandboxes. |
| **CC6.6** | Perimeter Protection | Multi-boundary diagnostic probes ($T_{01}$–$T_{05}$) continuously assert isolation barriers. |
| **CC7.2** | System Monitoring & Anomaly Detection | Real-time drift detection identifies configuration drift within $TTD \le 8\text{ ms}$. |
| **PI1.2** | Processing Integrity & Audit Trails | Dual-property hash chain verification detects both payload tampering and block omissions. |

### 19.4 OWASP Top 10 for Large Language Models (LLM AI)
- **LLM02: Sensitive Information Disclosure:** Mitigated by Probe $T_{01}$ (preventing mount access to Blue benchmarks) and Probe $T_{04}$ (enforcing 0 ppm canary token bleed across inference sessions).
- **LLM06: Excessive Agency:** Mitigated by Probe $T_{05}$ (enforcing dropped capabilities `["ALL"]` and read-only root filesystems).
- **LLM07: System Prompt & Rubric Leakage:** Mitigated by Probe $T_{03}$ (enforcing strict bearer token authorization on storage buckets containing scoring rubrics).

---

## 20. Deployment Topologies & Infrastructure Architectures

### 20.1 Standalone Evaluation Sandbox Architecture
In single-node or local research environments:
- Bayora Sentinel runs as an integrated evaluation controller.
- Evaluates local Docker/containerd container boundaries via socket inspection.
- Emits verification ledgers directly to local disk for offline verification.

### 20.2 Kubernetes Multi-Tenant Evaluation Cluster Topology
In enterprise multi-tenant Kubernetes clusters:
- **Red Workloads:** Scheduled in dedicated tainted node pools (`node-role.kubernetes.io/red-runner:NoSchedule`) with network policies blocking east-west traffic.
- **Blue Workloads:** Scheduled in private, encrypted control-plane nodes.
- **Bayora Sentinel DaemonSet / Operator:** Monitors Kubernetes CRI runtime specs, computes manifests via CRD controllers, and exposes admission webhooks to enforce fail-closed gating.

### 20.3 Zero-Trust Sidecar & Model Proxy Gateway Topology
- Model inference requests route through a dedicated Envoy/Nginx proxy sidecar.
- The sidecar queries Bayora Sentinel's policy gate via mTLS before forwarding prompts to the frontier model endpoint.
- If the ticket is invalid or the sandbox is `STALE`/`BREACHED`, the proxy drops the connection with HTTP 403 Forbidden.

---

## 21. 200-Case Automated Verification Benchmark Architecture

### 21.1 Benchmark Suite Breakdown (200 Test Cases)
The platform is validated against an exhaustive 200-case automated test suite (`scripts/test_200_cases.mjs`), categorized into eight test domains:

```
+---------------------------------------------------------------------------------------------------+
|                        200-CASE RIGOROUS TEST SUITE ARCHITECTURE                                  |
+---------+----------------------------------------------------+------------+-----------------------+
| Domain  | Test Focus Area                                    | Cases      | Target Invariants     |
+---------+----------------------------------------------------+------------+-----------------------+
| DOM-01  | Canonical JSON Normalization & RFC 8785 JCS        | 001 - 025  | Key sorting, whitespace|
| DOM-02  | Guarantee Digest Mapping & Independent Hashes      | 026 - 050  | G1-G5 hash isolation  |
| DOM-03  | Automated Diagnostic Probing Matrix (T01-T05)      | 051 - 080  | Multi-boundary probes |
| DOM-04  | Assurance State Transitions & Precedence Rules     | 081 - 110  | Inviolable Rules 1-3  |
| DOM-05  | Selective Retesting Optimization (R >= 70%)        | 111 - 135  | Latency & DAG targets |
| DOM-06  | 7-Stage Cryptographic Evidence Protocol            | 136 - 165  | Genesis hash to stage7|
| DOM-07  | Ledger Tamper Detection & Anti-Omission            | 166 - 190  | Dual-property audits  |
| DOM-08  | Fail-Closed Policy Gate & Attestation Issuance     | 191 - 200  | Ticket revocation     |
+---------+----------------------------------------------------+------------+-----------------------+
| TOTAL   | Rigorous Automated Verification Benchmark          | 200 Tests  | 100% Pass Required    |
+---------+----------------------------------------------------+------------+-----------------------+
```

### 21.2 Negative Control Validation ($B_1$)
To guarantee zero false positives, the benchmark includes synthetic negative controls ($B_1$):
- Modifying non-security metadata (e.g., container UI labels, description fields).
- Asserting that $D(G_i)_{\text{after}} = D(G_i)_{\text{before}}$ for all $i \in \{1..5\}$.
- Asserting that $\Phi(S)_{\text{after}} = \Phi(S)_{\text{before}}$.
- Asserting that False Positive Rate $FPR = 0.0\%$.

### 21.3 CI/CA Automated Pipeline Integration
The test suite executes via standard npm lifecycle scripts:
```bash
npm run test:200      # Executes full 200-case automated benchmark suite
npm run verify        # Executes standalone CLI ledger verifier on output JSON
npm run lint          # Validates code style and syntax via oxlint
npm run build         # Validates strict TypeScript compilation and Vite packaging
```

---

## 22. Appendices

### 22.1 Appendix A: Golden Test Vectors & Genesis Constants
- **`GENESIS_HASH` Constant:**
  `0000000000000000000000000000000000000000000000000000000000000000`
- **Baseline Configuration Fingerprint:**
  `49599cacb85c0775eec04a5a8e9df899998a848006a53fa4d71be9d554f6453b`
- **HSM Checkpoint Key ID:**
  `secp256k1-hsm-signer-01`
- **Default Evaluation Environment ID:**
  `eval-sandbox-us-east`

### 22.2 Appendix B: Standalone CLI Verifier Implementation (`verify_ledger.mjs`)
The repository includes an independent CLI script (`scripts/verify_ledger.mjs`) with zero external runtime dependencies. It enables auditors to verify downloaded audit logs offline:
```bash
node scripts/verify_ledger.mjs ./path/to/audit_ledger.json
```
The script validates:
1. Block-by-block SHA-256 recomputation.
2. Monotonic pointer continuity.
3. Monotonic sequence numbering.
4. HMAC checkpoint signatures.
5. `expected_plan` completeness against executed probes.

### 22.3 Appendix C: Document History & Revision Audit Trail

| Version | Date | Author / SARB Sign-off | Description of Changes |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 13 Oct 2026 | SARB Core Architecture | Initial Formal Software Requirements Specification baseline. |
| **1.1.0** | 13 Oct 2026 | SARB Implementation Team | Added 200-case benchmark alignment, Light Theme specifications, and Decoupled Schema. |
| **1.2.0** | 13 Oct 2026 | SARB Technical Directorate | Deep expansion: Added Mathematical Formalisms, STRIDE / MITRE ATT&CK Matrix, Data Dictionary, Diagnostic Probe Deep Specs, Operational Runbooks, and Standards Mapping. |

---

**End of Software Requirements Specification**  
*Maintained under cryptographic version control by the Bayora Security Architecture Review Board.*
