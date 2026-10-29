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
          model_identifier TEXT,
          version TEXT NOT NULL DEFAULT '1.0.0',
          description TEXT NOT NULL DEFAULT '',
          model_type TEXT NOT NULL DEFAULT 'Instruct LLM',
          execution_mode TEXT NOT NULL DEFAULT 'Live', -- Live, Ollama, OpenAI-Compatible, Simulation
          endpoint TEXT,
          base_url TEXT,
          api_key_env TEXT,
          parameters TEXT,
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

      // 4. Eval Runs (Evaluations)
      db.exec(`
        CREATE TABLE IF NOT EXISTS eval_runs (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          dataset_id TEXT REFERENCES datasets(id),
          model_id TEXT NOT NULL REFERENCES models(id),
          model_identifier TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
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
          created_at TEXT NOT NULL
        );
      `);

      // 5. Evaluations (UI Representation Table)
      db.exec(`
        CREATE TABLE IF NOT EXISTS evaluations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          preset_scenario TEXT NOT NULL DEFAULT 'Standard',
          status TEXT NOT NULL DEFAULT 'COMPLETED', -- RUNNING, COMPLETED, FAILED, CANCELLED
          models TEXT NOT NULL, -- JSON array of model IDs
          categories TEXT NOT NULL, -- JSON array of categories
          total_cases INTEGER NOT NULL DEFAULT 0,
          passed_count INTEGER NOT NULL DEFAULT 0,
          warning_count INTEGER NOT NULL DEFAULT 0,
          failed_count INTEGER NOT NULL DEFAULT 0,
          risk_score REAL NOT NULL DEFAULT 0,
          execution_duration_ms INTEGER NOT NULL DEFAULT 0,
          estimated_duration TEXT,
          execution_settings TEXT DEFAULT '{}',
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);

      // 6. Eval Cases (Granular Per-Case Executions)
      db.exec(`
        CREATE TABLE IF NOT EXISTS eval_cases (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL,
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
          verdict TEXT NOT NULL, -- Passed, Warning, Failed
          triggered_policies TEXT DEFAULT '[]',
          explanation TEXT,
          evidence TEXT,
          mitigation TEXT,
          seed INTEGER DEFAULT 42,
          temperature REAL DEFAULT 0.0,
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          executed_at TEXT NOT NULL
        );
      `);

      // 7. Findings
      db.exec(`
        CREATE TABLE IF NOT EXISTS findings (
          id TEXT PRIMARY KEY,
          eval_case_id TEXT,
          run_id TEXT,
          evaluation_id TEXT,
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
          risk_score REAL NOT NULL,
          evidence TEXT,
          mitigation TEXT,
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);

      // 8. Security Policies
      db.exec(`
        CREATE TABLE IF NOT EXISTS policies (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'POLICY',
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'Medium',
          is_enabled INTEGER NOT NULL DEFAULT 1,
          effect TEXT NOT NULL DEFAULT 'DENY',
          tool TEXT DEFAULT '*',
          rules TEXT NOT NULL DEFAULT '{}',
          version TEXT NOT NULL DEFAULT '1.0.0',
          enforcement_mode TEXT NOT NULL DEFAULT 'Strict', -- Strict, Permissive, Advisory
          configuration TEXT NOT NULL DEFAULT '{}',
          fingerprint TEXT NOT NULL DEFAULT '',
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
      `);

      // 9. Policy Decisions
      db.exec(`
        CREATE TABLE IF NOT EXISTS policy_decisions (
          id TEXT PRIMARY KEY,
          evaluation_id TEXT,
          policy_id TEXT NOT NULL REFERENCES policies(id),
          model_id TEXT NOT NULL,
          decision TEXT NOT NULL, -- ALLOW, DENY, REDACT, WARNING
          verdict TEXT NOT NULL, -- Passed, Warning, Failed
          input_hash TEXT NOT NULL,
          output_hash TEXT NOT NULL,
          matched_rules TEXT,
          latency_ms REAL NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);

      // 10. Probe Runs
      db.exec(`
        CREATE TABLE IF NOT EXISTS probe_runs (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          overall_status TEXT NOT NULL, -- VERIFIED, UNVERIFIED, BREACHED
          score REAL NOT NULL,
          active_probes INTEGER NOT NULL,
          passed_probes INTEGER NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
      `);

      // 11. Probe Results
      db.exec(`
        CREATE TABLE IF NOT EXISTS probe_results (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL REFERENCES probe_runs(id) ON DELETE CASCADE,
          probe_id TEXT NOT NULL,
          name TEXT NOT NULL,
          status TEXT NOT NULL, -- PASS, FAIL, UNVERIFIED
          latency_ms REAL NOT NULL,
          evidence TEXT,
          error TEXT,
          created_at TEXT NOT NULL
        );
      `);

      // 12. Config Snapshots
      db.exec(`
        CREATE TABLE IF NOT EXISTS config_snapshots (
          id TEXT PRIMARY KEY,
          fingerprint TEXT NOT NULL,
          guarantee_digests TEXT NOT NULL, -- JSON
          is_valid INTEGER NOT NULL DEFAULT 1,
          captured_at TEXT NOT NULL
        );
      `);

      // 13. Attestations
      db.exec(`
        CREATE TABLE IF NOT EXISTS attestations (
          id TEXT PRIMARY KEY,
          config_fingerprint TEXT NOT NULL,
          state TEXT NOT NULL,
          nonce TEXT NOT NULL,
          signature TEXT NOT NULL,
          public_key TEXT NOT NULL,
          valid_until TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);

      // 14. Gateway Requests
      db.exec(`
        CREATE TABLE IF NOT EXISTS gateway_requests (
          id TEXT PRIMARY KEY,
          model_id TEXT NOT NULL,
          prompt_hash TEXT NOT NULL,
          response_hash TEXT NOT NULL,
          latency_ms REAL NOT NULL,
          tokens_prompt INTEGER NOT NULL DEFAULT 0,
          tokens_completion INTEGER NOT NULL DEFAULT 0,
          tokens_total INTEGER NOT NULL DEFAULT 0,
          policy_verdict TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);

      // 15. Advisor Outputs
      db.exec(`
        CREATE TABLE IF NOT EXISTS advisor_outputs (
          id TEXT PRIMARY KEY,
          context_id TEXT NOT NULL,
          source TEXT NOT NULL, -- llm, template
          incident_summary TEXT NOT NULL,
          root_cause TEXT NOT NULL,
          mitigations TEXT NOT NULL, -- JSON array
          schema_valid INTEGER NOT NULL DEFAULT 1,
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);

      // 16. Audit Events (Append-Only Cryptographic Hash Chain)
      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_events (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id TEXT,
          run_id TEXT,
          timestamp TEXT NOT NULL,
          event_type TEXT NOT NULL,
          tool_name TEXT,
          resource TEXT,
          decision TEXT NOT NULL, -- ALLOW, DENY, LOG, NONE
          payload TEXT,
          payload_canonical TEXT NOT NULL,
          previous_event_hash TEXT NOT NULL,
          event_hash TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
      `);

      // Strict SQLite Triggers: Enforce Append-Only Guarantee on audit_events
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_update
        BEFORE UPDATE ON audit_events
        BEGIN
          SELECT RAISE(FAIL, 'audit_events is strictly append-only: UPDATE is prohibited');
        END;
      `);

      db.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_delete
        BEFORE DELETE ON audit_events
        BEGIN
          SELECT RAISE(FAIL, 'audit_events is strictly append-only: DELETE is prohibited');
        END;
      `);

      // 17. Security Events (Audit stream)
      db.exec(`
        CREATE TABLE IF NOT EXISTS security_events (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          event_type TEXT,
          severity TEXT NOT NULL DEFAULT 'High',
          category TEXT DEFAULT 'General',
          description TEXT NOT NULL DEFAULT '',
          message TEXT,
          blocked INTEGER NOT NULL DEFAULT 1,
          target TEXT DEFAULT 'gateway',
          metadata TEXT DEFAULT '{}',
          is_synthetic INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      // 18. Legacy SentinelFlow Runs
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
          summary TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
      `);

      // 19. Legacy SentinelFlow Incidents
      db.exec(`
        CREATE TABLE IF NOT EXISTS incidents (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          severity TEXT NOT NULL,
          threat_category TEXT,
          tool_name TEXT NOT NULL,
          target_resource TEXT,
          policy_id TEXT,
          policy_name TEXT,
          description TEXT NOT NULL,
          evidence_snippet TEXT,
          evidence TEXT,
          remediation TEXT,
          ai_analysis TEXT,
          status TEXT NOT NULL DEFAULT 'OPEN',
          created_at TEXT
        );
      `);

      // 20. Legacy SentinelFlow Events
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
  },
  {
    version: 2,
    name: '002_security_events_columns',
    up: (db) => {
      const cols = db.prepare('PRAGMA table_info(security_events)').all().map((c) => c.name);
      if (!cols.includes('timestamp')) {
        db.exec("ALTER TABLE security_events ADD COLUMN timestamp TEXT DEFAULT (datetime('now'))");
      }
      if (!cols.includes('category')) {
        db.exec("ALTER TABLE security_events ADD COLUMN category TEXT DEFAULT 'General'");
      }
      if (!cols.includes('description')) {
        db.exec("ALTER TABLE security_events ADD COLUMN description TEXT DEFAULT ''");
      }
      if (!cols.includes('blocked')) {
        db.exec("ALTER TABLE security_events ADD COLUMN blocked INTEGER DEFAULT 1");
      }
      if (!cols.includes('target')) {
        db.exec("ALTER TABLE security_events ADD COLUMN target TEXT DEFAULT 'gateway'");
      }
    }
  },
  {
    version: 3,
    name: '003_settings_table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
    }
  },
  {
    version: 4,
    name: '004_policy_configs_and_history',
    up: (db) => {
      const pCols = db.prepare('PRAGMA table_info(policies)').all().map((c) => c.name);
      if (!pCols.includes('mode')) {
        db.exec("ALTER TABLE policies ADD COLUMN mode TEXT NOT NULL DEFAULT 'ENFORCE'");
      }

      db.exec(`
        CREATE TABLE IF NOT EXISTS policy_configs (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'Medium',
          mode TEXT NOT NULL DEFAULT 'ENFORCE' CHECK (mode IN ('OFF', 'MONITOR', 'ENFORCE')),
          rules_json TEXT NOT NULL DEFAULT '{}',
          version INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_by TEXT NOT NULL DEFAULT 'operator'
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS policy_config_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          policy_id TEXT NOT NULL REFERENCES policy_configs(id),
          previous_mode TEXT NOT NULL,
          new_mode TEXT NOT NULL,
          diff_json TEXT NOT NULL,
          reason TEXT,
          actor TEXT NOT NULL DEFAULT 'operator',
          fingerprint_before TEXT NOT NULL,
          fingerprint_after TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      const count = db.prepare('SELECT COUNT(*) as cnt FROM policy_configs').get().cnt;
      if (count === 0) {
        const existingPolicies = db.prepare('SELECT * FROM policies').all();
        const insertStmt = db.prepare(`
          INSERT INTO policy_configs (id, name, category, severity, mode, rules_json, version, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 'system_seed')
        `);
        for (const p of existingPolicies) {
          const mode = p.is_enabled === 1 ? 'ENFORCE' : 'OFF';
          insertStmt.run(p.id, p.name, p.category, p.severity, mode, p.rules || '{}', p.version || 1);
        }
      }
    }
  },
  {
    version: 5,
    name: '005_mutation_lab_state',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS mutation_runs (
          id TEXT PRIMARY KEY,
          mutation_id TEXT NOT NULL,
          tier TEXT NOT NULL,
          name TEXT NOT NULL,
          status TEXT NOT NULL,
          fingerprint_before TEXT,
          fingerprint_after TEXT,
          fingerprint_changed INTEGER NOT NULL DEFAULT 1,
          breach_detected INTEGER NOT NULL DEFAULT 0,
          retest_count INTEGER NOT NULL DEFAULT 0,
          retest_results_json TEXT DEFAULT '[]',
          step_log_json TEXT DEFAULT '[]',
          backup_state_json TEXT DEFAULT '{}',
          applied_at TEXT NOT NULL DEFAULT (datetime('now')),
          restored_at TEXT
        );
      `);
    }
  },
  {
    version: 6,
    name: '006_model_verification_details',
    up(db) {
      try {
        db.exec(`ALTER TABLE models ADD COLUMN verification_details TEXT DEFAULT '{}';`);
      } catch {}
      try {
        db.exec(`ALTER TABLE models ADD COLUMN file_path TEXT;`);
      } catch {}
      try {
        db.exec(`ALTER TABLE models ADD COLUMN sha256 TEXT;`);
      } catch {}
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

  // Self-healing check: if core tables are missing despite recorded migration, re-apply
  const hasPolicies = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='policies'").get();
  if (!hasPolicies && appliedSet.size > 0) {
    appliedSet.clear();
    db.prepare('DELETE FROM _migrations').run();
  }

  for (const m of MIGRATIONS) {
    if (!appliedSet.has(m.version)) {
      m.up(db);
      db.prepare('INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(m.version, m.name, new Date().toISOString());
    }
  }
}
