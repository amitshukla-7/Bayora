# Bayora Intelligence Center — Link & Identifier Validation Audit

> **Document:** `LINK_VALIDATION_AUDIT.md`  
> **Status:** Diagnosed & Documented  
> **Date:** October 30, 2026  
> **Subject:** Input Surfaces, SSRF Vulnerabilities, URI Schemes, and Entity Verification

---

## 1. Inventory of User Input Fields Accepting URLs & Identifiers

| Input Field | API Route | Component / Location | Current Server Validation | Vulnerability / Deficiency |
|---|---|---|---|---|
| **Model Endpoint URL** | `POST /api/models`<br>`PATCH /api/models/:id` | `ModelsPage.tsx` (Manual Adapter form) | `z.string().optional()` in `server/models/service.mjs:27` | **Critical SSRF Risk:** Accepts any arbitrary scheme (`file://`, `javascript:`, `ftp://`), loopback, cloud metadata (`169.254.169.254`), and private networks. No WHATWG URL parsing. |
| **Ollama Model Tag** | `POST /api/models/pull-ollama` | `ModelsPage.tsx` (Ollama Pull form) | `if (!tag.trim())` | No grammar validation. Accepts path traversal (`../../tag`), command injection attempts, or malformed repository syntax. |
| **Hugging Face Repo ID** | `POST /api/models/import-hf` | `ModelsPage.tsx` (HF Import form) | `if (!body.repoId)` | No regex validation. Appends unescaped input to `https://huggingface.co/api/models/${repoId}`. Does not enforce `^[A-Za-z0-9][A-Za-z0-9._-]{0,95}/[A-Za-z0-9][A-Za-z0-9._-]{0,95}$`. |
| **Remote GGUF Download** | `server/models/service.mjs` | Planned remote import | None | Unchecked URLs could download multi-gigabyte files or malicious payloads. |
| **Dataset Source URLs** | `POST /api/datasets/upload`<br>`scripts/fetch_datasets.mjs` | `DatasetsPage.tsx` | None | Does not validate hostname or protocol allowlist. |
| **Outbound Documentation Links** | `ModelsPage.tsx`<br>`SecurityPage.tsx` | Model & Policy detail drawers | None | Renders unverified links; lacks explicit `rel="noopener noreferrer"`. |

---

## 2. Test Matrix: Security Test Vectors & Existing System Behavior

The following evaluation details the exact response of the current system against each required security test vector:

