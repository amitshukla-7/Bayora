#!/usr/bin/env node
/**
 * SentinelFlow — Independent Offline Evidence Verifier CLI
 * 
 * Verifies exported evidence bundles completely offline with zero network access.
 * Validates SHA-256 hash chaining, block sequence completeness, and ECDSA P-256 attestation.
 * 
 * Usage:
 *   node scripts/verify.mjs <bundle.json>
 *   npm run verify -- <bundle.json>
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyEvidenceBundle } from '../server/ledger.mjs';
import { verifyBundle as verifyLegacyBundle } from '../src/core/bundle.ts';

async function main() {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const filePath = args[0] || process.env.BUNDLE_FILE;

  if (!filePath) {
    console.error('Usage: node scripts/verify.mjs <bundle.json>');
    process.exit(1);
  }

  const fullPath = resolve(process.cwd(), filePath);
  let content;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch (err) {
    console.error(`[ERROR] Unable to read file at ${fullPath}: ${err.message}`);
    process.exit(1);
  }

  let bundle;
  try {
    bundle = JSON.parse(content);
  } catch (err) {
    console.error(`[ERROR] Invalid JSON syntax: ${err.message}`);
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(` SENTINELFLOW · OFFLINE EVIDENCE BUNDLE VERIFIER `);
  console.log(`======================================================`);
  console.log(`Target:    ${filePath}`);

  // Check if SentinelFlow bundle or legacy bundle
  if (bundle.manifest && Array.isArray(bundle.events)) {
    console.log(`Format:    SentinelFlow Evidence Bundle v${bundle.manifest.bundle_version || '1.0.0'}`);
    console.log(`Events:    ${bundle.manifest.event_count} blocks`);
    console.log(`Authority: ${bundle.manifest.key_label || 'Software signing key'} (${bundle.manifest.key_id || 'authority'})`);
    console.log(`Generated: ${bundle.manifest.generated_at}`);

    const result = await verifyEvidenceBundle(bundle);

    if (result.status === 'VERIFIED') {
      console.log(`\n✅ [AUDIT PROOF VALID]`);
      console.log(`   Status:             VERIFIED`);
      console.log(`   Verified Blocks:    ${result.totalEvents}/${result.totalEvents}`);
      console.log(`   Hash Continuity:    100% Intact`);
      console.log(`   Digital Signature:  Valid (ECDSA P-256)`);
      console.log(`   Genesis Anchor:     Intact`);
      console.log(`   Details:            ${result.details}`);
      console.log(`======================================================\n`);
      process.exit(0);
    } else if (result.status === 'INCOMPLETE') {
      console.error(`\n❌ [AUDIT PROOF INCOMPLETE]`);
      console.error(`   Status:             INCOMPLETE`);
      console.error(`   Missing Sequence:   #${result.failedSequence}`);
      console.error(`   Details:            ${result.details}`);
      console.log(`======================================================\n`);
      process.exit(2);
    } else {
      console.error(`\n❌ [AUDIT PROOF TAMPERED]`);
      console.error(`   Status:             TAMPERED`);
      console.error(`   Failed Sequence:    #${result.failedSequence}`);
      console.error(`   Recorded Hash:      ${result.recordedHash || 'N/A'}`);
      console.error(`   Recomputed Hash:    ${result.recomputedHash || 'N/A'}`);
      console.error(`   Details:            ${result.details}`);
      console.log(`======================================================\n`);
      process.exit(1);
    }
  } else {
    // Fallback to legacy verification
    console.log(`Format:    Legacy Diagnostic Bundle`);
    const report = await verifyLegacyBundle(bundle);
    if (report.status === 'VALID') {
      console.log(`\n✅ STATUS: VALID (${report.totalBlocks} blocks verified)`);
      process.exit(0);
    } else {
      console.error(`\n❌ STATUS: ${report.status}`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(1);
});
