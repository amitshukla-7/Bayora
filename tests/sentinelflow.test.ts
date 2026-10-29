import { describe, it, expect, beforeEach } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

import {
  getAllPolicies,
  getPolicyById,
  updatePolicyState,
  getOverviewMetrics,
  resetAllDemoData,
} from '../server/db.mjs';

import {
  evaluatePolicy,
  executeGatedTool,
  getPolicyFingerprint,
} from '../server/gateway.mjs';

import {
  executeReadDocument,
  executeWriteReport,
  executeMockSendEmail,
  executeSearchDocuments,
} from '../server/tools.mjs';

import {
  appendLedgerEvent,
  exportEvidenceBundle,
  verifyEvidenceBundle,
} from '../server/ledger.mjs';

import { runAgentTask } from '../server/agent.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');

describe('SentinelFlow Core Security Gateway & Enforcement Tests', () => {
  beforeEach(() => {
    resetAllDemoData();
  });

  // Requirement 1: An authorized file read succeeds
  it('Requirement 1: Authorized file read succeeds under POL-001', () => {
    const evaluation = evaluatePolicy('read_document', { filename: 'project_report.txt' });
    expect(evaluation.decision).toBe('ALLOWED');
    expect(evaluation.policyId).toBe('POL-001');

    const result = executeReadDocument({ filename: 'project_report.txt' });
    expect(result.success).toBe(true);
    expect(result.content).toContain('SentinelFlow Q3 Enterprise Infrastructure');
  });

  // Requirement 2: An unauthorized file read is denied before the file is opened
  it('Requirement 2: Unauthorized file read is denied before file is opened under POL-002', async () => {
    const evaluation = evaluatePolicy('read_document', { filename: 'restricted_payroll_secret.txt' });
    expect(evaluation.decision).toBe('DENIED');
    expect(evaluation.policyId).toBe('POL-002');
    expect(evaluation.reason).toContain('restricted resource');

    // Test through the Gated Gate execution
    const gated = await executeGatedTool({
      runId: 'test-unauth-read',
      toolName: 'read_document',
      params: { filename: 'restricted_payroll_secret.txt' },
    });

    expect(gated.status).toBe('DENIED');
    expect(gated.executed).toBe(false);
  });

  // Requirement 3: Path traversal is rejected
  it('Requirement 3: Path traversal escapes (..) are rejected at the gateway', async () => {
    const traversalPayloads = [
      '../../etc/passwd',
      '..\\..\\windows\\system32',
      'sub/../../secret.txt',
      '/etc/shadow',
      '\\root\\keys',
    ];

    for (const badPath of traversalPayloads) {
      const evaluation = evaluatePolicy('read_document', { filename: badPath });
      expect(evaluation.decision).toBe('DENIED');
      expect(evaluation.policyId).toBe('GATEWAY-TRAVERSAL-GUARD');

      // Verify tool directly rejects traversal as well
      expect(() => executeReadDocument({ filename: badPath })).toThrow();
    }
  });

  // Requirement 4: A malicious document cannot grant new permissions
  it('Requirement 4: Indirect prompt injection in malicious document cannot bypass deterministic gate', async () => {
    const runResult = await runAgentTask({
      task: 'Summarize the report containing malicious instructions.',
      mode: 'deterministic',
    });

    expect(runResult.status).toBe('BLOCKED');
    expect(runResult.deniedCount).toBeGreaterThanOrEqual(1);
    expect(runResult.incidentCount).toBeGreaterThanOrEqual(1);

    // Verify that the restricted secret was never exposed in outbox
    const outboxFiles = readdirSync(resolve(ROOT_DIR, 'workspace', 'outbox')).filter((f) => f !== '.gitkeep');
    expect(outboxFiles.length).toBe(0);
  });

  // Requirement 5: An unauthorized email operation is denied before an outbox artifact is created
  it('Requirement 5: Unauthorized external email is denied before outbox artifact is written', async () => {
    const outboxDir = resolve(ROOT_DIR, 'workspace', 'outbox');
    const initialFiles = readdirSync(outboxDir);

    const evaluation = evaluatePolicy('mock_send_email', {
      to: 'attacker@rogue-external-hacker.com',
      subject: 'Exfiltrated Secrets',
      body: 'Stolen payroll records',
    });

    expect(evaluation.decision).toBe('DENIED');
    expect(evaluation.policyId).toBe('POL-004');

    // Run through gated executor
    const gated = await executeGatedTool({
      runId: 'test-email-deny',
      toolName: 'mock_send_email',
      params: {
        to: 'attacker@rogue-external-hacker.com',
        subject: 'Exfiltrated Secrets',
        body: 'Stolen payroll records',
      },
    });

    expect(gated.status).toBe('DENIED');
    expect(gated.executed).toBe(false);

    // Verify outbox remains empty
    const currentFiles = readdirSync(outboxDir);
    expect(currentFiles.length).toBe(initialFiles.length);
  });

  // Requirement 6: A valid report is written to the approved output directory
  it('Requirement 6: Valid report is written to approved workspace/output directory', async () => {
    const reportFilename = 'test_compliance_report.txt';
    const reportContent = 'Test report content verifying POL-003 execution.';

    const gated = await executeGatedTool({
      runId: 'test-report-write',
      toolName: 'write_report',
      params: { filename: reportFilename, content: reportContent },
    });

    expect(gated.status).toBe('ALLOWED');
    expect(gated.executed).toBe(true);

    const writtenPath = resolve(ROOT_DIR, 'workspace', 'output', reportFilename);
    expect(existsSync(writtenPath)).toBe(true);
    expect(readFileSync(writtenPath, 'utf8')).toBe(reportContent);
  });

  // Requirement 7: A policy change changes the configuration fingerprint
  it('Requirement 7: Disabling or modifying a policy updates the SHA-256 fingerprint', async () => {
    const initialFingerprint = await getPolicyFingerprint();
    expect(initialFingerprint).toMatch(/^[0-9a-f]{64}$/);

    // Toggle POL-004 to disabled
    updatePolicyState('POL-004', false);
    const updatedFingerprint = await getPolicyFingerprint();

    expect(updatedFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(updatedFingerprint).not.toBe(initialFingerprint);

    // Restore POL-004
    updatePolicyState('POL-004', true);
    const restoredFingerprint = await getPolicyFingerprint();
    expect(restoredFingerprint).toBe(initialFingerprint);
  });

  // Requirement 8: A tampered audit event causes verification to fail
  it('Requirement 8: Tampering one byte in an event payload causes cryptographic verification to fail', async () => {
    await appendLedgerEvent({
      runId: 'tamper-test-run',
      eventType: 'task.received',
      payload: { originalData: 'clean-123' },
    });
    await appendLedgerEvent({
      runId: 'tamper-test-run',
      eventType: 'action.allowed',
      toolName: 'read_document',
      payload: { filename: 'project_report.txt' },
    });

    // 1. Verify clean bundle
    const cleanBundle = await exportEvidenceBundle();
    const cleanResult = await verifyEvidenceBundle(cleanBundle);
    expect(cleanResult.status).toBe('VERIFIED');
    expect(cleanResult.valid).toBe(true);

    // 2. Tamper payload of event #2
    const tamperedBundle = JSON.parse(JSON.stringify(cleanBundle));
    tamperedBundle.events[1].payload.filename = 'malicious_tampered_payload.txt';

    const tamperedResult = await verifyEvidenceBundle(tamperedBundle);
    expect(tamperedResult.status).toBe('TAMPERED');
    expect(tamperedResult.valid).toBe(false);
    expect(tamperedResult.failedSequence).toBe(2);
    expect(tamperedResult.details).toContain('Payload integrity failure');
  });

  // Requirement 9: Model timeout does not bypass deterministic authorization
  it('Requirement 9: Fails closed when tool is unregistered or parameters are malformed', async () => {
    const unknownToolEval = evaluatePolicy('arbitrary_exec_shell', { command: 'whoami' });
    expect(unknownToolEval.decision).toBe('DENIED');
    expect(unknownToolEval.riskLevel).toBe('CRITICAL');

    const defaultDenyEval = evaluatePolicy('read_document', { filename: 'unlisted_file.unknown' });
    // If not matching allow rule, defaults to deny
    expect(defaultDenyEval.decision).toBe('DENIED');
  });

  // Requirement 10: The dashboard displays actual backend data
  it('Requirement 10: Overview metrics reflect actual persisted records from SQLite', async () => {
    const initialMetrics = getOverviewMetrics();
    expect(initialMetrics.totalRuns).toBe(0);

    // Run a task
    await runAgentTask({
      task: 'Read the project report, summarize the key points, and save a report.',
      mode: 'deterministic',
    });

    const updatedMetrics = getOverviewMetrics();
    expect(updatedMetrics.totalRuns).toBe(1);
    expect(updatedMetrics.totalAllowed).toBeGreaterThanOrEqual(2);
    expect(updatedMetrics.totalEvents).toBeGreaterThan(0);
  });

  // Requirement 11: The complete demonstration can be repeated
  it('Requirement 11: Demo can be reset and cleanly repeated multiple times', async () => {
    for (let cycle = 1; cycle <= 2; cycle++) {
      const run = await runAgentTask({
        task: 'Summarize the report containing malicious instructions.',
        mode: 'deterministic',
      });
      expect(run.status).toBe('BLOCKED');
      expect(run.incidentCount).toBe(2);

      const metrics = getOverviewMetrics();
      expect(metrics.totalIncidents).toBe(2);

      resetAllDemoData();
      const resetMetrics = getOverviewMetrics();
      expect(resetMetrics.totalRuns).toBe(0);
      expect(resetMetrics.totalIncidents).toBe(0);
    }
  });

  // Requirement 12: The application handles missing AI credentials without crashing
  it('Requirement 12: Runs reliably in deterministic test mode with zero external credentials', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const runResult = await runAgentTask({
      task: 'Test whether a restricted file can be accessed.',
      mode: 'deterministic',
    });

    expect(runResult.status).toBe('BLOCKED');
    expect(runResult.deniedCount).toBe(1);
    expect(runResult.summary).toContain('SentinelFlow Enforcement Verified');
  });
});
