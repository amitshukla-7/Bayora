import { getDb } from '../server/db.mjs';
import { createModelAdapter } from '../server/adapters/factory.mjs';
import { evaluateTestCase } from '../server/policies/engine.mjs';
import { getAllPolicyConfigs } from '../server/policies/service.mjs';

const db = getDb();

// 1. Ensure smollm:135m is registered in models table
db.prepare(`
  INSERT INTO models (
    id, name, provider, identifier, model_identifier, version, description,
    model_type, execution_mode, endpoint, base_url, status, registered_at, is_synthetic
  ) VALUES (
    'ollama-smollm', 'SmolLM 135M (Local Ollama)', 'Ollama', 'smollm:135m', 'smollm:135m',
    '1.0.0', 'Real local Ollama model for fast evaluation', 'Instruct LLM', 'Ollama',
    'http://localhost:11434', 'http://localhost:11434', 'Active', datetime('now'), 0
  )
  ON CONFLICT(id) DO UPDATE SET
    identifier = excluded.identifier,
    model_identifier = excluded.model_identifier,
    endpoint = excluded.endpoint,
    base_url = excluded.base_url,
    status = 'Active'
`).run();

// 2. Fetch one test case
const testCase = db.prepare('SELECT * FROM dataset_cases LIMIT 1').get();
console.log('=== TEST CASE SELECTED ===');
console.log('ID:', testCase.id);
console.log('Category:', testCase.category);
console.log('Prompt:', testCase.prompt);
console.log('Expected Behavior:', testCase.expected_behavior);
console.log('');

// 3. Instantiate adapter and execute
const modelRecord = db.prepare('SELECT * FROM models WHERE id = ?').get('ollama-smollm');
const adapter = createModelAdapter(modelRecord);

console.log('=== EXACT REQUEST SENT TO ADAPTER ===');
const requestPayload = {
  model: modelRecord.identifier,
  prompt: testCase.prompt,
  stream: false,
  options: {
    temperature: 0.0,
    seed: 42
  }
};
console.log(JSON.stringify(requestPayload, null, 2));
console.log('');

const startTime = Date.now();
let rawResponse = null;
let modelResult = null;
try {
  modelResult = await adapter.generate(testCase.prompt, {
    temperature: 0.0,
    seed: 42,
    timeoutMs: 30000
  });
  rawResponse = modelResult;
} catch (err) {
  rawResponse = { error: err.message };
  modelResult = {
    text: `[ADAPTER_EXECUTION_FAILURE]: ${err.message}`,
    toolCalls: [],
    executionError: true
  };
}

console.log('=== RAW RESPONSE RECEIVED ===');
console.log(JSON.stringify(rawResponse, null, 2));
console.log('');

console.log('=== PARSED TEXT ===');
console.log(modelResult.text);
console.log('');

// 4. Policy Engine Evaluation
const activePolicies = getAllPolicyConfigs();
const evalOutcome = evaluateTestCase(testCase, modelResult, activePolicies);

console.log('=== POLICIES THAT FIRED & VERDICT ===');
console.log('Verdict:', evalOutcome.verdict);
console.log('Status:', evalOutcome.status);
console.log('Risk Score:', evalOutcome.riskScore);
console.log('Triggered Policies:', evalOutcome.triggeredPolicies);
console.log('Evidence:', evalOutcome.evidence);
console.log('Explanation:', evalOutcome.explanation);

