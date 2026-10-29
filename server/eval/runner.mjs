import crypto from 'node:crypto';
import { getDb, appendAuditEvent, createEvalCase } from '../db.mjs';
import { createModelAdapter } from '../adapters/factory.mjs';
import { evaluateTestCase } from '../policies/engine.mjs';
import { getAllPolicyConfigs } from '../policies/service.mjs';
import { addNotification } from '../user/service.mjs';

/**
 * Server-Driven Red Team Evaluation Runner & Job Lifecycle Manager
 * Source of truth: SQLite tables eval_runs, evaluations, eval_cases, findings.
 */

const activeJobs = new Map();

/**
 * Reconcile uncompleted / crashed runs on startup
 */
export function reconcileCrashedRuns() {
  const db = getDb();
  const orphaned = db.prepare(`
    SELECT id, name FROM eval_runs
    WHERE status IN ('RUNNING', 'PREFLIGHT', 'GRADING', 'QUEUED')
  `).all();

  if (orphaned.length > 0) {
    const now = new Date().toISOString();
    for (const run of orphaned) {
      db.prepare(`
        UPDATE eval_runs
        SET status = 'FAILED',
            error_detail = 'Evaluation interrupted: server process restarted while run was in progress.',
            completed_at = ?
        WHERE id = ?
      `).run(now, run.id);

      db.prepare(`
        UPDATE evaluations
        SET status = 'FAILED',
            error_detail = 'Evaluation interrupted by server restart.',
            completed_at = ?
        WHERE id = ?
      `).run(now, run.id);
    }
    console.log(`[EVAL RUNNER] Reconciled ${orphaned.length} orphaned evaluation run(s) from previous session.`);
  }
}

/**
 * Get active evaluation job (if currently running)
 */
export function getActiveEvalJob() {
  const db = getDb();
  const row = db.prepare(`
    SELECT r.*, e.preset_scenario, e.categories, e.execution_settings
    FROM eval_runs r
    LEFT JOIN evaluations e ON e.id = r.id
    WHERE r.status IN ('RUNNING', 'PREFLIGHT', 'GRADING', 'QUEUED')
    ORDER BY r.created_at DESC
    LIMIT 1
  `).get();

  if (!row) return null;

  const total = Number(row.cases_total || row.total_cases) || 0;
  const done = Number(row.cases_done) || 0;
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return {
    ...row,
    total_cases: total,
    cases_done: done,
    percent
  };
}

/**
 * Get detailed status of a specific evaluation run
 */
export function getEvalRunDetails(id) {
  const db = getDb();
  const run = db.prepare(`
    SELECT r.*, e.preset_scenario, e.categories, e.execution_settings, e.models
    FROM eval_runs r
    LEFT JOIN evaluations e ON e.id = r.id
    WHERE r.id = ?
  `).get(id);

  if (!run) return null;

  const total = Number(run.cases_total || run.total_cases) || 0;
  const done = Number(run.cases_done) || 0;
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  let configSnapshot = {};
  try {
    configSnapshot = typeof run.config_snapshot === 'string'
      ? JSON.parse(run.config_snapshot || '{}')
      : run.config_snapshot || {};
  } catch {}

  return {
    ...run,
    total_cases: total,
    cases_done: done,
    percent,
    config_snapshot: configSnapshot
  };
}

/**
 * Cooperative Cancellation of a Running Evaluation Job
 */
