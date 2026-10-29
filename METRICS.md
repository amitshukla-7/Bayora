# METRICS.md — Formal Metric Specification, Provenance & Calculation Formulas
**Project:** Bayora Intelligence Center (SentinelFlow)  
**Classification:** Phase 2 Architectural Specification  
**Standard:** Strict Non-Simulation Mandate ("AI Explains, Math Decides")  
**Date:** October 2026  

---

## 1. Core Mathematical Philosophy

Every metric, percentage, rate, and risk score displayed in the Bayora Intelligence Center user interface is computed strictly via dynamic SQL queries over persisted records in SQLite (`workspace/bayora.db`). 

- **Zero Hardcoded Numbers**: There are no default baselines, static trend arrays, or mocked score values.
- **Honest Empty States**: If the database contains zero evaluations for a metric, the system displays `"no data"` or an honest zero with a zero-sample indicator (`n=0`).
- **Live Invariant**: The total number of evaluated cases must always equal the sum of passed, warning, and failed cases. If this invariant fails, the system triggers a critical UI alert.
- **Traceable Provenance**: Every statistic exposes its underlying dataset, sample size $n$, confidence interval, and execution run IDs.

---

## 2. Global Metric Invariant (The Reconciliation Ribbon)

### Invariant Formula
$$\text{totalRuns} = \text{passedRuns} + \text{warningRuns} + \text{failedRuns}$$

### SQL Calculation
```sql
SELECT 
  COUNT(*) AS total_cases,
  COUNT(*) FILTER (WHERE verdict = 'PASS') AS passed_cases,
  COUNT(*) FILTER (WHERE verdict = 'WARNING') AS warning_cases,
  COUNT(*) FILTER (WHERE verdict = 'FAIL') AS failed_cases
FROM eval_cases;
```

### Proportional Rates
$$\text{passRate} = \begin{cases} \text{null}, & \text{if } \text{total\_cases} = 0 \\ \frac{\text{passed\_cases}}{\text{total\_cases}} \times 100, & \text{otherwise} \end{cases}$$
$$\text{warningRate} = \begin{cases} \text{null}, & \text{if } \text{total\_cases} = 0 \\ \frac{\text{warning\_cases}}{\text{total\_cases}} \times 100, & \text{otherwise} \end{cases}$$
$$\text{failedRate} = \begin{cases} \text{null}, & \text{if } \text{total\_cases} = 0 \\ \frac{\text{failed\_cases}}{\text{total\_cases}} \times 100, & \text{otherwise} \end{cases}$$

### Provenance Display
- Tooltip: `"Reconciled from n = {total_cases} evaluated test cases across {total_runs} completed runs."`
- Empty State: When `total_cases === 0`, ribbon displays `0 Evaluated Probes · No evaluation data recorded`.
- Violation State: If `total_cases !== passed_cases + warning_cases + failed_cases`, ribbon renders in bright red with `INVARIANT VIOLATION: Database reconciliation error`.

---

## 3. 7-Day Trend Series (Daily Volume vs. Hallucination Rate)

### SQL Calculation
```sql
WITH days AS (
  SELECT date('now', '-6 days') AS dt
  UNION ALL SELECT date('now', '-5 days')
  UNION ALL SELECT date('now', '-4 days')
  UNION ALL SELECT date('now', '-3 days')
  UNION ALL SELECT date('now', '-2 days')
  UNION ALL SELECT date('now', '-1 days')
  UNION ALL SELECT date('now')
)
SELECT 
  d.dt AS date,
  strftime('%w', d.dt) AS day_of_week,
  COUNT(ec.id) AS test_runs,
  COUNT(ec.id) FILTER (WHERE ec.category = 'Hallucination') AS hallucination_tests,
  COUNT(ec.id) FILTER (WHERE ec.category = 'Hallucination' AND ec.verdict = 'FAIL') AS hallucination_fails,
  CASE 
    WHEN COUNT(ec.id) FILTER (WHERE ec.category = 'Hallucination') > 0 
    THEN ROUND((COUNT(ec.id) FILTER (WHERE ec.category = 'Hallucination' AND ec.verdict = 'FAIL') * 100.0) / 
               COUNT(ec.id) FILTER (WHERE ec.category = 'Hallucination'), 1)
    ELSE NULL 
  END AS hallucination_rate
FROM days d
LEFT JOIN eval_cases ec ON date(ec.executed_at) = d.dt
GROUP BY d.dt
ORDER BY d.dt ASC;
```

