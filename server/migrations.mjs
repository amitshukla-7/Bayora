/**
 * Bayora Intelligence Center — Versioned Database Migrations
 * Pure SQLite schema migrations with strict trigger enforcement.
 */

export const MIGRATIONS = [
  {
    version: 1,
    name: '001_core_schema',
    up: (db) => {
      // 1. Models Registry
      db.exec(`
        CREATE TABLE IF NOT EXISTS models (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          provider TEXT NOT NULL,
          identifier TEXT NOT NULL,
          version TEXT NOT NULL DEFAULT '1.0.0',
          description TEXT NOT NULL DEFAULT '',
          model_type TEXT NOT NULL DEFAULT 'Instruct LLM',
          execution_mode TEXT NOT NULL DEFAULT 'Live', -- Live, Ollama, OpenAI-Compatible, Simulation
          endpoint TEXT,
          status TEXT NOT NULL DEFAULT 'Active',
          registered_at TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
      `);

      // 2. Datasets
      db.exec(`
        CREATE TABLE IF NOT EXISTS datasets (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          version TEXT NOT NULL,
          sha256 TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          total_cases INTEGER NOT NULL DEFAULT 0,
          categories TEXT NOT NULL DEFAULT '[]', -- JSON array of categories
          is_builtin INTEGER NOT NULL DEFAULT 0,
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 3. Dataset Test Cases
      db.exec(`
        CREATE TABLE IF NOT EXISTS dataset_cases (
          id TEXT PRIMARY KEY,
          dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
          category TEXT NOT NULL,
          prompt TEXT NOT NULL,
          expected_behavior TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'Medium', -- Critical, High, Medium, Low
          evaluation_method TEXT NOT NULL DEFAULT 'Policy Check',
          reference_response TEXT,
          is_adversarial INTEGER NOT NULL DEFAULT 1,
          metadata TEXT DEFAULT '{}',
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
      `);

      // 4. Evaluation Runs
      db.exec(`
        CREATE TABLE IF NOT EXISTS eval_runs (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          dataset_id TEXT REFERENCES datasets(id),
          model_id TEXT NOT NULL REFERENCES models(id),
          model_identifier TEXT NOT NULL,
          status TEXT NOT NULL, -- QUEUED, RUNNING, COMPLETED, FAILED, ABORTED
          total_cases INTEGER NOT NULL DEFAULT 0,
          passed_count INTEGER NOT NULL DEFAULT 0,
          warning_count INTEGER NOT NULL DEFAULT 0,
          failed_count INTEGER NOT NULL DEFAULT 0,
          execution_duration_ms INTEGER NOT NULL DEFAULT 0,
          seed INTEGER NOT NULL DEFAULT 42,
          temperature REAL NOT NULL DEFAULT 0.0,
          concurrency INTEGER NOT NULL DEFAULT 1,
          policy_pack_version TEXT NOT NULL DEFAULT '1.0.0',
          config_fingerprint TEXT,
          git_commit TEXT,
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          completed_at TEXT
        );
      `);

      // 5. Evaluation Cases (Granular Per-Prompt Executions)
      db.exec(`
        CREATE TABLE IF NOT EXISTS eval_cases (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
          case_id TEXT,
          model_id TEXT NOT NULL,
          category TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'Medium',
          is_adversarial INTEGER NOT NULL DEFAULT 1,
          prompt_hash TEXT NOT NULL,
          prompt TEXT NOT NULL,
          response_hash TEXT NOT NULL,
          raw_response TEXT NOT NULL,
          truncated_response TEXT NOT NULL,
          tool_calls TEXT DEFAULT '[]',
          latency_ms REAL NOT NULL DEFAULT 0,
          tokens_prompt INTEGER NOT NULL DEFAULT 0,
          tokens_completion INTEGER NOT NULL DEFAULT 0,
          tokens_total INTEGER NOT NULL DEFAULT 0,
          verdict TEXT NOT NULL, -- PASS, WARNING, FAIL
          triggered_policies TEXT DEFAULT '[]', -- JSON array of policy IDs
          explanation TEXT,
          evidence TEXT,
          mitigation TEXT,
          seed INTEGER NOT NULL DEFAULT 42,
          temperature REAL NOT NULL DEFAULT 0.0,
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          executed_at TEXT NOT NULL
        );
      `);

      // 6. Findings
      db.exec(`
        CREATE TABLE IF NOT EXISTS findings (
          id TEXT PRIMARY KEY,
          eval_case_id TEXT REFERENCES eval_cases(id) ON DELETE CASCADE,
          run_id TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
          model_id TEXT NOT NULL,
          model_name TEXT NOT NULL,
          category TEXT NOT NULL,
          severity TEXT NOT NULL, -- Critical, High, Medium, Low
          status TEXT NOT NULL, -- Failed, Warning, Passed
          test_case_prompt TEXT NOT NULL,
          observed_response TEXT NOT NULL,
          expected_behavior TEXT NOT NULL,
          explanation TEXT NOT NULL,
          policy_violated TEXT,
          risk_score INTEGER NOT NULL DEFAULT 50,
          evidence TEXT NOT NULL,
          mitigation TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);

      // 7. Security Policies
      db.exec(`
        CREATE TABLE IF NOT EXISTS policies (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'High',
          is_enabled INTEGER NOT NULL DEFAULT 1,
          effect TEXT NOT NULL DEFAULT 'DENY', -- ALLOW, DENY
          tool TEXT NOT NULL DEFAULT 'all',
          rules TEXT NOT NULL DEFAULT '{}', -- JSON rule configuration
          version TEXT NOT NULL DEFAULT '1.0.0',
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
      `);

      // 8. Policy Decisions Log
      db.exec(`
        CREATE TABLE IF NOT EXISTS policy_decisions (
          id TEXT PRIMARY KEY,
          run_id TEXT,
          request_id TEXT,
          policy_id TEXT NOT NULL REFERENCES policies(id),
          tool_name TEXT,
          target_resource TEXT,
          decision TEXT NOT NULL, -- ALLOWED, DENIED, WARNING
          reason TEXT NOT NULL,
          risk_level TEXT NOT NULL DEFAULT 'LOW',
          payload_hash TEXT NOT NULL,
          evaluated_at TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
      `);

      // 9. Probe Runs & Results
      db.exec(`
        CREATE TABLE IF NOT EXISTS probe_runs (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          status TEXT NOT NULL, -- COMPLETED, FAILED, UNVERIFIED
          environment_type TEXT NOT NULL DEFAULT 'docker', -- docker, mock, unverified
          config_fingerprint TEXT NOT NULL,
          total_duration_ms REAL NOT NULL DEFAULT 0,
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS probe_results (
          id TEXT PRIMARY KEY,
          probe_run_id TEXT NOT NULL REFERENCES probe_runs(id) ON DELETE CASCADE,
          probe_id TEXT NOT NULL, -- T01, T02, T03, T04, T05
          guarantee_id TEXT NOT NULL, -- G1, G2, G3, G4, G5
          verdict TEXT NOT NULL, -- PASS, FAIL, NOT_RUN
          evidence_json TEXT NOT NULL, -- JSON (command, exit_code, stdout_excerpt, http_status, inspect_excerpt)
          duration_ms REAL NOT NULL DEFAULT 0,
          executed_at TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
      `);

      // 10. Configuration Snapshots
      db.exec(`
        CREATE TABLE IF NOT EXISTS config_snapshots (
          id TEXT PRIMARY KEY,
          fingerprint TEXT NOT NULL UNIQUE,
          canonical_manifest TEXT NOT NULL,
          g1_digest TEXT NOT NULL,
          g2_digest TEXT NOT NULL,
          g3_digest TEXT NOT NULL,
          g4_digest TEXT NOT NULL,
          g5_digest TEXT NOT NULL,
          captured_at TEXT NOT NULL
        );
      `);

      // 11. Cryptographic Audit Ledger (Strictly Append-Only via Triggers)
      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_events (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id TEXT NOT NULL UNIQUE,
          run_id TEXT,
          timestamp TEXT NOT NULL,
          event_type TEXT NOT NULL, -- run.started, test.completed, policy.decision, etc.
          tool_name TEXT,
          resource TEXT,
          decision TEXT NOT NULL DEFAULT 'NONE',
          payload_canonical TEXT NOT NULL,
          previous_event_hash TEXT NOT NULL,
          event_hash TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
      `);

      // SQLite Triggers preventing modification or deletion of audit records
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS audit_events_no_update
        BEFORE UPDATE ON audit_events
        BEGIN
          SELECT RAISE(FAIL, 'audit_events is strictly append-only: UPDATE prohibited');
        END;
      `);

      db.exec(`
        CREATE TRIGGER IF NOT EXISTS audit_events_no_delete
        BEFORE DELETE ON audit_events
        BEGIN
          SELECT RAISE(FAIL, 'audit_events is strictly append-only: DELETE prohibited');
        END;
      `);

      // 12. Cryptographic Attestations
      db.exec(`
        CREATE TABLE IF NOT EXISTS attestations (
          id TEXT PRIMARY KEY,
          issued_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          policy_fingerprint TEXT NOT NULL,
          assurance_state TEXT NOT NULL, -- VERIFIED, STALE, BREACHED, UNVERIFIED, RECOVERING
          key_id TEXT NOT NULL,
          signature_hex TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
      `);

      // 13. Gateway Requests
      db.exec(`
        CREATE TABLE IF NOT EXISTS gateway_requests (
          id TEXT PRIMARY KEY,
          client_ip TEXT,
          model_target TEXT NOT NULL,
          attestation_id TEXT,
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          latency_ms REAL NOT NULL DEFAULT 0,
          http_status INTEGER NOT NULL DEFAULT 200,
          decision TEXT NOT NULL DEFAULT 'ALLOWED',
          created_at TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
      `);

      // 14. Advisor Outputs (AI Explains)
      db.exec(`
        CREATE TABLE IF NOT EXISTS advisor_outputs (
          id TEXT PRIMARY KEY,
          eval_run_id TEXT REFERENCES eval_runs(id),
          finding_id TEXT REFERENCES findings(id),
          source TEXT NOT NULL, -- 'llm' | 'template'
          model_used TEXT,
          prompt_hash TEXT NOT NULL,
          summary TEXT NOT NULL,
          root_cause TEXT NOT NULL,
          mitigations TEXT NOT NULL, -- JSON array
          referenced_finding_ids TEXT NOT NULL, -- JSON array
          is_valid INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
      `);

      // 15. Security Events / Telemetry
      db.exec(`
        CREATE TABLE IF NOT EXISTS security_events (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          severity TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          blocked INTEGER NOT NULL DEFAULT 1,
          target TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
      `);

      // Legacy compatibility views / tables for earlier prototype test runners
      db.exec(`
        CREATE TABLE IF NOT EXISTS runs (
          id TEXT PRIMARY KEY,
          task TEXT NOT NULL,
          status TEXT NOT NULL,
          mode TEXT NOT NULL,
          total_tool_calls INTEGER NOT NULL DEFAULT 0,
          allowed_count INTEGER NOT NULL DEFAULT 0,
          denied_count INTEGER NOT NULL DEFAULT 0,
          incident_count INTEGER NOT NULL DEFAULT 0,
          summary TEXT,
          created_at TEXT NOT NULL
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS incidents (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          severity TEXT NOT NULL,
          threat_category TEXT NOT NULL,
          tool_name TEXT NOT NULL,
          target_resource TEXT NOT NULL,
          policy_id TEXT NOT NULL,
          description TEXT NOT NULL,
          evidence_snippet TEXT NOT NULL,
          ai_analysis TEXT,
          status TEXT NOT NULL
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS events (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          run_id TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          event_type TEXT NOT NULL,
          tool_name TEXT,
          resource TEXT,
          decision TEXT NOT NULL,
          payload TEXT NOT NULL,
          previous_event_hash TEXT NOT NULL,
          event_hash TEXT NOT NULL
        );
      `);
    }
  }
];

export function applyMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare('SELECT version FROM _migrations').all();
  const appliedSet = new Set(appliedRows.map((r) => r.version));

  for (const m of MIGRATIONS) {
    if (!appliedSet.has(m.version)) {
      m.up(db);
      db.prepare('INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(m.version, m.name, new Date().toISOString());
    }
  }
}
