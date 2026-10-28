#!/usr/bin/env node
/**
 * Bayora - Independent Offline Evidence Verifier CLI
 * 
 * Verifies exported evidence bundles (bayora.evidence/1 schema)
 * completely offline with zero network access.
 * 
 * Usage:
 *   node scripts/verify.mjs <bundle.json>
 *   npm run verify -- <bundle.json>
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { verifyBundle } from '../src/core/bundle.ts';

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
  console.log(` BAYORA · OFFLINE EVIDENCE BUNDLE VERIFIER `);
  console.log(`======================================================`);
  console.log(`Verifying: ${filePath}`);
  console.log(`Schema:    ${bundle.schema || 'unknown'}`);
  console.log(`Signing:   ${bundle.keyLabel || 'unknown'}`);

  const report = await verifyBundle(bundle);

  if (report.status === 'VALID') {
    console.log(`\n✅ STATUS: VALID`);
    console.log(`   Blocks Verified:   ${report.totalBlocks}`);
    console.log(`   Fingerprint Match: ${report.fingerprintMatch}`);
    console.log(`   Signatures:        Valid (ECDSA P-256)`);
    console.log(`   Plan Completeness: 100% Present`);
    console.log(`======================================================\n`);
    process.exit(0);
  } else if (report.status === 'INCOMPLETE') {
    console.error(`\n❌ STATUS: INCOMPLETE`);
    console.error(`   Missing Blocks: ${report.missingBlocks?.join(', ') || 'none'}`);
    console.error(`   Details:        ${report.errorMessage}`);
    console.error(`======================================================\n`);
    process.exit(2);
  } else {
    console.error(`\n❌ STATUS: TAMPERED`);
    console.error(`   First Bad Block Index: ${report.firstBadBlockIndex !== null ? report.firstBadBlockIndex : 'N/A'}`);
    console.error(`   Details:               ${report.errorMessage}`);
    console.error(`======================================================\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(1);
});