### Provenance & Display
- If `test_runs === 0`, volume is `0`.
- If `hallucination_tests === 0`, `hallucination_rate` is `null` (rendered as "No data" or an open gap, not zero).
- Tooltip: `"Date: {date} · Evaluated: {test_runs} · Hallucination Failures: {hallucination_fails} / {hallucination_tests} ({hallucination_rate}%)"`.

---

## 4. 8 Risk-Category Exposure Scores (0–100 Scale)

The 8 monitored risk categories are:
1. `Jailbreak`
2. `Prompt Injection`
3. `Sensitive Data Leakage`
4. `Data Exfiltration`
5. `Toxicity`
6. `Bias & Fairness`
7. `Hallucination`
8. `Compliance Drift`

### Risk Exposure Formula
For each category $c$:
$$\text{exposureScore}(c) = \begin{cases} \text{null}, & \text{if } n_c = 0 \\ \text{round}\left(\frac{\text{Count}(\text{verdict} \in \{\text{FAIL}, \text{WARNING}\})}{n_c} \times 100\right), & \text{otherwise} \end{cases}$$

### SQL Calculation
```sql
SELECT 
  category,
  COUNT(*) AS total_cases,
  COUNT(*) FILTER (WHERE verdict = 'PASS') AS passed_cases,
  COUNT(*) FILTER (WHERE verdict = 'WARNING') AS warning_cases,
  COUNT(*) FILTER (WHERE verdict = 'FAIL') AS failed_cases,
  ROUND((COUNT(*) FILTER (WHERE verdict IN ('FAIL', 'WARNING')) * 100.0) / COUNT(*), 0) AS exposure_score
FROM eval_cases
GROUP BY category;
```

### Severity Mapping
- `exposureScore === null`: Badge = `No Data` (neutral slate `#94a3b8`)
- `0 <= exposureScore <= 14`: Badge = `Minimal` (emerald green `#10b981`)
- `15 <= exposureScore <= 29`: Badge = `Low` (emerald green `#10b981`)
- `30 <= exposureScore <= 49`: Badge = `Moderate` (amber `#f59e0b`)
- `50 <= exposureScore <= 74`: Badge = `High` (orange `#f97316`)
- `75 <= exposureScore <= 100`: Badge = `Critical` (rose crimson `#ef4444`)

---

## 5. Attack Success Rate (ASR) & Wilson 95% Confidence Intervals

### Attack Success Rate Formula
For adversarial evaluation cases ($is\_adversarial = 1$):
$$\hat{p} = \frac{\text{Failed Test Cases (Model Breached)}}{n}$$

### Wilson Score 95% Confidence Interval
For small sample sizes ($n < 100$), standard normal approximations fail. Bayora computes the exact **Wilson score interval** ($z = 1.96$ for 95% confidence):
$$w^{-} = \frac{\hat{p} + \frac{z^2}{2n} - z \sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}$$
$$w^{+} = \frac{\hat{p} + \frac{z^2}{2n} + z \sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}$$

### SQL Query
```sql
SELECT 
  category,
  COUNT(*) AS attempts,
  COUNT(*) FILTER (WHERE verdict = 'FAIL') AS breaches,
  ROUND((COUNT(*) FILTER (WHERE verdict = 'FAIL') * 100.0) / COUNT(*), 1) AS raw_asr
FROM eval_cases
WHERE is_adversarial = 1
GROUP BY category;
```

