import crypto from 'node:crypto';
import { getDb, appendAuditEvent, createEvalCase } from './db.mjs';
import { createModelAdapter } from './adapters/factory.mjs';
import { evaluateTestCase } from './policies/engine.mjs';
import { getAllPolicyConfigs } from './policies/service.mjs';

/**
 * Execute Real Red Team Evaluation Run
 * Concurrently calls model adapters, deterministically evaluates results,
 * persists findings and eval_cases to SQLite, and updates live aggregate invariants.
 */
export async function executeEvaluationRun({
  name,
  presetScenario = 'Standard',
  modelIds = [],
  categories = [],
  executionSettings = {},
  onProgress = null
}) {
  const db = getDb();
  const runHash = crypto.randomBytes(4).toString('hex');
  const evalId = `eval_${Date.now()}_${runHash}`;
  const now = new Date().toISOString();

  // 1. Validate inputs
  if (!modelIds || modelIds.length === 0) {
    throw new Error('At least one model must be selected for evaluation.');
  }
  if (!categories || categories.length === 0) {
    throw new Error('At least one attack category must be selected.');
  }

  // 2. Resolve models and instantiate adapters
  const modelEntries = [];
  for (const mid of modelIds) {
    const modelRecord = db.prepare('SELECT * FROM models WHERE id = ?').get(mid);
    if (!modelRecord) {
      throw new Error(`Model not registered in system: ${mid}`);
    }
    const adapter = createModelAdapter(modelRecord);
    modelEntries.push({ record: modelRecord, adapter });
  }

  // 3. Fetch active policy configurations (with live mode OFF | MONITOR | ENFORCE)
  const activePolicies = getAllPolicyConfigs();

  // 4. Fetch test cases for selected categories
  const placeholders = categories.map(() => '?').join(',');
  const query = `SELECT * FROM dataset_cases WHERE category IN (${placeholders})`;
  const allCases = db.prepare(query).all(...categories);

  const maxCases = executionSettings.maxTestCases || 50;
  const selectedCases = allCases.slice(0, maxCases);

  const totalCasesCount = selectedCases.length * modelEntries.length;

  // 5. Insert evaluation in RUNNING state into both evaluations and eval_runs
  db.prepare(`
    INSERT INTO evaluations (
      id, name, preset_scenario, status, models, categories, total_cases,
      passed_count, warning_count, failed_count, risk_score, execution_duration_ms,
      estimated_duration, execution_settings, is_synthetic, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    evalId,
    name || `${presetScenario} Run - ${new Date().toLocaleDateString()}`,
    presetScenario,
    'RUNNING',
    JSON.stringify(modelIds),
    JSON.stringify(categories),
    totalCasesCount,
    0, 0, 0, 0, 0,
    `${Math.ceil(totalCasesCount * 1.5)}s`,
    JSON.stringify(executionSettings),
    now
  );

  const primaryModel = modelEntries[0]?.record;
  db.prepare(`
    INSERT INTO eval_runs (
      id, name, model_id, model_identifier, status, total_cases,
      passed_count, warning_count, failed_count, execution_duration_ms,
      seed, temperature, is_synthetic, created_at
    ) VALUES (?, ?, ?, ?, 'RUNNING', ?, 0, 0, 0, 0, ?, ?, 0, ?)
  `).run(
    evalId,
    name || `${presetScenario} Run`,
    primaryModel ? primaryModel.id : modelIds[0],
    primaryModel ? (primaryModel.model_identifier || primaryModel.identifier) : modelIds[0],
    totalCasesCount,
    executionSettings.seed ?? 42,
    executionSettings.temperature ?? 0.0,
    now
  );

  const startTime = Date.now();
  let passedCount = 0;
  let warningCount = 0;
  let failedCount = 0;
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
  let completedCount = 0;

  // 6. Execute tests against models (with fail-closed error handling)
  for (const { record: model, adapter } of modelEntries) {
    for (const testCase of selectedCases) {
      if (onProgress) {
        try {
          await onProgress({
            type: 'progress',
            completed: completedCount,
            total: totalCasesCount,
            percent: totalCasesCount > 0 ? Math.round((completedCount / totalCasesCount) * 100) : 0,
            step: `Evaluating case ${completedCount + 1} of ${totalCasesCount} (${testCase.category}) on ${model.name || model.id}...`,
            currentModel: model.name || model.id,
            currentCategory: testCase.category
          });
        } catch {}
      }

      let modelResult;
      const testStartTime = Date.now();

      try {
        // Real model adapter execution
        modelResult = await adapter.generate(testCase.prompt, {
          temperature: executionSettings.temperature ?? 0.0,
          seed: executionSettings.seed ?? 42,
          timeoutMs: executionSettings.timeoutMs || 30000
        });
      } catch (err) {
        // Fail-closed on error or unreachable model
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

      // Pure deterministic evaluation (MATH DECIDES)
      let evalOutcome;
      if (modelResult.executionError) {
        evalOutcome = {
          verdict: 'Failed',
          status: 'Failed',
          severity: 'Critical',
          riskScore: 100,
          policyViolated: 'SYSTEM-FAIL-CLOSED: Target Unreachable or Execution Error',
          evidence: modelResult.text,
          explanation: 'Model target execution failed or timed out. Under fail-closed security invariants, this case is marked Failed.',
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

      // Record findings for Failed and Warning
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
    }
  }

  const durationMs = Date.now() - startTime;
  const avgRisk = totalCasesCount > 0 ? Math.round((totalRisk / totalCasesCount) * 10) / 10 : 0;

  // 7. Complete evaluation record in both evaluations and eval_runs
  db.prepare(`
    UPDATE evaluations
    SET status = 'COMPLETED',
        passed_count = ?,
        warning_count = ?,
        failed_count = ?,
        risk_score = ?,
        execution_duration_ms = ?
    WHERE id = ?
  `).run(
    passedCount,
    warningCount,
    failedCount,
    avgRisk,
    durationMs,
    evalId
  );

  db.prepare(`
    UPDATE eval_runs
    SET status = 'COMPLETED',
        passed_count = ?,
        warning_count = ?,
        failed_count = ?,
        execution_duration_ms = ?
    WHERE id = ?
  `).run(
    passedCount,
    warningCount,
    failedCount,
    durationMs,
    evalId
  );

  // 8. Append audit event
  try {
    appendAuditEvent({
      eventType: 'EVALUATION_COMPLETED',
      resource: `evaluation:${evalId}`,
      decision: failedCount > 0 ? 'DENY' : 'ALLOW',
      canonicalPayload: {
        evalId,
        totalCases: totalCasesCount,
        passedCount,
        warningCount,
        failedCount,
        avgRisk,
        durationMs
      }
    });
  } catch (err) {
    console.warn('Failed to append evaluation audit event:', err.message);
  }

  const finalResult = {
    id: evalId,
    evalId,
    name,
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
        completed: totalCasesCount,
        total: totalCasesCount,
        percent: 100,
        step: 'Evaluation complete! Finalizing findings report...',
        result: finalResult
      });
    } catch {}
  }

  return finalResult;
}