| # | Test Vector | Input Example | Current System Response | Security Risk | Required Hardened Behavior |
|---|---|---|---|---|---|
| 1 | **JavaScript URI** | `javascript:alert(1)` | Accepted by Zod (`z.string()`); stored in SQLite. | **XSS:** Client-side execution if rendered in `href`. | **REJECT (HTTP 400):** Only `https:` and allowlisted `http:` permitted. |
| 2 | **Data URI** | `data:text/html,<script>alert(1)</script>` | Stored as string in SQLite. | **XSS / Content Injection:** Can bypass browser cross-origin controls. | **REJECT (HTTP 400):** Disallow `data:` scheme. |
| 3 | **File URI** | `file:///etc/passwd`<br>`file:///C:/Windows/win.ini` | Stored in DB; if fetched via Node `fetch`, throws protocol error or accesses local FS. | **LFI / Arbitrary File Read:** Direct local filesystem compromise. | **REJECT (HTTP 400):** Disallow `file:` scheme. |
| 4 | **FTP / Gopher URI** | `ftp://rogue-server.com/payload` | Stored in DB. | **Protocol Smuggling / SSRF:** Relay attacks via legacy protocols. | **REJECT (HTTP 400):** Whitelist only `https:` and local `http:`. |
| 5 | **IPv4 Loopback** | `http://127.0.0.1:8080/admin` | Stored and fetched during verification. | **SSRF:** Probe internal developer daemons and non-public services. | **REJECT (HTTP 400):** Loopback blocked unless explicitly allowlisted in server config. |
| 6 | **Named Loopback** | `http://localhost:3000` | Stored and fetched. | **SSRF:** Unrestricted access to local service endpoints. | **REJECT (HTTP 400):** Must match explicit allowlist for local Ollama. |
| 7 | **Cloud Metadata IP** | `http://169.254.169.254/latest/meta-data/` | Stored and fetched. | **Critical SSRF:** AWS/GCP/Azure instance credential and IAM role theft. | **REJECT (HTTP 400):** Disallow link-local `169.254.0.0/16`. |
| 8 | **IPv6 Loopback** | `http://[::1]:8080` | Stored and fetched. | **SSRF:** IPv6 bypass of IPv4-only firewall rules. | **REJECT (HTTP 400):** Disallow `::1` and IPv6 private blocks. |
| 9 | **Hex Encoded IP** | `http://0x7f.0.0.1` | Stored; Node network stack resolves to `127.0.0.1`. | **Filter Evasion SSRF:** Bypasses simple regex `127.0.0.1`. | **REJECT (HTTP 400):** Canonicalize IP representations before checking. |
| 10 | **Decimal / Octal IP** | `http://2130706433`<br>`http://0177.0.0.1` | Resolves to `127.0.0.1`. | **Filter Evasion SSRF:** Integer conversion evasion. | **REJECT (HTTP 400):** Canonicalize IP formats; block integer notation. |
| 11 | **DNS Rebinding** | Domain resolving to `10.0.0.5` | DNS resolution at fetch time connects to internal RFC 1918 host. | **Intranet Penetration:** Access private corporate databases. | **REJECT (HTTP 400):** Resolve IP prior to connection; pin IP for fetch. |
| 12 | **Internal Open Redirect** | `https://external.com/redir?url=http://127.0.0.1` | Node `fetch` follows redirect to loopback. | **SSRF via Redirect:** Bypasses initial hostname check. | **REJECT (HTTP 400):** Re-validate IP on every redirect hop; cap hops $\le 3$. |
| 13 | **Embedded Credentials** | `https://admin:pass@api.openai.com` | Accepted; stores credentials in plaintext database. | **Credential Leakage:** Credentials logged in plaintext or forwarded in Referer. | **REJECT (HTTP 400):** Disallow `user:pass@` in URLs. |
| 14 | **Overlong String** | URL length > 2,048 chars | Stored without length limit. | **DoS / Buffer Exhaustion:** Database bloat and regex catastrophic backtracking. | **REJECT (HTTP 400):** Enforce hard limit (max 2,048 chars). |
| 15 | **Unicode Homoglyphs** | `https://huggingfаce.co/model` (Cyrillic а) | Fetches rogue lookalike domain. | **Typosquatting / Phishing:** Exploits IDN visual spoofing. | **REJECT (HTTP 400):** Convert to Punycode and assert authorized provider allowlist. |
| 16 | **Nonexistent Domain** | `https://nonexistent-bayora-test-999.xyz` | Fails inside verification pipeline with generic error. | **Orphaned / Broken Models:** Creates unverified model entries. | **REJECT (HTTP 400):** Verification checks DNS existence and marks FAILED. |
| 17 | **Non-Model URL (HTML)** | `https://example.com/` | Model verification checks ping, but fails smoke test. | **Type Mismatch:** Non-API endpoint registered as model. | **REJECT (HTTP 400):** Require OpenAI-compatible or Ollama JSON schema response. |
| 18 | **Nonexistent HF Repo** | `meta-llama/NonExistentModel-999` | HF API returns 404; handled by try/catch. | **Dangling References:** Model created in unusable state. | **REJECT (HTTP 404):** Return structured error before creating model record. |

---

## 3. Architecture for Phase 3 Shared Validation Layer

To eliminate all 18 security gaps and provide reusable protection across the platform:

```
[Incoming Request]
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ server/security/urlValidator.mjs                             │
│                                                             │
│  1. WHATWG Syntax & Scheme Parse (https / approved http)    │
│  2. Credentials & Length Gate (No userinfo, len <= 2048)    │
│  3. Unicode / Punycode Canonicalization                     │
│  4. DNS Pre-Resolution & SSRF Boundary Check                │
│     - Block 127.0.0.0/8, ::1                                │
│     - Block 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16       │
│     - Block 169.254.0.0/16 (Cloud Metadata)                 │
│     - Block Decimal / Octal / Hexadecimal IP aliases        │
│  5. Safe Pinning HTTP Client (validatedFetch)               │
│     - Pinned IP socket connection (defeats DNS rebinding)   │
│     - Redirect hop re-validation (max 3 hops, no downgrade) │
│     - Strict timeout (5,000ms) and response cap (5MB)       │
└─────────────────────────────────────────────────────────────┘
```