export function cancelEvalRun(id) {
  const db = getDb();
  const job = activeJobs.get(id);
  if (job) {
    job.isCancelled = true;
    if (job.abortController) {
      job.abortController.abort();
    }
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE eval_runs
    SET status = 'CANCELLED', completed_at = ?, error_detail = 'Evaluation cancelled by user operator.'
    WHERE id = ? AND status IN ('RUNNING', 'PREFLIGHT', 'GRADING', 'QUEUED')
  `).run(now, id);

  db.prepare(`
    UPDATE evaluations
    SET status = 'CANCELLED', completed_at = ?, error_detail = 'Cancelled by user.'
    WHERE id = ? AND status IN ('RUNNING', 'PREFLIGHT', 'GRADING', 'QUEUED')
  `).run(now, id);

  addNotification({
    title: 'Evaluation Cancelled',
    message: `Evaluation run ${id} was stopped by user request.`,
    type: 'warning',
    link: `/evaluations?evalId=${id}`
  });

  return { success: true, id, status: 'CANCELLED' };
}

/**
 * Real Preflight Check before Launch
 */
export async function executePreflightCheck({ modelIds = [], datasetId = null, categories = [] }) {
  const db = getDb();
  const checks = [];
  let isReady = true;

  // 1. Model Availability & Verification Check
  if (!modelIds || modelIds.length === 0) {
    checks.push({
      name: 'Model Selection',
      status: 'FAIL',
      message: 'No target model selected. At least one model is required.'
    });
    isReady = false;
  } else {
    for (const mid of modelIds) {
      const model = db.prepare('SELECT id, name, status, execution_mode, endpoint FROM models WHERE id = ?').get(mid);
      if (!model) {
        checks.push({
          name: `Model ${mid}`,
          status: 'FAIL',
          message: `Model record "${mid}" does not exist in registry.`
        });
        isReady = false;
      } else if (model.status === 'FAILED_VERIFICATION') {
        checks.push({
          name: `Model ${model.name}`,
          status: 'FAIL',
          message: `Model failed verification pipeline and cannot be evaluated.`
        });
        isReady = false;
      } else {
        checks.push({
          name: `Model ${model.name}`,
          status: 'PASS',
          message: `Model verified and ready (${model.execution_mode}).`
        });
      }
    }
  }

  // 2. Dataset Presence & Integrity Check
  const effectiveDatasetId = datasetId || 'ds_standard_safety_v1';
  const dataset = db.prepare('SELECT id, name, total_cases FROM datasets WHERE id = ?').get(effectiveDatasetId);
  if (!dataset) {
    checks.push({
      name: 'Dataset Verification',
      status: 'FAIL',
      message: `Evaluation dataset "${effectiveDatasetId}" not found in database.`
    });
    isReady = false;
  } else {
    const caseCountRow = db.prepare('SELECT COUNT(*) as count FROM dataset_cases WHERE dataset_id = ?').get(dataset.id);
    const count = caseCountRow ? Number(caseCountRow.count) : 0;
    if (count === 0) {
      checks.push({
        name: 'Dataset Test Cases',
        status: 'FAIL',
        message: `Dataset "${dataset.name}" contains 0 test cases.`
      });
      isReady = false;
    } else {
      checks.push({
        name: 'Dataset Test Cases',
        status: 'PASS',
        message: `Dataset "${dataset.name}" verified with ${count} cases.`
      });
    }
  }

  // 3. Category Coverage Check
  if (!categories || categories.length === 0) {
    checks.push({
      name: 'Attack Surfaces',
      status: 'FAIL',
      message: 'At least one attack category must be enabled.'
    });
    isReady = false;
  } else {
    checks.push({
      name: 'Attack Surfaces',
      status: 'PASS',
      message: `${categories.length} attack surface categories selected.`
    });
  }

  // 4. Concurrent Active Run Check
  const active = getActiveEvalJob();
  if (active) {
    checks.push({
      name: 'Job Concurrency',
      status: 'FAIL',
      message: `Evaluation run "${active.name || active.id}" is currently in progress.`
    });
    isReady = false;
  } else {
    checks.push({
      name: 'Job Concurrency',
      status: 'PASS',
      message: 'Execution slot available (no conflicting active jobs).'
    });
  }

  return {
    ready: isReady,
    checks
  };
}

/**
 * 8 Official Platform Security Categories
 */
export const OFFICIAL_CATEGORIES = [
  'Jailbreak',
  'Prompt Injection',
  'Sensitive Data Leakage',
  'Data Exfiltration',
  'Toxicity',
  'Bias & Fairness',
  'Hallucination',
  'Compliance Drift'
];

/**
 * Dynamic Presets with Real Math and Historical p50 Latencies
 */
export function getDynamicPresets(modelIds = [], datasetId = 'ds_standard_safety_v1') {
  const db = getDb();

  // Query historical p50 latency for selected models
  let p50LatencyMs = 350; // sensible fallback
  let priorRunCount = 0;

  if (modelIds.length > 0) {
    const placeholders = modelIds.map(() => '?').join(',');
    const stats = db.prepare(`
      SELECT COUNT(*) as cnt, AVG(latency_ms) as avg_latency
      FROM eval_cases
      WHERE model_id IN (${placeholders})
    `).get(...modelIds);

    if (stats && stats.cnt > 0) {
      priorRunCount = Number(stats.cnt);
      p50LatencyMs = Math.round(Number(stats.avg_latency) || 350);
    }
  }

  const formatEstDuration = (totalCalls) => {
    if (priorRunCount === 0) {
      return { text: '~1–2 mins', basis: 'Initial estimate (no prior runs measured)' };
    }
    const totalMs = totalCalls * p50LatencyMs;
    const minutes = Math.ceil(totalMs / 60000);
    return {
      text: minutes <= 1 ? '< 1 min' : `~${minutes} mins`,
      basis: `Based on ${priorRunCount} prior cases (p50: ${p50LatencyMs}ms)`
    };
  };

  const modelCount = Math.max(1, modelIds.length);

  // Check if any registered Hugging Face model exists
  const hfModel = db.prepare(`
    SELECT id, name FROM models
    WHERE provider = 'Hugging Face' AND status = 'Active'
    LIMIT 1
  `).get();

  const presets = [
    {
      id: 'Quick Diagnostic',
      title: 'Quick Diagnostic',
      casesCount: 12,
      categories: ['Prompt Injection', 'Sensitive Data Leakage'],
      totalCalls: 12 * modelCount,
      duration: formatEstDuration(12 * modelCount).text,
      latencyBasis: formatEstDuration(12 * modelCount).basis,
      description: 'Rapid diagnostic run on selected models with core adversarial probes.',
      enabled: true
    },
    {
      id: 'Standard Security',
      title: 'Standard Security',
      casesCount: 24,
      categories: ['Jailbreak', 'Prompt Injection', 'Sensitive Data Leakage', 'Toxicity', 'Hallucination'],
      totalCalls: 24 * modelCount,
      duration: formatEstDuration(24 * modelCount).text,
      latencyBasis: formatEstDuration(24 * modelCount).basis,
      description: 'Standard enterprise safety evaluation across balanced attack categories.',
      enabled: true
    },
    {
      id: 'Comprehensive',
      title: 'Comprehensive',
      casesCount: 48,
      categories: [...OFFICIAL_CATEGORIES],
      totalCalls: 48 * modelCount,
      duration: formatEstDuration(48 * modelCount).text,
      latencyBasis: formatEstDuration(48 * modelCount).basis,
      description: 'Full-spectrum audit covering all 8 vulnerability domains and compliance drift.',
      enabled: true
    },
    {
      id: 'Multi-Model Comparison',
      title: 'Multi-Model Comparison',
      casesCount: 24,
      categories: ['Prompt Injection', 'Sensitive Data Leakage', 'Data Exfiltration', 'Toxicity'],
      totalCalls: 24 * modelCount,
      duration: formatEstDuration(24 * modelCount).text,
      latencyBasis: formatEstDuration(24 * modelCount).basis,
      description: 'Cross-model benchmark running identical test cases and seeds simultaneously.',
      enabled: modelCount >= 2,
      disabledReason: modelCount < 2 ? 'Requires at least 2 target models selected.' : undefined
    },
    {
      id: 'Hugging Face Local Audit',
      title: 'Hugging Face Local Audit',
      casesCount: 20,
      categories: ['Prompt Injection', 'Sensitive Data Leakage', 'Hallucination'],
      totalCalls: 20 * modelCount,
      duration: formatEstDuration(20 * modelCount).text,
      latencyBasis: formatEstDuration(20 * modelCount).basis,
      description: 'Evaluate registered open-weight models locally via verified runtime adapters.',
      enabled: Boolean(hfModel),
      disabledReason: !hfModel ? 'No verified Hugging Face model registered. Import one from the Model Registry.' : undefined
    },
    {
      id: 'Maximum Stress Test',
      title: 'Maximum Stress Test',
      casesCount: 80,
      categories: [...OFFICIAL_CATEGORIES],
      totalCalls: 80 * modelCount,
      duration: formatEstDuration(80 * modelCount).text,
      latencyBasis: formatEstDuration(80 * modelCount).basis,
      description: 'Intense adversarial combinatorial permutations and boundary edge cases.',
      enabled: true,
      warning: 'Deep stress test involves high call volume. Estimated duration may take several minutes.'
    }
  ];

  return {
    presets,
    categories: OFFICIAL_CATEGORIES,
    historicalStats: {
      measuredCases: priorRunCount,
      p50LatencyMs
    }
  };
}

/**
 * Execute Red Team Evaluation Run with Live SQLite Progress & Cancellation
 */
export async function executeEvaluationRunServer({
  name,
  presetScenario = 'Standard Security',
  modelIds = [],
  datasetId = 'ds_standard_safety_v1',
  categories = OFFICIAL_CATEGORIES,
  executionSettings = {},
  onProgress = null
}) {
  const db = getDb();
  const runHash = crypto.randomBytes(4).toString('hex');
  const evalId = `eval_${Date.now()}_${runHash}`;
  const now = new Date().toISOString();

  // Validate inputs
  if (!modelIds || modelIds.length === 0) {
    throw new Error('At least one model must be selected for evaluation.');
  }
  if (!categories || categories.length === 0) {
    throw new Error('At least one attack category must be selected.');
  }

  // Preflight check
  const preflight = await executePreflightCheck({ modelIds, datasetId, categories });
  if (!preflight.ready) {
    const failedCheck = preflight.checks.find(c => c.status === 'FAIL');
    throw new Error(`Preflight Check Failed: ${failedCheck?.message || 'Unmet requirements.'}`);
  }

  // Resolve models and instantiate adapters
  const modelEntries = [];
  for (const mid of modelIds) {
    const modelRecord = db.prepare('SELECT * FROM models WHERE id = ?').get(mid);
    if (!modelRecord) throw new Error(`Model not registered: ${mid}`);
    const adapter = createModelAdapter(modelRecord);
    modelEntries.push({ record: modelRecord, adapter });
  }

  const activePolicies = getAllPolicyConfigs();

  // Fetch test cases
  const placeholders = categories.map(() => '?').join(',');
  const query = `SELECT * FROM dataset_cases WHERE category IN (${placeholders})`;
  const allCases = db.prepare(query).all(...categories);

  const maxCases = executionSettings.maxTestCases || 30;
  const selectedCases = allCases.slice(0, maxCases);
  const totalCasesCount = selectedCases.length * modelEntries.length;

  const configSnapshot = {
    models: modelIds,
    preset: presetScenario,
    dataset_id: datasetId,
    categories,
    samples_per_case: executionSettings.samplesPerCase || 1,
    temperature: executionSettings.temperature ?? 0.0,
    seed: executionSettings.seed ?? 42,
    max_tokens: executionSettings.maxTokens || 128,
    concurrency: executionSettings.concurrency || 4
  };

  // Register in activeJobs
  const abortController = new AbortController();
  const jobState = { evalId, abortController, isCancelled: false, startTime: Date.now() };
  activeJobs.set(evalId, jobState);

  // Insert into evaluations & eval_runs
  db.prepare(`
    INSERT INTO evaluations (
      id, name, preset_scenario, status, models, categories, total_cases, cases_done,
      passed_count, warning_count, failed_count, risk_score, execution_duration_ms,
      estimated_duration, execution_settings, is_synthetic, created_at
    ) VALUES (?, ?, ?, 'RUNNING', ?, ?, ?, 0, 0, 0, 0, 0, 0, ?, ?, 0, ?)
  `).run(
    evalId,
    name || `${presetScenario} Run - ${new Date().toLocaleDateString()}`,
    presetScenario,
    JSON.stringify(modelIds),
    JSON.stringify(categories),
    totalCasesCount,
    `${Math.ceil(totalCasesCount * 1.5)}s`,
    JSON.stringify(executionSettings),
    now
  );

  const primaryModel = modelEntries[0]?.record;
  db.prepare(`
    INSERT INTO eval_runs (
      id, name, dataset_id, model_id, model_identifier, status, total_cases, cases_total,
      cases_done, cases_errored, samples_done, passed_count, warning_count, failed_count,
      execution_duration_ms, seed, temperature, concurrency, started_at, config_snapshot,
      is_synthetic, created_at
    ) VALUES (?, ?, ?, ?, ?, 'RUNNING', ?, ?, 0, 0, 0, 0, 0, 0, 0, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    evalId,
    name || `${presetScenario} Run`,
    datasetId,
    primaryModel ? primaryModel.id : modelIds[0],
    primaryModel ? (primaryModel.model_identifier || primaryModel.identifier) : modelIds[0],
    totalCasesCount,
    totalCasesCount,
    executionSettings.seed ?? 42,
    executionSettings.temperature ?? 0.0,
    executionSettings.concurrency || 4,
    now,
    JSON.stringify(configSnapshot),
    now
  );

  let passedCount = 0;
  let warningCount = 0;
  let failedCount = 0;
  let erroredCount = 0;
  let completedCount = 0;
  let totalRisk = 0;
  const createdFindings = [];

  const insertFinding = db.prepare(`
    INSERT INTO findings (
      id, eval_case_id, run_id, evaluation_id, model_id, model_name, category, severity, status,
      test_case_prompt, observed_response, expected_behavior, explanation,
      policy_violated, risk_score, evidence, mitigation, is_synthetic, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);

  let findingCounter = 1;

  try {
    for (const { record: model, adapter } of modelEntries) {
      for (const testCase of selectedCases) {
        // Cooperative cancellation check
        if (jobState.isCancelled) {
          throw new Error('Evaluation cancelled by user operator.');
        }

        const percent = totalCasesCount > 0 ? Math.round((completedCount / totalCasesCount) * 100) : 0;
        const currentStep = `Evaluating case ${completedCount + 1} of ${totalCasesCount} (${testCase.category}) on ${model.name || model.id}...`;

        if (onProgress) {
          try {
            await onProgress({
              type: 'progress',
              evalId,
              completed: completedCount,
              total: totalCasesCount,
              percent,
              step: currentStep,
              currentModel: model.name || model.id,
              currentCategory: testCase.category
            });
          } catch {}
        }

        let modelResult;
        const testStartTime = Date.now();

        try {
          modelResult = await adapter.generate(testCase.prompt, {
            temperature: executionSettings.temperature ?? 0.0,
            seed: executionSettings.seed ?? 42,
            timeoutMs: executionSettings.timeoutMs || 30000
          });
        } catch (err) {
          erroredCount++;
          modelResult = {
            text: `[ADAPTER_EXECUTION_FAILURE]: ${err.message}`,
            toolCalls: [],
            latencyMs: Date.now() - testStartTime,
            tokens: { prompt: 0, completion: 0, total: 0 },
            model: model.identifier || model.id,
            digest: '0000000000000000000000000000000000000000000000000000000000000000',
            executionError: true
          };
        }

        // Evaluation
        let evalOutcome;
        if (modelResult.executionError) {
          evalOutcome = {
            verdict: 'Failed',
            status: 'Failed',
            severity: 'Critical',
            riskScore: 100,
            policyViolated: 'SYSTEM-FAIL-CLOSED: Target Unreachable or Execution Error',
            evidence: modelResult.text,
            explanation: 'Model execution failed or timed out. Under fail-closed security invariants, this case is marked Failed.',
            mitigation: 'Verify model endpoint connectivity and target server health.',
            triggeredPolicies: ['SYSTEM-FAIL-CLOSED']
          };
        } else {
          evalOutcome = evaluateTestCase(testCase, modelResult, activePolicies);
        }

        totalRisk += evalOutcome.riskScore;

        if (evalOutcome.status === 'Passed') {
          passedCount++;
        } else if (evalOutcome.status === 'Warning') {
          warningCount++;
        } else {
          failedCount++;
        }

        // Insert eval_cases row
        const evalCaseRecord = createEvalCase({
          run_id: evalId,
          case_id: testCase.id,
          model_id: model.id,
          category: testCase.category,
          severity: evalOutcome.severity,
          prompt: testCase.prompt,
          raw_response: modelResult.text,
          tool_calls: modelResult.toolCalls,
          latency_ms: modelResult.latencyMs,
          tokens_prompt: modelResult.tokens?.prompt || 0,
          tokens_completion: modelResult.tokens?.completion || 0,
          verdict: evalOutcome.verdict,
          triggered_policies: evalOutcome.triggeredPolicies,
          explanation: evalOutcome.explanation,
          evidence: evalOutcome.evidence,
          mitigation: evalOutcome.mitigation,
          seed: executionSettings.seed ?? 42,
          temperature: executionSettings.temperature ?? 0.0,
          is_synthetic: 0
        });

        // Findings
        if (evalOutcome.status !== 'Passed') {
          const findingId = `FND-${Date.now().toString(36)}-${String(findingCounter++).padStart(3, '0')}`;
          insertFinding.run(
            findingId,
            evalCaseRecord.id,
            evalId,
            evalId,
            model.id,
            model.name,
            testCase.category,
            evalOutcome.severity,
            evalOutcome.status,
            testCase.prompt,
            modelResult.text,
            testCase.expected_behavior,
            evalOutcome.explanation,
            evalOutcome.policyViolated,
            evalOutcome.riskScore,
            evalOutcome.evidence,
            evalOutcome.mitigation,
            now
          );

          createdFindings.push({
            id: findingId,
            evaluationId: evalId,
            runId: evalId,
            modelId: model.id,
            modelName: model.name,
            category: testCase.category,
            severity: evalOutcome.severity,
            status: evalOutcome.status,
            testCasePrompt: testCase.prompt,
            observedResponse: modelResult.text,
            expectedBehavior: testCase.expected_behavior,
            explanation: evalOutcome.explanation,
            policyViolated: evalOutcome.policyViolated,
            riskScore: evalOutcome.riskScore,
            evidence: evalOutcome.evidence,
            mitigation: evalOutcome.mitigation
          });
        }

        completedCount++;

        // Live update progress in SQLite
        db.prepare(`
          UPDATE eval_runs
          SET cases_done = ?, cases_errored = ?, passed_count = ?, warning_count = ?, failed_count = ?
          WHERE id = ?
        `).run(completedCount, erroredCount, passedCount, warningCount, failedCount, evalId);

        db.prepare(`
          UPDATE evaluations
          SET cases_done = ?, passed_count = ?, warning_count = ?, failed_count = ?
          WHERE id = ?
        `).run(completedCount, passedCount, warningCount, failedCount, evalId);
      }
    }

    const durationMs = Date.now() - jobState.startTime;
    const avgRisk = totalCasesCount > 0 ? Math.round((totalRisk / totalCasesCount) * 10) / 10 : 0;
    const completedAt = new Date().toISOString();

    // Mark completed
    db.prepare(`
      UPDATE evaluations
      SET status = 'COMPLETED', passed_count = ?, warning_count = ?, failed_count = ?,
          risk_score = ?, execution_duration_ms = ?, completed_at = ?
      WHERE id = ?
    `).run(passedCount, warningCount, failedCount, avgRisk, durationMs, completedAt, evalId);

    db.prepare(`
      UPDATE eval_runs
      SET status = 'COMPLETED', passed_count = ?, warning_count = ?, failed_count = ?,
          execution_duration_ms = ?, completed_at = ?
      WHERE id = ?
    `).run(passedCount, warningCount, failedCount, durationMs, completedAt, evalId);

    // Add completion notification
    addNotification({
      title: 'Evaluation Completed',
      message: `Evaluation "${name || presetScenario}" finished with ${passedCount} passed, ${warningCount} warnings, ${failedCount} failures.`,
      type: failedCount > 0 ? 'warning' : 'success',
      link: `/evaluations?evalId=${evalId}`
    });

    const finalResult = {
      id: evalId,
      evalId,
      name: name || `${presetScenario} Run`,
      status: 'COMPLETED',
      totalCases: totalCasesCount,
      passedCount,
      warningCount,
      failedCount,
      riskScore: avgRisk,
      durationMs,
      findings: createdFindings
    };

    if (onProgress) {
      try {
        await onProgress({
          type: 'complete',
          evalId,
          completed: totalCasesCount,
          total: totalCasesCount,
          percent: 100,
          step: 'Evaluation complete! Detailed findings report ready.',
          result: finalResult
        });
      } catch {}
    }

    return finalResult;
  } catch (err) {
    const errorStatus = jobState.isCancelled ? 'CANCELLED' : 'FAILED';
    const completedAt = new Date().toISOString();

    db.prepare(`
      UPDATE eval_runs
      SET status = ?, error_detail = ?, completed_at = ?
      WHERE id = ?
    `).run(errorStatus, err.message, completedAt, evalId);

    db.prepare(`
      UPDATE evaluations
      SET status = ?, error_detail = ?, completed_at = ?
      WHERE id = ?
    `).run(errorStatus, err.message, completedAt, evalId);

    throw err;
  } finally {
    activeJobs.delete(evalId);
  }
}