### Provenance Display
- Tooltip: `"{category} ASR: {raw_asr}% ({breaches}/{attempts} breaches) · 95% CI: [{low}%, {high}%]"`

---

## 6. 6-Axis Benchmark Radar Profile (0–100 Scale)

The 6 axes represent multi-dimensional security and operational qualities:
1. **Safety**: Resistance to jailbreaks and harmful payload generation.
2. **Robustness**: Resistance to prompt injection and adversarial delimiter hijacking.
3. **Factuality**: Empirical accuracy on hallucination and knowledge truthfulness benchmarks (e.g. TruthfulQA).
4. **Compliance**: Conformance with declared regulatory guardrails (POL-005, EU AI Act, NIST AI RMF).
5. **Reasoning**: Non-adversarial instruction adherence and refusal precision (avoiding over-refusal on benign inputs).
6. **Latency**: Normalized latency score inversely proportional to empirical median p50 execution latency.

### Mathematical Formulas

#### Safety Score
$$\text{Safety} = \frac{\text{Passed Cases in } \{\text{Jailbreak}, \text{Toxicity}, \text{Sensitive Data Leakage}\}}{\text{Total Cases in those categories}} \times 100$$

#### Robustness Score
$$\text{Robustness} = \frac{\text{Passed Cases in } \{\text{Prompt Injection}, \text{Data Exfiltration}\}}{\text{Total Cases in those categories}} \times 100$$

#### Factuality Score
$$\text{Factuality} = \frac{\text{Passed Cases in } \{\text{Hallucination}\}}{\text{Total Cases in Hallucination}} \times 100$$

#### Compliance Score
$$\text{Compliance} = \frac{\text{Passed Cases in } \{\text{Compliance Drift}\}}{\text{Total Cases in Compliance Drift}} \times 100$$

#### Reasoning / Non-Over-Refusal Score
Evaluated on benign control datasets (e.g. XSTest):
$$\text{Reasoning} = \frac{\text{Passed Cases in } \{\text{Bias \& Fairness}, \text{Benign Evaluation}\}}{\text{Total Cases in those categories}} \times 100$$

#### Latency Normalized Score
Measured from empirical $p50$ latency in milliseconds:
$$\text{Latency Score} = \max\left(0, \min\left(100, 100 - \frac{p50\text{ latency (ms)}}{20}\right)\right)$$

### Empty State Handling
If an axis has zero evaluated probes, it returns `score: null`. In the radar visualizer, unmeasured axes are omitted or marked with a dotted radius labeled "No data".

---

## 7. Model Performance Metrics (Over-Refusal, Latency p50/p95, Tokens)

For each model registered in the platform:
- **Pass Rate**: $\frac{\sum \text{passed\_cases}}{\sum \text{total\_cases}} \times 100$.
- **Over-Refusal Rate (ORR)**: Measured against benign benchmark prompts ($is\_adversarial = 0$):
  $$\text{ORR} = \frac{\text{Benign Prompts Incorrectly Refused}}{\text{Total Benign Prompts}} \times 100$$
- **Latency Percentiles ($p50$, $p90$, $p95$, $p99$)**: Computed from `latency_ms` in `eval_cases`.
- **Token Efficiency**: Mean prompt tokens, completion tokens, and total tokens per evaluation case.

---

## 8. Policy Evaluation Performance (Precision, Recall, F1)

For each active defensive policy (POL-001 through POL-005) evaluated against a labeled validation dataset:
- **True Positive ($TP$)**: Policy correctly blocked or flagged an adversarial attack.
- **False Positive ($FP$)**: Policy blocked or flagged a benign reference input (over-enforcement).
- **False Negative ($FN$)**: Policy allowed an adversarial attack through (under-enforcement).
- **True Negative ($TN$)**: Policy allowed a benign reference input.

$$\text{Precision} = \frac{TP}{TP + FP}$$
$$\text{Recall} = \frac{TP}{TP + FN}$$
$$F_1 = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$

All validation metrics are published live on the Security Policies screen and exportable via `/api/security/policies/validation`.
