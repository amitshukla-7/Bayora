/**
 * Seed a genuine, live demonstration evaluation run against local smollm:135m via Ollama.
 * Pure execution: real HTTP requests to Ollama, real token outputs, ground-truth oracles.
 */

import { getDb, getDashboardSummary } from '../server/db.mjs';
import { syncModelsToDatabase } from '../server/adapters/factory.mjs';
import { executeEvaluationRunServer } from '../server/eval/runner.mjs';

async function seedDemoRun() {
  console.log('===============================================================');
  console.log('  SEEDING REAL DEMO EVALUATION RUN');
  console.log('  Target: SmolLM 135M via local Ollama');
  console.log('===============================================================\n');

  getDb();
  syncModelsToDatabase();

  const db = getDb();
  const model = db.prepare(`
    SELECT * FROM models 
    WHERE id = 'ollama-smollm' OR identifier = 'smollm:135m' OR model_identifier = 'smollm:135m'
  `).get();

  if (!model) {
    console.error('[-] ERROR: Model ollama-smollm not found.');
    process.exit(1);
  }

  console.log(`[+] Executing evaluation for model: ${model.name} (${model.identifier})`);

  const runResult = await executeEvaluationRunServer({
    name: 'SmolLM 135M Baseline Diagnostic',
    presetScenario: 'Quick Diagnostic',
    modelIds: [model.id],
    datasetId: 'ds_standard_safety_v1',
    categories: ['Prompt Injection', 'Sensitive Data Leakage'],
    executionSettings: {
      maxTestCases: 12,
      temperature: 0.0,
      seed: 42,
      timeoutMs: 15000,
      maxTokens: 64
    },
    onProgress: (p) => {
      if (p.type === 'progress') {
        console.log(`[Progress ${p.percent}%] Completed ${p.completed}/${p.total} cases...`);
      }
    }
  });

  console.log('\n===============================================================');
  console.log('  EVALUATION COMPLETE — SUMMARY');
  console.log(`  Run ID       : ${runResult.id}`);
  console.log(`  Total Cases  : ${runResult.totalCases}`);
  console.log(`  Passed       : ${runResult.passedCount}`);
  console.log(`  Warnings     : ${runResult.warningCount}`);
  console.log(`  Failed       : ${runResult.failedCount}`);
  console.log(`  Errored      : ${runResult.erroredCount}`);
  console.log(`  Average Risk : ${runResult.riskScore}/100`);
  console.log(`  Duration     : ${runResult.durationMs}ms`);
  console.log('===============================================================\n');

  // Verify Database State
  const summary = getDashboardSummary();
  console.log('--- Live SQLite Dashboard Summary ---');
  console.log(`Total Runs Recorded   : ${summary.totalRuns}`);
  console.log(`Passed Cases          : ${summary.passedRuns} (${summary.passRate}%)`);
  console.log(`Warning Cases         : ${summary.warningRuns} (${summary.warningRate}%)`);
  console.log(`Failed Cases (Breaches): ${summary.failedRuns} (${summary.failedRate}%)`);
  console.log(`Errored Cases         : ${summary.erroredRuns}`);
  console.log(`Reconciliation Valid  : ${summary.ribbonValid ? 'TRUE (100% Invariant Pass)' : 'FALSE'}`);
  console.log('-------------------------------------\n');

  if (!summary.ribbonValid) {
    console.error('[-] Invariant check failed: counts do not sum to total.');
    process.exit(1);
  }

  console.log('[+] Database successfully primed with real, verifiable evaluation data.');
}

seedDemoRun().catch(err => {
  console.error('[FATAL]:', err);
  process.exit(1);
});
