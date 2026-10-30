# Security Policy & Responsible Vulnerability Disclosure

Bayora Intelligence Center (powered by SentinelFlow) takes the security and integrity of our AI governance platform seriously. We welcome responsible security research and disclosure.

---

## 1. Supported Versions

We provide security updates and patches for the following versions:

| Version | Supported          | Release Channel |
| :------ | :----------------- | :-------------- |
| 1.x.x   | :white_check_mark: | Active (Current)|
| < 1.0.0 | :x:                | Deprecated      |

---

## 2. Reporting a Vulnerability

If you discover a potential security vulnerability within the Bayora platform, please report it to our security engineering team immediately:

- **Email**: `security@bayora.enterprise`
- **PGP Key**: Fingerprint available via our security portal or `.well-known/security.txt`.
- **Subject**: `[SECURITY VULNERABILITY] <Component / Vector Summary>`

### What to Include in Your Report
To help us triage and remediate the issue rapidly, please provide:
1. A clear description of the vulnerability, including affected endpoints, components, or algorithms.
2. Step-by-step reproduction instructions or a minimal proof of concept (PoC).
3. The potential impact (e.g., bypass of deterministic grading, tamper-chain forgery, privilege escalation).
4. Any proposed mitigations or code patches.

---

## 3. Vulnerability Response Timeline

- **Initial Acknowledgment**: Within 24 hours of receipt.
- **Triage & Reproduction**: Within 72 hours.
- **Patch Development & Validation**: Within 7 business days for Critical/High issues.
- **Public Disclosure**: Coordinated after the fix has been deployed across certified release channels.

---

## 4. Responsible Disclosure Guidelines

We ask researchers to adhere to responsible disclosure principles:
- **Do not** attempt to degrade service availability (e.g. volumetric DoS).
- **Do not** access or exfiltrate customer data or private tenant records.
- **Do not** disclose the vulnerability publicly before a coordinated fix is released.
- Give our engineering team a reasonable window to remediate before public discussion.

---

## 5. Security Architecture Invariants

Bayora adheres strictly to the **"AI Explains, Math Decides"** paradigm:
- **Deterministic Grading**: All policy checks (POL-001 through POL-005) are evaluated deterministically via string and regex oracles.
- **Cryptographic Attestation**: All audit records are chained via SHA-256 and signed with ECDSA P-256.
- **Fail-Closed**: Any unverified or errored model execution defaults to `ERRORED` or `UNVERIFIED` rather than passing silently.

