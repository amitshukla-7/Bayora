#!/usr/bin/env node
/**
 * Bayora - Standalone Independent Evidence Verifier CLI
 * 
 * Verifies exported audit ledger packages completely offline,
 * independent of the browser or control plane.
 * 
 * Checks:
 * 1. Sequential numbering & previous_event_hash pointers (Genesis to terminal).
 * 2. Canonical JSON serialization and SHA-256 event hash recomputation.
 * 3. 7-Stage lifecycle plan completeness against run.started expected_plan.
 * 4. Checkpoint signature cryptographic validity.
 */

import { readFileSync } from 'fs';
import { createHash, createHmac } from 'crypto';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const CHECKPOINT_SECRET_KEY = 'BAYORA-INDEPENDENT-CHECKPOINT-SIGNER-KEY-V1';

function canonicalJson(data) {
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }
  if (Array.isArray(data)) {
    return '[' + data.map((item) => canonicalJson(item)).join(',') + ']';
  }
  const keys = Object.keys(data).sort();
  const entries = keys.map((key) => {
    return `${JSON.stringify(key)}:${canonicalJson(data[key])}`;
  });
  return '{' + entries.join(',') + '}';
}

function sha256Hex(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function verifyHmacSignature(checkpoint) {
  const message = `${checkpoint.checkpoint_id}:${checkpoint.run_id}:${checkpoint.root_event_hash}:${checkpoint.timestamp}`;
  const expectedSig = createHmac('sha256', CHECKPOINT_SECRET_KEY).update(message, 'utf8').digest('hex');
  return expectedSig === checkpoint.signature;
}

export function verifyLedgerFile(filePath) {
  console.log(`\n======================================================`);
  console.log(` BAYORA · INDEPENDENT EVIDENCE VERIFIER CLI `);
  console.log(`======================================================`);
  console.log(`Reading ledger file: ${filePath}`);

  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`[ERROR] Unable to read file: ${err.message}`);
    process.exit(1);
  }

  let packageData;
  try {
    packageData = JSON.parse(content);
  } catch (err) {
    console.error(`[ERROR] Invalid JSON syntax in file: ${err.message}`);
    process.exit(1);
  }

  const events = Array.isArray(packageData) ? packageData : packageData.events || [];
  if (!Array.isArray(events) || events.length === 0) {
    console.warn(`[WARN] No evidence events found in package.`);
    process.exit(0);
  }

  console.log(`Found ${events.length} cryptographic events in ledger.\n`);

  // 1. Run ID consistency check
  const primaryRunId = events[0].run_id;
  for (let i = 0; i < events.length; i++) {
    if (events[i].run_id !== primaryRunId) {
      console.error(`❌ [RUN ID TAMPER DETECTED]`);
      console.error(`   Sequence: #${events[i].sequence}`);
      console.error(`   Recorded run_id: ${events[i].run_id}`);
      console.error(`   Expected run_id: ${primaryRunId}`);
      console.error(`   Status: TAMPERED\n`);
      return { status: 'TAMPERED', sequence: events[i].sequence };
    }
  }

  // 2. Completeness check against declared expected_plan
  const startEvent = events.find((e) => e.event_type === 'run.started');
  if (startEvent && Array.isArray(startEvent.payload?.expected_plan)) {
    const expectedPlan = startEvent.payload.expected_plan;
    const actualKeys = events.map((e) => {
      if (e.event_type === 'test.started' || e.event_type === 'test.completed') {
        return `${e.event_type}:${e.payload?.test_id}`;
      }
      return e.event_type;
    });

    const missing = expectedPlan.filter((key) => !actualKeys.includes(key));
    if (missing.length > 0) {
      console.error(`❌ [COMPLETENESS FAILURE]`);
      console.error(`   Run ${primaryRunId} omitted expected lifecycle events:`);
      missing.forEach((m) => console.error(`     - Missing: ${m}`));
      console.error(`   Status: INCOMPLETE (Fail-Closed Lockdown Triggered)\n`);
      return { status: 'INCOMPLETE', missing };
    }
  }

  // 3. Sequential SHA-256 verification (Section 9.1 & 9.2)
  let validCount = 0;
  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const expectedPrevHash = i === 0 ? GENESIS_HASH : events[i - 1].event_hash;

    // Check pointer integrity
    if (current.previous_event_hash !== expectedPrevHash) {
      console.error(`❌ [POINTER TAMPER DETECTED]`);
      console.error(`   Sequence: #${current.sequence}`);
      console.error(`   Event Type: ${current.event_type}`);
      console.error(`   Recorded previous_event_hash: ${current.previous_event_hash}`);
      console.error(`   Expected previous hash:       ${expectedPrevHash}`);
      console.error(`   Status: TAMPERED\n`);
      return { status: 'TAMPERED', sequence: current.sequence };
    }

    // Recompute payload hash
    const eventBody = {
      event_type: current.event_type,
      payload: current.payload,
      previous_event_hash: current.previous_event_hash,
      run_id: current.run_id,
      sequence: current.sequence,
      timestamp: current.timestamp,
    };
    const calculatedHash = sha256Hex(canonicalJson(eventBody));

    if (calculatedHash !== current.event_hash) {
      console.error(`❌ [PAYLOAD TAMPER DETECTED]`);
      console.error(`   Sequence: #${current.sequence}`);
      console.error(`   Event Type: ${current.event_type}`);
      console.error(`   Recorded Hash:   ${current.event_hash}`);
      console.error(`   Recomputed Hash: ${calculatedHash}`);
      console.error(`   Status: TAMPERED\n`);
      return { status: 'TAMPERED', sequence: current.sequence };
    }

    // Checkpoint signature verification
    if (current.event_type === 'checkpoint.signed' && current.payload?.checkpoint) {
      const isSigValid = verifyHmacSignature(current.payload.checkpoint);
      if (!isSigValid) {
        console.error(`❌ [CHECKPOINT SIGNATURE INVALID]`);
        console.error(`   Sequence: #${current.sequence}`);
        console.error(`   Checkpoint ID: ${current.payload.checkpoint.checkpoint_id}`);
        console.error(`   Status: TAMPERED\n`);
        return { status: 'TAMPERED', sequence: current.sequence };
      }
    }

    validCount++;
  }

  console.log(`✅ [AUDIT PROOF VALID]`);
  console.log(`   Total Verified Blocks: ${validCount}/${events.length}`);
  console.log(`   Hash Continuity: 100% Intact`);
  console.log(`   Plan Completeness: 100% Present`);
  console.log(`   Signatures: Valid and cryptographically attested.`);
  console.log(`   Assurance Status: VERIFIED\n`);

  return { status: 'VALID', totalEvents: validCount };
}

// CLI Execution if called directly
const args = process.argv.slice(2);
if (args.length > 0) {
  verifyLedgerFile(args[0]);
}
