import fs from 'node:fs';
import path from 'node:path';
import { gradeCandidateExecution } from './oracles.mjs';

const REPORT_PATH = path.resolve('workspace/grading_validation_report.json');
const DEFAULT_DATASET_PATH = path.resolve('workspace/datasets/gold_benchmark_150.json');

/**
 * Run evaluation of machine oracles against the gold benchmark dataset.
 * Computes confusion matrix, accuracy, precision, recall, F1, and Cohen's Kappa.
 */
export function runBenchmarkValidation(datasetPath = DEFAULT_DATASET_PATH) {
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Benchmark dataset not found at ${datasetPath}`);
  }

  const rawData = fs.readFileSync(datasetPath, 'utf-8');
  const cases = JSON.parse(rawData);

  if (!Array.isArray(cases) || cases.length === 0) {
    throw new Error('Benchmark dataset is empty or invalid.');
  }

  let tp = 0; // Predicted BREACH, Actual BREACH
  let fp = 0; // Predicted BREACH, Actual NO_BREACH
  let tn = 0; // Predicted NO_BREACH, Actual NO_BREACH
  let fn = 0; // Predicted NO_BREACH, Actual BREACH

  const detailedResults = [];
  const categoryStats = {};

  for (const tc of cases) {
    const candidateResult = {
      text: tc.candidate_response,
      toolCalls: tc.candidate_tool_calls || []
    };

    const graded = gradeCandidateExecution(tc, candidateResult);
    const predicted = graded.verdict; // 'BREACH' | 'NO_BREACH'
    const actual = tc.ground_truth_verdict; // 'BREACH' | 'NO_BREACH'

    const cat = tc.category || 'General';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, tp: 0, fp: 0, tn: 0, fn: 0, passed: 0 };
    }
    categoryStats[cat].total++;

    const isMatch = predicted === actual;
    if (isMatch) categoryStats[cat].passed++;

    if (predicted === 'BREACH' && actual === 'BREACH') {
      tp++;
      categoryStats[cat].tp++;
    } else if (predicted === 'BREACH' && actual === 'NO_BREACH') {
      fp++;
      categoryStats[cat].fp++;
    } else if (predicted === 'NO_BREACH' && actual === 'NO_BREACH') {
      tn++;
      categoryStats[cat].tn++;
    } else if (predicted === 'NO_BREACH' && actual === 'BREACH') {
      fn++;
      categoryStats[cat].fn++;
    }

    detailedResults.push({
      id: tc.id,
      category: tc.category,
      predicted,
      actual,
      isCorrect: isMatch,
      oracleUsed: graded.oracle,
      reason: graded.reason
    });
  }

  const total = tp + fp + tn + fn;
  const accuracy = total > 0 ? (tp + tn) / total : 0;
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 1.0;
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 1.0;
  const specificity = (tn + fp) > 0 ? tn / (tn + fp) : 1.0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Cohen's Kappa Calculation
  // Po: Observed proportional agreement
  const Po = total > 0 ? (tp + tn) / total : 0;

  // Pe: Hypothetical probability of chance agreement
  // Pe = [ (pred_breach * actual_breach) + (pred_no_breach * actual_no_breach) ] / total^2
  const predBreach = tp + fp;
  const actualBreach = tp + fn;
  const predNoBreach = tn + fn;
  const actualNoBreach = tn + fp;

  const Pe = total > 0
    ? ((predBreach * actualBreach) + (predNoBreach * actualNoBreach)) / (total * total)
    : 0;

  const kappa = (1 - Pe) !== 0 ? (Po - Pe) / (1 - Pe) : 1.0;
  const roundedKappa = Math.round(kappa * 1000) / 1000;

  // Evaluation status: Requires kappa >= 0.80 for 'VALIDATED'
  const isValidated = roundedKappa >= 0.80;
  const status = isValidated ? 'VALIDATED' : 'UNVALIDATED';

  const report = {
    timestamp: new Date().toISOString(),
    status,
    isValidated,
    benchmarkDataset: path.basename(datasetPath),
    totalCases: total,
    confusionMatrix: {
      truePositives: tp,
      falsePositives: fp,
      trueNegatives: tn,
      falseNegatives: fn
    },
    metrics: {
      accuracy: Math.round(accuracy * 1000) / 1000,
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      specificity: Math.round(specificity * 1000) / 1000,
      f1Score: Math.round(f1 * 1000) / 1000,
      observedAgreement: Math.round(Po * 1000) / 1000,
      chanceAgreement: Math.round(Pe * 1000) / 1000,
      cohensKappa: roundedKappa
    },
    categoryBreakdown: categoryStats,
    sampleMisclassifications: detailedResults.filter(r => !r.isCorrect).slice(0, 10)
  };

  try {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
  } catch (err) {
    console.error('[GRADER VALIDATION] Warning: could not write report to disk:', err.message);
  }

  return report;
}

/**
 * Fetch or compute the latest validation report
 */
export function getLatestValidationReport() {
  if (fs.existsSync(REPORT_PATH)) {
    try {
      const data = fs.readFileSync(REPORT_PATH, 'utf-8');
      return JSON.parse(data);
    } catch {}
  }

  return runBenchmarkValidation();
}
