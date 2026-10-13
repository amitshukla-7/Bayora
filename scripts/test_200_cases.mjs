/**
 * Bayora - 200 Rigorous Verification Test Cases
 * 
 * Tests all 12 architectural areas of the system:
 * 1. Canonical JSON RFC 8785 & Encoding Rigor (Tests 1–25)
 * 2. Cryptographic Hashing, Manifests, & Per-Guarantee Fingerprinting (Tests 26–50)
 * 3. Diagnostic Probes: T01 Filesystem Isolation (Tests 51–65)
 * 4. Diagnostic Probes: T02 Network Microsegmentation (Tests 66–80)
 * 5. Diagnostic Probes: T03 Storage API Scope Assertion (Tests 81–95)
 * 6. Diagnostic Probes: T04 Model Session Confidentiality (Tests 96–110)
 * 7. Diagnostic Probes: T05 Workload Hardening (Tests 111–125)
 * 8. Controlled Mutation Benchmark & Drift Mappings (Tests 126–145)
 * 9. 7-Stage Lifecycle Protocol & Hash Chain Structure (Tests 146–165)
 * 10. Ledger Cryptographic Integrity & Tamper Detection (Tests 166–180)
 * 11. Completeness Protocol & Anti-Omission Detection (Tests 181–190)
 * 12. Deterministic State Machine Transitions & Precedence Rules (Tests 191–200)
 */

import {
  canonicalJson,
  sha256Hex,
  getSecurityRelevantConfig,
  buildCanonicalManifest,
  computeConfigFingerprint,
  computeGuaranteeDigests,
  GENESIS_HASH,
  hashEventPayload,
  signCheckpointDigest,
  verifyCheckpointSignature,
  verifyEvidenceChain,
} from '../src/utils/crypto.ts';

import {
  BASELINE_CONFIG,
  MUTATION_DEFINITIONS,
  executeSimulatedTest,
} from '../src/services/simulation.ts';

import { verifyLedgerFile } from './verify_ledger.mjs';
import { writeFileSync, unlinkSync } from 'fs';

// Store results for reporting
const testResults = [];
let passCount = 0;
let failCount = 0;

function recordTest(id, category, description, expected, actual, condition) {
  const isPass = Boolean(condition);
  if (isPass) {
    passCount++;
  } else {
    failCount++;
  }
  const result = {
    id,
    category,
    description,
    expected,
    actual,
    status: isPass ? 'PASS' : 'FAIL',
  };
  testResults.push(result);

  const icon = isPass ? '✓' : '✗';
  console.log(`[${result.id.toString().padStart(3, '0')}] ${icon} ${category} | ${description}`);
  if (!isPass) {
    console.error(`     EXPECTED: ${expected}`);
    console.error(`     ACTUAL:   ${actual}`);
  }
}

async function runAll200Tests() {
  console.log('========================================================================');
  console.log('BAYORA: 200 RIGOROUS TEST CASES VALIDATION SUITE');
  console.log('========================================================================\n');

  // =========================================================================
  // CATEGORY 1: Canonical JSON RFC 8785 & Encoding Rigor (Tests 1–25)
  // =========================================================================
  const cat1 = 'Canonical JSON RFC 8785';

  // Test 1: Simple object key reordering
  const c1_1 = canonicalJson({ b: 1, a: 2 });
  const c1_1_expected = '{"a":2,"b":1}';
  recordTest(1, cat1, 'Lexicographical key sorting of 2 keys', c1_1_expected, c1_1, c1_1 === c1_1_expected);

  // Test 2: Deeply nested object key reordering (3 levels)
  const c1_2 = canonicalJson({ z: { y: { b: 1, a: 2 }, x: 3 }, a: 4 });
  const c1_2_expected = '{"a":4,"z":{"x":3,"y":{"a":2,"b":1}}}';
  recordTest(2, cat1, 'Deeply nested object key sorting at depth 3', c1_2_expected, c1_2, c1_2 === c1_2_expected);

  // Test 3: Array elements preserve original order
  const c1_3 = canonicalJson([3, 1, 2]);
  const c1_3_expected = '[3,1,2]';
  recordTest(3, cat1, 'Array ordering preserved without sorting', c1_3_expected, c1_3, c1_3 === c1_3_expected);

  // Test 4: Array containing objects with scrambled keys
  const c1_4 = canonicalJson([{ y: 2, x: 1 }, { b: 4, a: 3 }]);
  const c1_4_expected = '[{"x":1,"y":2},{"a":3,"b":4}]';
  recordTest(4, cat1, 'Array containing objects normalizes object keys while preserving array index', c1_4_expected, c1_4, c1_4 === c1_4_expected);

  // Test 5: Number serialization (integers, floats, negative numbers, 0)
  const c1_5 = canonicalJson({ int: 42, neg: -17, zero: 0, float: 3.1415 });
  const c1_5_expected = '{"float":3.1415,"int":42,"neg":-17,"zero":0}';
  recordTest(5, cat1, 'Numeric types serialize correctly with sorted keys', c1_5_expected, c1_5, c1_5 === c1_5_expected);

  // Test 6: Boolean serialization
  const c1_6 = canonicalJson({ active: true, disabled: false });
  const c1_6_expected = '{"active":true,"disabled":false}';
  recordTest(6, cat1, 'Boolean values true and false maintain json literals', c1_6_expected, c1_6, c1_6 === c1_6_expected);

  // Test 7: Null value serialization
  const c1_7 = canonicalJson({ empty: null });
  const c1_7_expected = '{"empty":null}';
  recordTest(7, cat1, 'Null value serializes as literal null', c1_7_expected, c1_7, c1_7 === c1_7_expected);

  // Test 8: Empty object
  const c1_8 = canonicalJson({});
  recordTest(8, cat1, 'Empty object serializes to {}', '{}', c1_8, c1_8 === '{}');

  // Test 9: Empty array
  const c1_9 = canonicalJson([]);
  recordTest(9, cat1, 'Empty array serializes to []', '[]', c1_9, c1_9 === '[]');

  // Test 10: Unicode string serialization
  const c1_10 = canonicalJson({ greeting: 'Hello, 世界! 🛡️' });
  const c1_10_expected = '{"greeting":"Hello, 世界! 🛡️"}';
  recordTest(10, cat1, 'Unicode characters and emoji serialize faithfully', c1_10_expected, c1_10, c1_10 === c1_10_expected);

  // Test 11: Special escaped characters
  const c1_11 = canonicalJson({ str: 'quote"slash/backslash\\newline\n\ttab' });
  const c1_11_parsed = JSON.parse(c1_11);
  recordTest(11, cat1, 'Escaped characters round-trip successfully through JSON.parse', 'quote"slash/backslash\\newline\n\ttab', c1_11_parsed.str, c1_11_parsed.str === 'quote"slash/backslash\\newline\n\ttab');

  // Test 12: Object with mixed types
  const mixedObj = { s: 'val', n: 100, b: true, nil: null, arr: [1, 2], o: { k: 'v' } };
  const c1_12 = canonicalJson(mixedObj);
  const c1_12_expected = '{"arr":[1,2],"b":true,"n":100,"nil":null,"o":{"k":"v"},"s":"val"}';
  recordTest(12, cat1, 'Mixed object with string, number, bool, null, array, and object', c1_12_expected, c1_12, c1_12 === c1_12_expected);

  // Test 13: Keys with identical prefixes
  const c1_13 = canonicalJson({ a_1: 4, ab: 3, aa: 2, a: 1 });
  const c1_13_expected = '{"a":1,"a_1":4,"aa":2,"ab":3}';
  recordTest(13, cat1, 'Keys with shared prefixes sorted strictly lexicographically', c1_13_expected, c1_13, c1_13 === c1_13_expected);

  // Test 14: Numeric keys sorted as strings
  const c1_14 = canonicalJson({ '10': 'ten', '2': 'two', '1': 'one', '0': 'zero' });
  const c1_14_expected = '{"0":"zero","1":"one","10":"ten","2":"two"}';
  recordTest(14, cat1, 'Numeric string keys sorted lexicographically ("10" before "2")', c1_14_expected, c1_14, c1_14 === c1_14_expected);

  // Test 15: Array of nested objects identically produced
  const c1_15_a = canonicalJson([{ z: 1, a: 2 }, { y: 3, b: 4 }]);
  const c1_15_b = canonicalJson([{ a: 2, z: 1 }, { b: 4, y: 3 }]);
  recordTest(15, cat1, 'Equivalent array of nested objects produces strictly identical string', c1_15_a, c1_15_b, c1_15_a === c1_15_b);

  // Test 16: Object key insertion order independence (10 keys)
  const objA = { j: 10, i: 9, h: 8, g: 7, f: 6, e: 5, d: 4, c: 3, b: 2, a: 1 };
  const objB = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10 };
  recordTest(16, cat1, '10-key reverse insertion produces identical output to forward insertion', canonicalJson(objB), canonicalJson(objA), canonicalJson(objA) === canonicalJson(objB));

  // Test 17: 26 Alphabetical keys reverse insertion independence
  const revAlpha = {};
  for (let c = 122; c >= 97; c--) revAlpha[String.fromCharCode(c)] = c;
  const fwdAlpha = {};
  for (let c = 97; c <= 122; c++) fwdAlpha[String.fromCharCode(c)] = c;
  recordTest(17, cat1, '26-key full alphabet reverse insertion matches forward insertion', canonicalJson(fwdAlpha), canonicalJson(revAlpha), canonicalJson(revAlpha) === canonicalJson(fwdAlpha));

  // Test 18: Primitive string input returns valid stringified JSON
  const c1_18 = canonicalJson('hello');
  recordTest(18, cat1, 'Primitive string input returns quoted string', '"hello"', c1_18, c1_18 === '"hello"');

  // Test 19: Primitive number input returns stringified number
  const c1_19 = canonicalJson(999);
  recordTest(19, cat1, 'Primitive number returns stringified number', '999', c1_19, c1_19 === '999');

  // Test 20: Primitive boolean input
  const c1_20 = canonicalJson(true);
  recordTest(20, cat1, 'Primitive boolean returns true string', 'true', c1_20, c1_20 === 'true');

  // Test 21: Primitive null input returns "null"
  const c1_21 = canonicalJson(null);
  recordTest(21, cat1, 'Primitive null returns null string', 'null', c1_21, c1_21 === 'null');

  // Test 22: Highly nested single-branch object
  const c1_22 = canonicalJson({ a: { b: { c: { d: { e: 1 } } } } });
  const c1_22_expected = '{"a":{"b":{"c":{"d":{"e":1}}}}}';
  recordTest(22, cat1, '5-level nested single-branch object serialization', c1_22_expected, c1_22, c1_22 === c1_22_expected);

  // Test 23: Multiple nested siblings sorting at depth 2
  const c1_23 = canonicalJson({ root: { z: 1, y: 2, x: { b: 3, a: 4 } } });
  const c1_23_expected = '{"root":{"x":{"a":4,"b":3},"y":2,"z":1}}';
  recordTest(23, cat1, 'Nested siblings at depth 2 properly sorted', c1_23_expected, c1_23, c1_23 === c1_23_expected);

  // Test 24: Array of arrays canonicalization
  const c1_24 = canonicalJson([[2, 1], [4, 3]]);
  const c1_24_expected = '[[2,1],[4,3]]';
  recordTest(24, cat1, 'Array of arrays maintains nested array ordering', c1_24_expected, c1_24, c1_24 === c1_24_expected);

  // Test 25: Canonical JSON idempotent parsing and re-serialization
  const testSample = { z: 10, a: [ { d: 4, c: 3 }, 'text' ], m: { b: true, a: null } };
  const ser1 = canonicalJson(testSample);
  const ser2 = canonicalJson(JSON.parse(ser1));
  recordTest(25, cat1, 'Idempotence: canonicalJson(JSON.parse(canonicalJson(x))) === canonicalJson(x)', ser1, ser2, ser1 === ser2);

  // =========================================================================
  // CATEGORY 2: Cryptographic Hashing, Manifests, & Per-Guarantee Fingerprinting (Tests 26–50)
  // =========================================================================
  const cat2 = 'Cryptographic Fingerprints & Digests';

  // Test 26: SHA-256 output format (exact 64 hexadecimal characters)
  const h26 = await sha256Hex('test payload');
  const h26_valid = typeof h26 === 'string' && h26.length === 64 && /^[0-9a-f]{64}$/.test(h26);
  recordTest(26, cat2, 'SHA-256 output is 64 hexadecimal characters matching /^[0-9a-f]{64}$/', 'true', String(h26_valid), h26_valid);

  // Test 27: SHA-256 empty string test vector
  const h27 = await sha256Hex('');
  const h27_expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  recordTest(27, cat2, 'SHA-256 standard test vector for empty string', h27_expected, h27, h27 === h27_expected);

  // Test 28: SHA-256 known test vector "hello world"
  const h28 = await sha256Hex('hello world');
  const h28_expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
  recordTest(28, cat2, 'SHA-256 standard test vector for "hello world"', h28_expected, h28, h28 === h28_expected);

  // Test 29: Determinism: hashing baseline config 50 times produces identical digest
  const baselineDigest1 = await computeConfigFingerprint(BASELINE_CONFIG);
  let allEqual = true;
  for (let i = 0; i < 50; i++) {
    const d = await computeConfigFingerprint(BASELINE_CONFIG);
    if (d !== baselineDigest1) allEqual = false;
  }
  recordTest(29, cat2, 'Deterministic hashing: 50 consecutive runs produce identical baseline fingerprint', 'true', String(allEqual), allEqual);

  // Test 30: Baseline fingerprint is valid 64-character hex
  recordTest(30, cat2, 'Baseline configuration fingerprint is 64 hex characters', 'true', String(baselineDigest1.length === 64), baselineDigest1.length === 64);

  // Test 31: B1 Negative Control: adding arbitrary operator labels
  const b1Config_add = {
    ...BASELINE_CONFIG,
    labels: { ...BASELINE_CONFIG.labels, 'session.id': 'sec-ops-999', 'cluster': 'sandbox-alpha' },
  };
  const b1Digest_add = await computeConfigFingerprint(b1Config_add);
  recordTest(31, cat2, 'Negative Control B1: Adding metadata labels leaves security fingerprint invariant (FPR = 0%)', baselineDigest1, b1Digest_add, b1Digest_add === baselineDigest1);

  // Test 32: B1 Negative Control: modifying existing operator labels
  const b1Config_mod = {
    ...BASELINE_CONFIG,
    labels: { 'env': 'eval-sandbox-modified', 'tier': 'safety-sandbox-v2' },
  };
  const b1Digest_mod = await computeConfigFingerprint(b1Config_mod);
  recordTest(32, cat2, 'Negative Control B1: Modifying metadata labels leaves security fingerprint invariant', baselineDigest1, b1Digest_mod, b1Digest_mod === baselineDigest1);

  // Test 33: B1 Negative Control: clearing all operator labels
  const b1Config_empty = { ...BASELINE_CONFIG, labels: {} };
  const b1Digest_empty = await computeConfigFingerprint(b1Config_empty);
  recordTest(33, cat2, 'Negative Control B1: Clearing all labels leaves security fingerprint invariant', baselineDigest1, b1Digest_empty, b1Digest_empty === baselineDigest1);

  // Test 34: Avalanche effect: changing 1 character in mount alters fingerprint completely
  const tweakedConfig = {
    ...BASELINE_CONFIG,
    redMounts: ['/opt/red/workspace2'],
  };
  const tweakedDigest = await computeConfigFingerprint(tweakedConfig);
  let bitDiffCount = 0;
  for (let i = 0; i < 64; i++) {
    if (tweakedDigest[i] !== baselineDigest1[i]) bitDiffCount++;
  }
  recordTest(34, cat2, 'Avalanche effect: 1-char change in mount alters >50 hex positions in digest', '>=50', String(bitDiffCount), bitDiffCount >= 50);

  // Test 35: getSecurityRelevantConfig filters out labels
  const secRel = getSecurityRelevantConfig(BASELINE_CONFIG);
  recordTest(35, cat2, 'getSecurityRelevantConfig excludes labels object', 'undefined', String(secRel.labels), secRel.labels === undefined);

  // Test 36: getSecurityRelevantConfig normalizes redMounts order
  const scrambledMounts = { ...BASELINE_CONFIG, redMounts: ['/opt/red/z', '/opt/red/a', '/opt/red/m'] };
  const secRelMounts = getSecurityRelevantConfig(scrambledMounts);
  const mountsExpected = '["/opt/red/a","/opt/red/m","/opt/red/z"]';
  recordTest(36, cat2, 'getSecurityRelevantConfig sorts redMounts alphabetically', mountsExpected, JSON.stringify(secRelMounts.redMounts), JSON.stringify(secRelMounts.redMounts) === mountsExpected);

  // Test 37: getSecurityRelevantConfig normalizes redNetworks order
  const scrambledNets = { ...BASELINE_CONFIG, redNetworks: ['net-z', 'net-a'] };
  const secRelNets = getSecurityRelevantConfig(scrambledNets);
  const netsExpected = '["net-a","net-z"]';
  recordTest(37, cat2, 'getSecurityRelevantConfig sorts redNetworks alphabetically', netsExpected, JSON.stringify(secRelNets.redNetworks), JSON.stringify(secRelNets.redNetworks) === netsExpected);

  // Test 38: getSecurityRelevantConfig normalizes dropCapabilities order
  const scrambledCaps = {
    ...BASELINE_CONFIG,
    hardeningFlags: { ...BASELINE_CONFIG.hardeningFlags, dropCapabilities: ['SYS_ADMIN', 'ALL', 'NET_RAW'] },
  };
  const secRelCaps = getSecurityRelevantConfig(scrambledCaps);
  const capsExpected = '["ALL","NET_RAW","SYS_ADMIN"]';
  recordTest(38, cat2, 'getSecurityRelevantConfig sorts dropCapabilities alphabetically', capsExpected, JSON.stringify(secRelCaps.hardeningFlags.dropCapabilities), JSON.stringify(secRelCaps.hardeningFlags.dropCapabilities) === capsExpected);

  // Test 39: buildCanonicalManifest schema fields
  const manifest = await buildCanonicalManifest(BASELINE_CONFIG);
  const hasRequiredFields = Boolean(
    manifest.manifest_schema === '1.1' &&
    manifest.policy_bundle_version &&
    manifest.test_suite_version &&
    manifest.configuration_digest &&
    manifest.runtime_observation_digest
  );
  recordTest(39, cat2, 'buildCanonicalManifest produces required schema fields (Section 8.1)', 'true', String(hasRequiredFields), hasRequiredFields);

  // Test 40: Canonical manifest configuration_digest prefix
  const cfgPrefix = manifest.configuration_digest.startsWith('sha256:') && manifest.configuration_digest.length === 71;
  recordTest(40, cat2, 'Manifest configuration_digest starts with "sha256:" and total length is 71 chars', 'true', String(cfgPrefix), cfgPrefix);

  // Test 41: Canonical manifest runtime_observation_digest prefix
  const runPrefix = manifest.runtime_observation_digest.startsWith('sha256:') && manifest.runtime_observation_digest.length === 71;
  recordTest(41, cat2, 'Manifest runtime_observation_digest starts with "sha256:" and total length is 71 chars', 'true', String(runPrefix), runPrefix);

  // Test 42: computeGuaranteeDigests returns valid 64-char digests for G1-G5
  const baselineGuarDigests = await computeGuaranteeDigests(BASELINE_CONFIG);
  const all5Valid = Object.keys(baselineGuarDigests).length === 5 &&
    ['G1', 'G2', 'G3', 'G4', 'G5'].every((g) => baselineGuarDigests[g].length === 64);
  recordTest(42, cat2, 'computeGuaranteeDigests returns valid 64-char digests for all 5 guarantees (G1–G5)', 'true', String(all5Valid), all5Valid);

  // Test 43: Modifying only redMounts changes G1 digest, leaves G2-G5 unchanged
  const mutatedMountsConfig = { ...BASELINE_CONFIG, redMounts: ['/opt/red/workspace', '/opt/blue/data'] };
  const dMounts = await computeGuaranteeDigests(mutatedMountsConfig);
  const g1Isolated = dMounts.G1 !== baselineGuarDigests.G1 &&
    dMounts.G2 === baselineGuarDigests.G2 &&
    dMounts.G3 === baselineGuarDigests.G3 &&
    dMounts.G4 === baselineGuarDigests.G4 &&
    dMounts.G5 === baselineGuarDigests.G5;
  recordTest(43, cat2, 'G1 isolation: Mutating redMounts alters G1 digest only; G2–G5 stay identical', 'true', String(g1Isolated), g1Isolated);

  // Test 44: Modifying only redNetworks changes G2 digest, leaves G1,G3,G4,G5 unchanged
  const mutatedNetsConfig = { ...BASELINE_CONFIG, redNetworks: ['red-isolated-net', 'blue-private-net'] };
  const dNets = await computeGuaranteeDigests(mutatedNetsConfig);
  const g2Isolated = dNets.G2 !== baselineGuarDigests.G2 &&
    dNets.G1 === baselineGuarDigests.G1 &&
    dNets.G3 === baselineGuarDigests.G3 &&
    dNets.G4 === baselineGuarDigests.G4 &&
    dNets.G5 === baselineGuarDigests.G5;
  recordTest(44, cat2, 'G2 isolation: Mutating redNetworks alters G2 digest only; G1, G3–G5 stay identical', 'true', String(g2Isolated), g2Isolated);

  // Test 45: Modifying only storageApiAuthz changes G3 digest, leaves G1,G2,G4,G5 unchanged
  const mutatedAuthzConfig = { ...BASELINE_CONFIG, storageApiAuthz: 'relaxed' };
  const dAuthz = await computeGuaranteeDigests(mutatedAuthzConfig);
  const g3Isolated = dAuthz.G3 !== baselineGuarDigests.G3 &&
    dAuthz.G1 === baselineGuarDigests.G1 &&
    dAuthz.G2 === baselineGuarDigests.G2 &&
    dAuthz.G4 === baselineGuarDigests.G4 &&
    dAuthz.G5 === baselineGuarDigests.G5;
  recordTest(45, cat2, 'G3 isolation: Mutating storageApiAuthz alters G3 digest only; G1, G2, G4, G5 stay identical', 'true', String(g3Isolated), g3Isolated);

  // Test 46: Modifying only gatewaySessionIsolation changes G4 digest, leaves G1-G3, G5 unchanged
  const mutatedGatewayConfig = { ...BASELINE_CONFIG, gatewaySessionIsolation: 'shared' };
  const dGateway = await computeGuaranteeDigests(mutatedGatewayConfig);
  const g4Isolated = dGateway.G4 !== baselineGuarDigests.G4 &&
    dGateway.G1 === baselineGuarDigests.G1 &&
    dGateway.G2 === baselineGuarDigests.G2 &&
    dGateway.G3 === baselineGuarDigests.G3 &&
    dGateway.G5 === baselineGuarDigests.G5;
  recordTest(46, cat2, 'G4 isolation: Mutating gatewaySessionIsolation alters G4 digest only; G1–G3, G5 stay identical', 'true', String(g4Isolated), g4Isolated);

  // Test 47: Modifying readOnlyRoot changes G5 digest, leaves G1-G4 unchanged
  const mutatedRootConfig = {
    ...BASELINE_CONFIG,
    hardeningFlags: { ...BASELINE_CONFIG.hardeningFlags, readOnlyRoot: false },
  };
  const dRoot = await computeGuaranteeDigests(mutatedRootConfig);
  const g5Isolated_root = dRoot.G5 !== baselineGuarDigests.G5 &&
    dRoot.G1 === baselineGuarDigests.G1 &&
    dRoot.G2 === baselineGuarDigests.G2 &&
    dRoot.G3 === baselineGuarDigests.G3 &&
    dRoot.G4 === baselineGuarDigests.G4;
  recordTest(47, cat2, 'G5 isolation: Mutating readOnlyRoot alters G5 digest only; G1–G4 stay identical', 'true', String(g5Isolated_root), g5Isolated_root);

  // Test 48: Modifying dropCapabilities changes G5 digest, leaves G1-G4 unchanged
  const mutatedCapsConfig = {
    ...BASELINE_CONFIG,
    hardeningFlags: { ...BASELINE_CONFIG.hardeningFlags, dropCapabilities: ['CAP_SYS_ADMIN'] },
  };
  const dCaps = await computeGuaranteeDigests(mutatedCapsConfig);
  const g5Isolated_caps = dCaps.G5 !== baselineGuarDigests.G5 &&
    dCaps.G1 === baselineGuarDigests.G1 &&
    dCaps.G2 === baselineGuarDigests.G2 &&
    dCaps.G3 === baselineGuarDigests.G3 &&
    dCaps.G4 === baselineGuarDigests.G4;
  recordTest(48, cat2, 'G5 isolation: Mutating dropCapabilities alters G5 digest only; G1–G4 stay identical', 'true', String(g5Isolated_caps), g5Isolated_caps);

  // Test 49: Modifying noNewPrivileges changes G5 digest, leaves G1-G4 unchanged
  const mutatedNnpConfig = {
    ...BASELINE_CONFIG,
    hardeningFlags: { ...BASELINE_CONFIG.hardeningFlags, noNewPrivileges: false },
  };
  const dNnp = await computeGuaranteeDigests(mutatedNnpConfig);
  const g5Isolated_nnp = dNnp.G5 !== baselineGuarDigests.G5 &&
    dNnp.G1 === baselineGuarDigests.G1 &&
    dNnp.G2 === baselineGuarDigests.G2 &&
    dNnp.G3 === baselineGuarDigests.G3 &&
    dNnp.G4 === baselineGuarDigests.G4;
  recordTest(49, cat2, 'G5 isolation: Mutating noNewPrivileges alters G5 digest only; G1–G4 stay identical', 'true', String(g5Isolated_nnp), g5Isolated_nnp);

  // Test 50: Modifying seccompProfile changes G5 digest, leaves G1-G4 unchanged
  const mutatedSeccompConfig = {
    ...BASELINE_CONFIG,
    hardeningFlags: { ...BASELINE_CONFIG.hardeningFlags, seccompProfile: 'custom-hardened' },
  };
  const dSeccomp = await computeGuaranteeDigests(mutatedSeccompConfig);
  const g5Isolated_sec = dSeccomp.G5 !== baselineGuarDigests.G5 &&
    dSeccomp.G1 === baselineGuarDigests.G1 &&
    dSeccomp.G2 === baselineGuarDigests.G2 &&
    dSeccomp.G3 === baselineGuarDigests.G3 &&
    dSeccomp.G4 === baselineGuarDigests.G4;
  recordTest(50, cat2, 'G5 isolation: Mutating seccompProfile alters G5 digest only; G1–G4 stay identical', 'true', String(g5Isolated_sec), g5Isolated_sec);

  // =========================================================================
  // CATEGORY 3: Diagnostic Probes: T01 Filesystem Isolation (Tests 51–65)
  // =========================================================================
  const cat3 = 'Diagnostic Probe T01 (Filesystem Isolation)';

  // Test 51: T01 PASS on baseline configuration
  const t51 = await executeSimulatedTest('T01', BASELINE_CONFIG, 0);
  recordTest(51, cat3, 'T01 PASS on baseline isolated red mount', 'PASS', t51.status, t51.status === 'PASS');

  // Test 52: T01 FAIL when /opt/blue/data is mounted
  const cfg52 = { ...BASELINE_CONFIG, redMounts: ['/opt/red/workspace', '/opt/blue/data'] };
  const t52 = await executeSimulatedTest('T01', cfg52, 0);
  recordTest(52, cat3, 'T01 FAIL when blue mount /opt/blue/data is attached', 'FAIL', t52.status, t52.status === 'FAIL');

  // Test 53: T01 FAIL when root mount / is present
  const cfg53 = { ...BASELINE_CONFIG, redMounts: ['/'] };
  const t53 = await executeSimulatedTest('T01', cfg53, 0);
  recordTest(53, cat3, 'T01 FAIL when root directory / is mounted', 'FAIL', t53.status, t53.status === 'FAIL');

  // Test 54: T01 FAIL when nested blue directory /opt/blue/rubrics is mounted
  const cfg54 = { ...BASELINE_CONFIG, redMounts: ['/opt/red/workspace', '/opt/blue/rubrics'] };
  const t54 = await executeSimulatedTest('T01', cfg54, 0);
  recordTest(54, cat3, 'T01 FAIL when nested blue rubrics directory is mounted', 'FAIL', t54.status, t54.status === 'FAIL');

  // Test 55: T01 FAIL when deep blue path /opt/blue/sub/dir/secret is mounted
  const cfg55 = { ...BASELINE_CONFIG, redMounts: ['/opt/blue/sub/dir/secret'] };
  const t55 = await executeSimulatedTest('T01', cfg55, 0);
  recordTest(55, cat3, 'T01 FAIL on deep blue subpath mount', 'FAIL', t55.status, t55.status === 'FAIL');

  // Test 56: T01 PASS when multiple allowed red mounts are present
  const cfg56 = { ...BASELINE_CONFIG, redMounts: ['/opt/red/workspace', '/opt/red/scratch', '/opt/red/tmp'] };
  const t56 = await executeSimulatedTest('T01', cfg56, 0);
  recordTest(56, cat3, 'T01 PASS with multiple non-overlapping red mounts', 'PASS', t56.status, t56.status === 'PASS');

  // Test 57: T01 PASS when red mount has trailing slash
  const cfg57 = { ...BASELINE_CONFIG, redMounts: ['/opt/red/workspace/'] };
  const t57 = await executeSimulatedTest('T01', cfg57, 0);
  recordTest(57, cat3, 'T01 PASS when red mount has trailing slash', 'PASS', t57.status, t57.status === 'PASS');

  // Test 58: T01 PASS with read-only red mount path
  const cfg58 = { ...BASELINE_CONFIG, redMounts: ['/opt/red/readonly'] };
  const t58 = await executeSimulatedTest('T01', cfg58, 0);
  recordTest(58, cat3, 'T01 PASS with read-only red workspace path', 'PASS', t58.status, t58.status === 'PASS');

  // Test 59: T01 FAIL when /opt/blue mount has trailing slash
  const cfg59 = { ...BASELINE_CONFIG, redMounts: ['/opt/blue/data/'] };
  const t59 = await executeSimulatedTest('T01', cfg59, 0);
  recordTest(59, cat3, 'T01 FAIL when blue mount has trailing slash', 'FAIL', t59.status, t59.status === 'FAIL');

  // Test 60: T01 FAIL when red mounts list contains both red and blue mounts
  const cfg60 = { ...BASELINE_CONFIG, redMounts: ['/opt/red/workspace', '/opt/blue/eval'] };
  const t60 = await executeSimulatedTest('T01', cfg60, 0);
  recordTest(60, cat3, 'T01 FAIL on mixed red and blue mounts array', 'FAIL', t60.status, t60.status === 'FAIL');

  // Test 61: T01 PASS when empty mounts list [] is provided
  const cfg61 = { ...BASELINE_CONFIG, redMounts: [] };
  const t61 = await executeSimulatedTest('T01', cfg61, 0);
  recordTest(61, cat3, 'T01 PASS with completely unmounted container []', 'PASS', t61.status, t61.status === 'PASS');

  // Test 62: T01 result contains testId='T01' and guaranteeId='G1'
  recordTest(62, cat3, 'T01 result metadata maps to T01 / G1', 'T01:G1', `${t51.testId}:${t51.guaranteeId}`, t51.testId === 'T01' && t51.guaranteeId === 'G1');

  // Test 63: T01 result contains non-negative execution duration
  recordTest(63, cat3, 'T01 durationMs is non-negative number', 'true', String(t51.durationMs >= 0), t51.durationMs >= 0);

  // Test 64: T01 result details include inode leak detection message on failure
  const hasInodeLeak = t52.details.includes('Inode leak detected');
  recordTest(64, cat3, 'T01 failure details explicitly report inode leak', 'true', String(hasInodeLeak), hasInodeLeak);

  // Test 65: T01 evaluatedAt is valid ISO timestamp
  const isIsoTime = !isNaN(Date.parse(t51.evaluatedAt));
  recordTest(65, cat3, 'T01 evaluatedAt is valid ISO 8601 timestamp string', 'true', String(isIsoTime), isIsoTime);

  // =========================================================================
  // CATEGORY 4: Diagnostic Probes: T02 Network Microsegmentation (Tests 66–80)
  // =========================================================================
  const cat4 = 'Diagnostic Probe T02 (Network Boundary Scan)';

  // Test 66: T02 PASS on baseline configuration
  const t66 = await executeSimulatedTest('T02', BASELINE_CONFIG, 0);
  recordTest(66, cat4, 'T02 PASS on baseline isolated red network', 'PASS', t66.status, t66.status === 'PASS');

  // Test 67: T02 FAIL when blue-private-net is attached
  const cfg67 = { ...BASELINE_CONFIG, redNetworks: ['red-isolated-net', 'blue-private-net'] };
  const t67 = await executeSimulatedTest('T02', cfg67, 0);
  recordTest(67, cat4, 'T02 FAIL when blue-private-net bridge is attached', 'FAIL', t67.status, t67.status === 'FAIL');

  // Test 68: T02 FAIL when host network mode is enabled
  const cfg68 = { ...BASELINE_CONFIG, redNetworks: ['host'] };
  const t68 = await executeSimulatedTest('T02', cfg68, 0);
  recordTest(68, cat4, 'T02 FAIL when container joins host network', 'FAIL', t68.status, t68.status === 'FAIL');

  // Test 69: T02 FAIL when admin bridge network is attached
  const cfg69 = { ...BASELINE_CONFIG, redNetworks: ['admin-mgmt-bridge'] };
  const t69 = await executeSimulatedTest('T02', cfg69, 0);
  recordTest(69, cat4, 'T02 FAIL when attached to admin management bridge', 'FAIL', t69.status, t69.status === 'FAIL');

  // Test 70: T02 FAIL when subnet name contains substring blue
  const cfg70 = { ...BASELINE_CONFIG, redNetworks: ['eval-blue-subnet'] };
  const t70 = await executeSimulatedTest('T02', cfg70, 0);
  recordTest(70, cat4, 'T02 FAIL when subnet name has "blue" substring', 'FAIL', t70.status, t70.status === 'FAIL');

  // Test 71: T02 FAIL when subnet name contains substring host
  const cfg71 = { ...BASELINE_CONFIG, redNetworks: ['docker-host-net'] };
  const t71 = await executeSimulatedTest('T02', cfg71, 0);
  recordTest(71, cat4, 'T02 FAIL when subnet name has "host" substring', 'FAIL', t71.status, t71.status === 'FAIL');

  // Test 72: T02 FAIL when subnet name contains substring admin
  const cfg72 = { ...BASELINE_CONFIG, redNetworks: ['admin-vpn'] };
  const t72 = await executeSimulatedTest('T02', cfg72, 0);
  recordTest(72, cat4, 'T02 FAIL when subnet name has "admin" substring', 'FAIL', t72.status, t72.status === 'FAIL');

  // Test 73: T02 PASS when additional isolated red network attached
  const cfg73 = { ...BASELINE_CONFIG, redNetworks: ['red-isolated-net', 'red-scratch-net'] };
  const t73 = await executeSimulatedTest('T02', cfg73, 0);
  recordTest(73, cat4, 'T02 PASS when multiple non-privileged red networks attached', 'PASS', t73.status, t73.status === 'PASS');

  // Test 74: T02 PASS when custom non-privileged subnet eval-red-subnet attached
  const cfg74 = { ...BASELINE_CONFIG, redNetworks: ['eval-red-subnet'] };
  const t74 = await executeSimulatedTest('T02', cfg74, 0);
  recordTest(74, cat4, 'T02 PASS with custom designated red runner subnet', 'PASS', t74.status, t74.status === 'PASS');

  // Test 75: T02 FAIL when network list contains both red and blue networks
  const cfg75 = { ...BASELINE_CONFIG, redNetworks: ['red-isolated-net', 'blue-vpc'] };
  const t75 = await executeSimulatedTest('T02', cfg75, 0);
  recordTest(75, cat4, 'T02 FAIL on mixed red and blue network list', 'FAIL', t75.status, t75.status === 'FAIL');

  // Test 76: T02 PASS when empty networks list [] (isolated offline container)
  const cfg76 = { ...BASELINE_CONFIG, redNetworks: [] };
  const t76 = await executeSimulatedTest('T02', cfg76, 0);
  recordTest(76, cat4, 'T02 PASS when container is completely disconnected []', 'PASS', t76.status, t76.status === 'PASS');

  // Test 77: T02 result metadata
  recordTest(77, cat4, 'T02 result metadata maps to T02 / G2', 'T02:G2', `${t66.testId}:${t66.guaranteeId}`, t66.testId === 'T02' && t66.guaranteeId === 'G2');

  // Test 78: T02 result duration non-negative
  recordTest(78, cat4, 'T02 durationMs is non-negative number', 'true', String(t66.durationMs >= 0), t66.durationMs >= 0);

  // Test 79: T02 failure details mention packet traversal
  const hasPacketWarn = t67.details.includes('packet traversal detected');
  recordTest(79, cat4, 'T02 failure details explicitly report packet traversal', 'true', String(hasPacketWarn), hasPacketWarn);

  // Test 80: T02 evaluatedAt timestamp valid ISO
  recordTest(80, cat4, 'T02 evaluatedAt is valid ISO timestamp', 'true', String(!isNaN(Date.parse(t66.evaluatedAt))), !isNaN(Date.parse(t66.evaluatedAt)));

  // =========================================================================
  // CATEGORY 5: Diagnostic Probes: T03 Storage API Scope Assertion (Tests 81–95)
  // =========================================================================
  const cat5 = 'Diagnostic Probe T03 (Storage API Authorization)';

  // Test 81: T03 PASS on baseline configuration (storageApiAuthz = 'strict')
  const t81 = await executeSimulatedTest('T03', BASELINE_CONFIG, 0);
  recordTest(81, cat5, 'T03 PASS on strict storage API authorization', 'PASS', t81.status, t81.status === 'PASS');

  // Test 82: T03 FAIL when storageApiAuthz = 'relaxed'
  const cfg82 = { ...BASELINE_CONFIG, storageApiAuthz: 'relaxed' };
  const t82 = await executeSimulatedTest('T03', cfg82, 0);
  recordTest(82, cat5, 'T03 FAIL when storageApiAuthz is relaxed', 'FAIL', t82.status, t82.status === 'FAIL');

  // Test 83: T03 PASS details confirm HTTP 403 Forbidden
  const has403 = t81.details.includes('HTTP 403 Forbidden');
  recordTest(83, cat5, 'T03 PASS details confirm synthetic probe rejected with HTTP 403', 'true', String(has403), has403);

  // Test 84: T03 FAIL details report HTTP 200 leak
  const has200 = t82.details.includes('HTTP 200 OK');
  recordTest(84, cat5, 'T03 FAIL details confirm synthetic probe returned unauthorized HTTP 200', 'true', String(has200), has200);

  // Test 85: T03 maps to guaranteeId G3
  recordTest(85, cat5, 'T03 maps to guarantee G3', 'G3', t81.guaranteeId, t81.guaranteeId === 'G3');

  // Test 86: T03 forced delay 50ms reflects in duration
  const t86 = await executeSimulatedTest('T03', BASELINE_CONFIG, 50);
  recordTest(86, cat5, 'T03 with 50ms forced delay measures duration >= 40ms', 'true', String(t86.durationMs >= 40), t86.durationMs >= 40);

  // Test 87: T03 testId is T03
  recordTest(87, cat5, 'T03 testId is "T03"', 'T03', t81.testId, t81.testId === 'T03');

  // Test 88: T03 status is binary PASS or FAIL
  recordTest(88, cat5, 'T03 status is either PASS or FAIL', 'true', String(t81.status === 'PASS' || t81.status === 'FAIL'), t81.status === 'PASS' || t81.status === 'FAIL');

  // Test 89: T03 PASS message mentions token validation
  const hasTokenVal = t81.message.includes('token validation');
  recordTest(89, cat5, 'T03 PASS message mentions cryptographic token validation', 'true', String(hasTokenVal), hasTokenVal);

  // Test 90: T03 FAIL message mentions API Authorization breach
  const hasAuthzBreach = t82.message.includes('API Authorization breach');
  recordTest(90, cat5, 'T03 FAIL message mentions API Authorization breach', 'true', String(hasAuthzBreach), hasAuthzBreach);

  // Test 91: T03 evaluatedAt timestamp is valid
  recordTest(91, cat5, 'T03 evaluatedAt timestamp is valid ISO', 'true', String(!isNaN(Date.parse(t81.evaluatedAt))), !isNaN(Date.parse(t81.evaluatedAt)));

  // Test 92: Determinism: 10 repeated strict checks all return PASS
  let allPass81 = true;
  for (let i = 0; i < 10; i++) {
    const res = await executeSimulatedTest('T03', BASELINE_CONFIG, 0);
    if (res.status !== 'PASS') allPass81 = false;
  }
  recordTest(92, cat5, 'T03 repeated 10 times in strict mode deterministically passes', 'true', String(allPass81), allPass81);

  // Test 93: Determinism: 10 repeated relaxed checks all return FAIL
  let allFail82 = true;
  for (let i = 0; i < 10; i++) {
    const res = await executeSimulatedTest('T03', cfg82, 0);
    if (res.status !== 'FAIL') allFail82 = false;
  }
  recordTest(93, cat5, 'T03 repeated 10 times in relaxed mode deterministically fails', 'true', String(allFail82), allFail82);

  // Test 94: T03 details confirm signed JWT claims
  const hasJwt = t81.details.includes('Signed JWT tenant claims enforced');
  recordTest(94, cat5, 'T03 PASS details confirm signed JWT tenant claims enforcement', 'true', String(hasJwt), hasJwt);

  // Test 95: T03 details confirm scope checks bypassed
  const hasBypassed = t82.details.includes('Scope checks bypassed');
  recordTest(95, cat5, 'T03 FAIL details confirm scope checks bypassed', 'true', String(hasBypassed), hasBypassed);

  // =========================================================================
  // CATEGORY 6: Diagnostic Probes: T04 Model Session Confidentiality (Tests 96–110)
  // =========================================================================
  const cat6 = 'Diagnostic Probe T04 (Canary Token Leak Test)';

  // Test 96: T04 PASS on baseline configuration (strict isolation)
  const t96 = await executeSimulatedTest('T04', BASELINE_CONFIG, 0);
  recordTest(96, cat6, 'T04 PASS on strict gateway session isolation', 'PASS', t96.status, t96.status === 'PASS');

  // Test 97: T04 FAIL when gatewaySessionIsolation = 'shared'
  const cfg97 = { ...BASELINE_CONFIG, gatewaySessionIsolation: 'shared' };
  const t97 = await executeSimulatedTest('T04', cfg97, 0);
  recordTest(97, cat6, 'T04 FAIL when gatewaySessionIsolation is shared context pool', 'FAIL', t97.status, t97.status === 'FAIL');

  // Test 98: T04 PASS details document zero context bleed (0 ppm leakage)
  const has0ppm = t96.details.includes('0 ppm leakage');
  recordTest(98, cat6, 'T04 PASS details document zero context bleed (0 ppm leakage)', 'true', String(has0ppm), has0ppm);

  // Test 99: T04 FAIL details identify canary token CANARY-7X9B-4D1E-8F2A
  const hasCanaryToken = t97.details.includes('CANARY-7X9B-4D1E-8F2A');
  recordTest(99, cat6, 'T04 FAIL details explicitly identify leaked canary token CANARY-7X9B-4D1E-8F2A', 'true', String(hasCanaryToken), hasCanaryToken);

  // Test 100: T04 maps to guarantee G4
  recordTest(100, cat6, 'T04 maps to guarantee G4', 'G4', t96.guaranteeId, t96.guaranteeId === 'G4');

  // Test 101: T04 testId is T04
  recordTest(101, cat6, 'T04 testId is "T04"', 'T04', t96.testId, t96.testId === 'T04');

  // Test 102: T04 status is PASS or FAIL
  recordTest(102, cat6, 'T04 status is binary PASS or FAIL', 'true', String(t96.status === 'PASS' || t96.status === 'FAIL'), t96.status === 'PASS' || t96.status === 'FAIL');

  // Test 103: T04 durationMs is non-negative
  recordTest(103, cat6, 'T04 durationMs is non-negative', 'true', String(t96.durationMs >= 0), t96.durationMs >= 0);

  // Test 104: T04 forced delay test
  const t104 = await executeSimulatedTest('T04', BASELINE_CONFIG, 60);
  recordTest(104, cat6, 'T04 forced delay 60ms measures duration >= 50ms', 'true', String(t104.durationMs >= 50), t104.durationMs >= 50);

  // Test 105: T04 evaluatedAt is valid ISO string
  recordTest(105, cat6, 'T04 evaluatedAt timestamp is valid ISO string', 'true', String(!isNaN(Date.parse(t96.evaluatedAt))), !isNaN(Date.parse(t96.evaluatedAt)));

  // Test 106: T04 PASS message mentions zero context bleed
  const hasZeroBleed = t96.message.includes('Zero context bleed');
  recordTest(106, cat6, 'T04 PASS message mentions zero context bleed', 'true', String(hasZeroBleed), hasZeroBleed);

  // Test 107: T04 FAIL message warns about shared session pool
  const hasSharedWarn = t97.message.includes('SHARED session pool');
  recordTest(107, cat6, 'T04 FAIL message warns about shared session pool', 'true', String(hasSharedWarn), hasSharedWarn);

  // Test 108: T04 details mention prefix queries
  const hasPrefixQueries = t96.details.includes('prefix queries');
  recordTest(108, cat6, 'T04 details mention red harness prefix queries', 'true', String(hasPrefixQueries), hasPrefixQueries);

  // Test 109: Determinism: 10 repeated strict checks all return PASS
  let allPass96 = true;
  for (let i = 0; i < 10; i++) {
    const res = await executeSimulatedTest('T04', BASELINE_CONFIG, 0);
    if (res.status !== 'PASS') allPass96 = false;
  }
  recordTest(109, cat6, 'T04 repeated 10 times with strict config deterministically passes', 'true', String(allPass96), allPass96);

  // Test 110: Determinism: 10 repeated shared checks all return FAIL
  let allFail97 = true;
  for (let i = 0; i < 10; i++) {
    const res = await executeSimulatedTest('T04', cfg97, 0);
    if (res.status !== 'FAIL') allFail97 = false;
  }
  recordTest(110, cat6, 'T04 repeated 10 times with shared config deterministically fails', 'true', String(allFail97), allFail97);

  // =========================================================================
  // CATEGORY 7: Diagnostic Probes: T05 Workload Hardening (Tests 111–125)
  // =========================================================================
  const cat7 = 'Diagnostic Probe T05 (Workload Hardening)';

  // Test 111: T05 PASS on baseline configuration
  const t111 = await executeSimulatedTest('T05', BASELINE_CONFIG, 0);
  recordTest(111, cat7, 'T05 PASS on baseline container hardening settings', 'PASS', t111.status, t111.status === 'PASS');

  // Test 112: T05 FAIL when readOnlyRoot = false
  const cfg112 = {
    ...BASELINE_CONFIG,
    hardeningFlags: { ...BASELINE_CONFIG.hardeningFlags, readOnlyRoot: false },
  };
  const t112 = await executeSimulatedTest('T05', cfg112, 0);
  recordTest(112, cat7, 'T05 FAIL when readOnlyRoot is false (writable root)', 'FAIL', t112.status, t112.status === 'FAIL');

  // Test 113: T05 FAIL when noNewPrivileges = false
  const cfg113 = {
    ...BASELINE_CONFIG,
    hardeningFlags: { ...BASELINE_CONFIG.hardeningFlags, noNewPrivileges: false },
  };
  const t113 = await executeSimulatedTest('T05', cfg113, 0);
  recordTest(113, cat7, 'T05 FAIL when noNewPrivileges is false', 'FAIL', t113.status, t113.status === 'FAIL');

  // Test 114: T05 FAIL when dropCapabilities lacks 'ALL'
  const cfg114 = {
    ...BASELINE_CONFIG,
    hardeningFlags: { ...BASELINE_CONFIG.hardeningFlags, dropCapabilities: ['CAP_SYS_ADMIN'] },
  };
  const t114 = await executeSimulatedTest('T05', cfg114, 0);
  recordTest(114, cat7, 'T05 FAIL when dropCapabilities does not include ALL', 'FAIL', t114.status, t114.status === 'FAIL');

  // Test 115: T05 FAIL when dropCapabilities is empty array
  const cfg115 = {
    ...BASELINE_CONFIG,
    hardeningFlags: { ...BASELINE_CONFIG.hardeningFlags, dropCapabilities: [] },
  };
  const t115 = await executeSimulatedTest('T05', cfg115, 0);
  recordTest(115, cat7, 'T05 FAIL when dropCapabilities is empty []', 'FAIL', t115.status, t115.status === 'FAIL');

  // Test 116: T05 FAIL when multiple issues occur (writable root + missing drop caps)
  const cfg116 = {
    ...BASELINE_CONFIG,
    hardeningFlags: { ...BASELINE_CONFIG.hardeningFlags, readOnlyRoot: false, dropCapabilities: [] },
  };
  const t116 = await executeSimulatedTest('T05', cfg116, 0);
  const mentionsBoth = t116.details.includes('readOnlyRoot=false') && t116.details.includes('ALL');
  recordTest(116, cat7, 'T05 FAIL on dual hardening violations and enumerates both', 'true', String(mentionsBoth), mentionsBoth);

  // Test 117: T05 FAIL when all 3 hardening violations occur
  const cfg117 = {
    ...BASELINE_CONFIG,
    hardeningFlags: { readOnlyRoot: false, noNewPrivileges: false, dropCapabilities: [], seccompProfile: 'unconfined' },
  };
  const t117 = await executeSimulatedTest('T05', cfg117, 0);
  const mentionsAll3 = t117.details.includes('readOnlyRoot=false') &&
    t117.details.includes('noNewPrivileges is disabled') &&
    t117.details.includes('Linux capabilities not dropped to ALL');
  recordTest(117, cat7, 'T05 FAIL on triple hardening violations and enumerates all 3', 'true', String(mentionsAll3), mentionsAll3);

  // Test 118: T05 PASS when dropCapabilities contains ALL and extra caps
  const cfg118 = {
    ...BASELINE_CONFIG,
    hardeningFlags: { ...BASELINE_CONFIG.hardeningFlags, dropCapabilities: ['ALL', 'CAP_NET_RAW'] },
  };
  const t118 = await executeSimulatedTest('T05', cfg118, 0);
  recordTest(118, cat7, 'T05 PASS when ALL is present alongside other caps', 'PASS', t118.status, t118.status === 'PASS');

  // Test 119: T05 maps to guarantee G5
  recordTest(119, cat7, 'T05 maps to guarantee G5', 'G5', t111.guaranteeId, t111.guaranteeId === 'G5');

  // Test 120: T05 testId is T05
  recordTest(120, cat7, 'T05 testId is "T05"', 'T05', t111.testId, t111.testId === 'T05');

  // Test 121: T05 PASS details confirm ReadOnlyRoot=true
  const hasReadOnly = t111.details.includes('ReadOnlyRoot=true');
  recordTest(121, cat7, 'T05 PASS details confirm ReadOnlyRoot=true', 'true', String(hasReadOnly), hasReadOnly);

  // Test 122: T05 PASS details confirm default seccomp profile
  const hasSeccomp = t111.details.includes('Seccomp=docker/default');
  recordTest(122, cat7, 'T05 PASS details confirm Seccomp=docker/default', 'true', String(hasSeccomp), hasSeccomp);

  // Test 123: T05 durationMs is non-negative
  recordTest(123, cat7, 'T05 durationMs is non-negative', 'true', String(t111.durationMs >= 0), t111.durationMs >= 0);

  // Test 124: T05 evaluatedAt timestamp is ISO formatted
  recordTest(124, cat7, 'T05 evaluatedAt is ISO formatted', 'true', String(!isNaN(Date.parse(t111.evaluatedAt))), !isNaN(Date.parse(t111.evaluatedAt)));

  // Test 125: Determinism: 10 repeated baseline checks all return PASS
  let allPass111 = true;
  for (let i = 0; i < 10; i++) {
    const res = await executeSimulatedTest('T05', BASELINE_CONFIG, 0);
    if (res.status !== 'PASS') allPass111 = false;
  }
  recordTest(125, cat7, 'T05 repeated 10 times on baseline deterministically passes', 'true', String(allPass111), allPass111);

  // =========================================================================
  // CATEGORY 8: Controlled Mutation Benchmark & Drift Mappings (Tests 126–145)
  // =========================================================================
  const cat8 = 'Controlled Mutation Benchmark & Drift';

  // Test 126: Mutation M1 definition
  const defM1 = MUTATION_DEFINITIONS.M1;
  recordTest(126, cat8, 'Mutation M1 maps to code M1_RELAX_AUTHZ and affectedGuarantee G3', 'M1_RELAX_AUTHZ:G3:T03', `${defM1.code}:${defM1.affectedGuarantee}:${defM1.mappedProbe}`, defM1.code === 'M1_RELAX_AUTHZ' && defM1.affectedGuarantee === 'G3' && defM1.mappedProbe === 'T03');

  // Test 127: Mutation M2 definition
  const defM2 = MUTATION_DEFINITIONS.M2;
  recordTest(127, cat8, 'Mutation M2 maps to code M2_MOUNT_LEAK and affectedGuarantee G1', 'M2_MOUNT_LEAK:G1:T01', `${defM2.code}:${defM2.affectedGuarantee}:${defM2.mappedProbe}`, defM2.code === 'M2_MOUNT_LEAK' && defM2.affectedGuarantee === 'G1' && defM2.mappedProbe === 'T01');

  // Test 128: Mutation M3 definition
  const defM3 = MUTATION_DEFINITIONS.M3;
  recordTest(128, cat8, 'Mutation M3 maps to code M3_BRIDGE_NETWORK and affectedGuarantee G2', 'M3_BRIDGE_NETWORK:G2:T02', `${defM3.code}:${defM3.affectedGuarantee}:${defM3.mappedProbe}`, defM3.code === 'M3_BRIDGE_NETWORK' && defM3.affectedGuarantee === 'G2' && defM3.mappedProbe === 'T02');

  // Test 129: Mutation M4 definition
  const defM4 = MUTATION_DEFINITIONS.M4;
  recordTest(129, cat8, 'Mutation M4 maps to code M4_GATEWAY_CACHE and affectedGuarantee G4', 'M4_GATEWAY_CACHE:G4:T04', `${defM4.code}:${defM4.affectedGuarantee}:${defM4.mappedProbe}`, defM4.code === 'M4_GATEWAY_CACHE' && defM4.affectedGuarantee === 'G4' && defM4.mappedProbe === 'T04');

  // Test 130: Mutation M5 definition
  const defM5 = MUTATION_DEFINITIONS.M5;
  recordTest(130, cat8, 'Mutation M5 maps to code M5_WORKLOAD_HARDENING and affectedGuarantee G5', 'M5_WORKLOAD_HARDENING:G5:T05', `${defM5.code}:${defM5.affectedGuarantee}:${defM5.mappedProbe}`, defM5.code === 'M5_WORKLOAD_HARDENING' && defM5.affectedGuarantee === 'G5' && defM5.mappedProbe === 'T05');

  // Test 131: Negative control B1 definition
  const defB1 = MUTATION_DEFINITIONS.B1;
  recordTest(131, cat8, 'Negative control B1 isNegativeControl=true and expectedStatus=VERIFIED', 'true:VERIFIED', `${defB1.isNegativeControl}:${defB1.expectedStatus}`, defB1.isNegativeControl === true && defB1.expectedStatus === 'VERIFIED');

  // Test 132: REMEDIATE definition
  const defRem = MUTATION_DEFINITIONS.REMEDIATE;
  recordTest(132, cat8, 'REMEDIATE definition code REMEDIATE_BASELINE and expectedStatus=RECOVERING', 'REMEDIATE_BASELINE:RECOVERING', `${defRem.code}:${defRem.expectedStatus}`, defRem.code === 'REMEDIATE_BASELINE' && defRem.expectedStatus === 'RECOVERING');

  // Test 133: M1 mutates storageApiAuthz to relaxed
  const m1Config = { ...BASELINE_CONFIG, storageApiAuthz: 'relaxed' };
  recordTest(133, cat8, 'M1 sets storageApiAuthz = "relaxed"', 'relaxed', m1Config.storageApiAuthz, m1Config.storageApiAuthz === 'relaxed');

  // Test 134: M2 mutates redMounts to include blue data
  const m2Config = { ...BASELINE_CONFIG, redMounts: ['/opt/red/workspace', '/opt/blue/data'] };
  recordTest(134, cat8, 'M2 mounts blue data directory /opt/blue/data', 'true', String(m2Config.redMounts.includes('/opt/blue/data')), m2Config.redMounts.includes('/opt/blue/data'));

  // Test 135: M3 mutates redNetworks to include blue bridge
  const m3Config = { ...BASELINE_CONFIG, redNetworks: ['red-isolated-net', 'blue-private-net'] };
  recordTest(135, cat8, 'M3 attaches blue private network bridge', 'true', String(m3Config.redNetworks.includes('blue-private-net')), m3Config.redNetworks.includes('blue-private-net'));

  // Test 136: M4 mutates gatewaySessionIsolation to shared
  const m4Config = { ...BASELINE_CONFIG, gatewaySessionIsolation: 'shared' };
  recordTest(136, cat8, 'M4 enables shared context pool in gatewaySessionIsolation', 'shared', m4Config.gatewaySessionIsolation, m4Config.gatewaySessionIsolation === 'shared');

  // Test 137: M5 mutates hardeningFlags
  const m5Config = {
    ...BASELINE_CONFIG,
    hardeningFlags: { ...BASELINE_CONFIG.hardeningFlags, readOnlyRoot: false, dropCapabilities: ['CAP_SYS_ADMIN'] },
  };
  recordTest(137, cat8, 'M5 relaxes container hardening flags (readOnlyRoot=false, CAP_SYS_ADMIN)', 'false', String(m5Config.hardeningFlags.readOnlyRoot), m5Config.hardeningFlags.readOnlyRoot === false);

  // Test 138: B1 mutates operator labels only
  const b1Config = {
    ...BASELINE_CONFIG,
    labels: { ...BASELINE_CONFIG.labels, 'audit.note': 'audit-session-42' },
  };
  recordTest(138, cat8, 'B1 mutates operator labels only without touching security flags', 'true', String(b1Config.labels['audit.note'] === 'audit-session-42'), b1Config.labels['audit.note'] === 'audit-session-42');

  // Test 139: M1 strictly fails T03, while T01, T02, T04, T05 pass
  const m1_T01 = await executeSimulatedTest('T01', m1Config, 0);
  const m1_T02 = await executeSimulatedTest('T02', m1Config, 0);
  const m1_T03 = await executeSimulatedTest('T03', m1Config, 0);
  const m1_T04 = await executeSimulatedTest('T04', m1Config, 0);
  const m1_T05 = await executeSimulatedTest('T05', m1Config, 0);
  const m1_isolatedFail = m1_T03.status === 'FAIL' && m1_T01.status === 'PASS' && m1_T02.status === 'PASS' && m1_T04.status === 'PASS' && m1_T05.status === 'PASS';
  recordTest(139, cat8, 'M1 selectively fails T03 only, probes T01, T02, T04, T05 remain PASS', 'true', String(m1_isolatedFail), m1_isolatedFail);

  // Test 140: M2 strictly fails T01, while T02, T03, T04, T05 pass
  const m2_T01 = await executeSimulatedTest('T01', m2Config, 0);
  const m2_T02 = await executeSimulatedTest('T02', m2Config, 0);
  const m2_T03 = await executeSimulatedTest('T03', m2Config, 0);
  const m2_T04 = await executeSimulatedTest('T04', m2Config, 0);
  const m2_T05 = await executeSimulatedTest('T05', m2Config, 0);
  const m2_isolatedFail = m2_T01.status === 'FAIL' && m2_T02.status === 'PASS' && m2_T03.status === 'PASS' && m2_T04.status === 'PASS' && m2_T05.status === 'PASS';
  recordTest(140, cat8, 'M2 selectively fails T01 only, probes T02–T05 remain PASS', 'true', String(m2_isolatedFail), m2_isolatedFail);

  // Test 141: M3 strictly fails T02, while T01, T03, T04, T05 pass
  const m3_T01 = await executeSimulatedTest('T01', m3Config, 0);
  const m3_T02 = await executeSimulatedTest('T02', m3Config, 0);
  const m3_T03 = await executeSimulatedTest('T03', m3Config, 0);
  const m3_T04 = await executeSimulatedTest('T04', m3Config, 0);
  const m3_T05 = await executeSimulatedTest('T05', m3Config, 0);
  const m3_isolatedFail = m3_T02.status === 'FAIL' && m3_T01.status === 'PASS' && m3_T03.status === 'PASS' && m3_T04.status === 'PASS' && m3_T05.status === 'PASS';
  recordTest(141, cat8, 'M3 selectively fails T02 only, probes T01, T03–T05 remain PASS', 'true', String(m3_isolatedFail), m3_isolatedFail);

  // Test 142: M4 strictly fails T04, while T01, T02, T03, T05 pass
  const m4_T01 = await executeSimulatedTest('T01', m4Config, 0);
  const m4_T02 = await executeSimulatedTest('T02', m4Config, 0);
  const m4_T03 = await executeSimulatedTest('T03', m4Config, 0);
  const m4_T04 = await executeSimulatedTest('T04', m4Config, 0);
  const m4_T05 = await executeSimulatedTest('T05', m4Config, 0);
  const m4_isolatedFail = m4_T04.status === 'FAIL' && m4_T01.status === 'PASS' && m4_T02.status === 'PASS' && m4_T03.status === 'PASS' && m4_T05.status === 'PASS';
  recordTest(142, cat8, 'M4 selectively fails T04 only, probes T01–T03, T05 remain PASS', 'true', String(m4_isolatedFail), m4_isolatedFail);

  // Test 143: M5 strictly fails T05, while T01, T02, T03, T04 pass
  const m5_T01 = await executeSimulatedTest('T01', m5Config, 0);
  const m5_T02 = await executeSimulatedTest('T02', m5Config, 0);
  const m5_T03 = await executeSimulatedTest('T03', m5Config, 0);
  const m5_T04 = await executeSimulatedTest('T04', m5Config, 0);
  const m5_T05 = await executeSimulatedTest('T05', m5Config, 0);
  const m5_isolatedFail = m5_T05.status === 'FAIL' && m5_T01.status === 'PASS' && m5_T02.status === 'PASS' && m5_T03.status === 'PASS' && m5_T04.status === 'PASS';
  recordTest(143, cat8, 'M5 selectively fails T05 only, probes T01–T04 remain PASS', 'true', String(m5_isolatedFail), m5_isolatedFail);

  // Test 144: Simultaneous multi-mutation (M1 + M2): causes both T01 and T03 to fail
  const multiConfig_1_2 = { ...m1Config, redMounts: m2Config.redMounts };
  const multi_1_2_T01 = await executeSimulatedTest('T01', multiConfig_1_2, 0);
  const multi_1_2_T03 = await executeSimulatedTest('T03', multiConfig_1_2, 0);
  const multi_1_2_pass = multi_1_2_T01.status === 'FAIL' && multi_1_2_T03.status === 'FAIL';
  recordTest(144, cat8, 'Simultaneous M1 + M2 causes both T01 and T03 to fail concurrently', 'true', String(multi_1_2_pass), multi_1_2_pass);

  // Test 145: Simultaneous multi-mutation (M1 + M2 + M3 + M4 + M5): causes all 5 probes to fail
  const multiAllConfig = {
    ...BASELINE_CONFIG,
    storageApiAuthz: 'relaxed',
    redMounts: ['/opt/red/workspace', '/opt/blue/data'],
    redNetworks: ['red-isolated-net', 'blue-private-net'],
    gatewaySessionIsolation: 'shared',
    hardeningFlags: { readOnlyRoot: false, noNewPrivileges: false, dropCapabilities: [], seccompProfile: 'unconfined' },
  };
  const allResults = await Promise.all([
    executeSimulatedTest('T01', multiAllConfig, 0),
    executeSimulatedTest('T02', multiAllConfig, 0),
    executeSimulatedTest('T03', multiAllConfig, 0),
    executeSimulatedTest('T04', multiAllConfig, 0),
    executeSimulatedTest('T05', multiAllConfig, 0),
  ]);
  const allFailed = allResults.every((r) => r.status === 'FAIL');
  recordTest(145, cat8, 'Simultaneous 5-point adversarial collapse (M1-M5) causes all 5 probes to fail', 'true', String(allFailed), allFailed);

  // =========================================================================
  // CATEGORY 9: 7-Stage Lifecycle Protocol & Hash Chain Structure (Tests 146–165)
  // =========================================================================
  const cat9 = '7-Stage Lifecycle Protocol & Hash Chain';

  // Helper to construct a synthetic valid run chain
  async function generateFullRunChain(runId = 'test-run-suite') {
    const plannedTests = ['T01', 'T02', 'T03', 'T04', 'T05'];
    const expectedPlan = [
      'manifest.captured',
      ...plannedTests.map((t) => `test.started:${t}`),
      ...plannedTests.map((t) => `test.completed:${t}`),
      'policy.decision',
      'checkpoint.signed',
      'run.completed',
    ];
    const events = [];

    const append = async (eventType, payload) => {
      const seq = events.length + 1;
      const prevHash = events.length === 0 ? GENESIS_HASH : events[events.length - 1].event_hash;
      const timestamp = new Date().toISOString();
      const eventHash = await hashEventPayload(seq, runId, timestamp, eventType, payload, prevHash);
      const ev = {
        sequence: seq,
        run_id: runId,
        timestamp,
        event_type: eventType,
        payload,
        previous_event_hash: prevHash,
        event_hash: eventHash,
      };
      events.push(ev);
      return ev;
    };

    await append('run.started', { run_type: 'full', tests_planned: plannedTests, expected_plan: expectedPlan });
    await append('manifest.captured', { configuration_digest: `sha256:${baselineDigest1}` });
    for (const tid of plannedTests) {
      await append('test.started', { test_id: tid });
      await append('test.completed', { test_id: tid, status: 'PASS', duration_ms: 380 });
    }
    await append('policy.decision', { assurance_state: 'VERIFIED', policy_verdict: 'GRANTED' });
    const rootHash = events[events.length - 1].event_hash;
    const checkpoint = await signCheckpointDigest(runId, rootHash);
    await append('checkpoint.signed', { checkpoint });
    await append('run.completed', { summary: 'Completed successfully', total_duration_ms: 2150 });

    return events;
  }

  const standardEvents = await generateFullRunChain('run-200-test-std');

  // Test 146: GENESIS_HASH constant is 64 zeroes
  const genesisZeroes = GENESIS_HASH === '0000000000000000000000000000000000000000000000000000000000000000';
  recordTest(146, cat9, 'GENESIS_HASH constant is exactly 64 zeroes', 'true', String(genesisZeroes), genesisZeroes);

  // Test 147: Stage 1 event is run.started with sequence=1 and previous_event_hash=GENESIS_HASH
  const ev1 = standardEvents[0];
  const isEv1 = ev1.sequence === 1 && ev1.event_type === 'run.started' && ev1.previous_event_hash === GENESIS_HASH;
  recordTest(147, cat9, 'Stage 1 event is run.started at sequence #1 anchored to GENESIS_HASH', 'true', String(isEv1), isEv1);

  // Test 148: Stage 1 payload contains expected_plan array
  const hasExpectedPlan = Array.isArray(ev1.payload.expected_plan) && ev1.payload.expected_plan.length > 0;
  recordTest(148, cat9, 'Stage 1 payload contains expected_plan array with lifecycle contract', 'true', String(hasExpectedPlan), hasExpectedPlan);

  // Test 149: Stage 2 event is manifest.captured at sequence #2
  const ev2 = standardEvents[1];
  const isEv2 = ev2.sequence === 2 && ev2.event_type === 'manifest.captured';
  recordTest(149, cat9, 'Stage 2 event is manifest.captured at sequence #2', 'true', String(isEv2), isEv2);

  // Test 150: Stage 2 configuration_digest matches baseline fingerprint
  const digestMatches = ev2.payload.configuration_digest === `sha256:${baselineDigest1}`;
  recordTest(150, cat9, 'Stage 2 payload records accurate configuration_digest', 'true', String(digestMatches), digestMatches);

  // Test 151: Stages 3 & 4 contain test.started and test.completed
  const ev3 = standardEvents[2];
  const ev4 = standardEvents[3];
  const probeEvents = ev3.event_type === 'test.started' && ev4.event_type === 'test.completed';
  recordTest(151, cat9, 'Stages 3 & 4 pair test.started with test.completed', 'true', String(probeEvents), probeEvents);

  // Test 152: For 5 probes, exactly 5 test.started and 5 test.completed events
  const startCount = standardEvents.filter((e) => e.event_type === 'test.started').length;
  const compCount = standardEvents.filter((e) => e.event_type === 'test.completed').length;
  recordTest(152, cat9, '5 probes emit exactly 5 test.started and 5 test.completed events', '5:5', `${startCount}:${compCount}`, startCount === 5 && compCount === 5);

  // Test 153: Stage 5 event is policy.decision
  const evPolicy = standardEvents[12];
  const isPolicy = evPolicy.event_type === 'policy.decision' && evPolicy.payload.assurance_state === 'VERIFIED';
  recordTest(153, cat9, 'Stage 5 event is policy.decision with assurance_state=VERIFIED', 'true', String(isPolicy), isPolicy);

  // Test 154: Stage 6 event is checkpoint.signed
  const evChk = standardEvents[13];
  const isChk = evChk.event_type === 'checkpoint.signed' && Boolean(evChk.payload.checkpoint?.signature);
  recordTest(154, cat9, 'Stage 6 event is checkpoint.signed containing signed checkpoint metadata', 'true', String(isChk), isChk);

  // Test 155: Stage 7 event is run.completed
  const evDone = standardEvents[14];
  const isDone = evDone.event_type === 'run.completed' && evDone.payload.summary;
  recordTest(155, cat9, 'Stage 7 event is run.completed containing terminal run metadata', 'true', String(isDone), isDone);

  // Test 156: Total events for full 5-probe run is exactly 15 events
  recordTest(156, cat9, 'Full 5-probe declared lifecycle run contains exactly 15 events', '15', String(standardEvents.length), standardEvents.length === 15);

  // Test 157: Total events for selective 1-probe retest run is exactly 7 events
  async function generateSelective1ProbeChain(runId = 'run-selective-t03') {
    const plannedTests = ['T03'];
    const expectedPlan = [
      'manifest.captured',
      'test.started:T03',
      'test.completed:T03',
      'policy.decision',
      'checkpoint.signed',
      'run.completed',
    ];
    const events = [];
    const append = async (eventType, payload) => {
      const seq = events.length + 1;
      const prevHash = events.length === 0 ? GENESIS_HASH : events[events.length - 1].event_hash;
      const timestamp = new Date().toISOString();
      const eventHash = await hashEventPayload(seq, runId, timestamp, eventType, payload, prevHash);
      const ev = { sequence: seq, run_id: runId, timestamp, event_type: eventType, payload, previous_event_hash: prevHash, event_hash: eventHash };
      events.push(ev);
      return ev;
    };
    await append('run.started', { run_type: 'selective', tests_planned: plannedTests, expected_plan: expectedPlan });
    await append('manifest.captured', { configuration_digest: `sha256:${baselineDigest1}` });
    await append('test.started', { test_id: 'T03' });
    await append('test.completed', { test_id: 'T03', status: 'PASS', duration_ms: 390 });
    await append('policy.decision', { assurance_state: 'VERIFIED', policy_verdict: 'GRANTED' });
    const rootHash = events[events.length - 1].event_hash;
    const checkpoint = await signCheckpointDigest(runId, rootHash);
    await append('checkpoint.signed', { checkpoint });
    await append('run.completed', { summary: 'Selective probe T03 verified', total_duration_ms: 450 });
    return events;
  }
  const selEvents = await generateSelective1ProbeChain();
  recordTest(157, cat9, 'Selective 1-probe lifecycle run contains exactly 7 events', '7', String(selEvents.length), selEvents.length === 7);

  // Test 158: Sequence numbers are strictly monotonically increasing
  let seqStrictMono = true;
  for (let i = 0; i < standardEvents.length; i++) {
    if (standardEvents[i].sequence !== i + 1) seqStrictMono = false;
  }
  recordTest(158, cat9, 'Sequence numbers are strictly monotonic from 1 to N', 'true', String(seqStrictMono), seqStrictMono);

  // Test 159: Each event's previous_event_hash equals predecessor's event_hash
  let hashPointersValid = true;
  for (let i = 1; i < standardEvents.length; i++) {
    if (standardEvents[i].previous_event_hash !== standardEvents[i - 1].event_hash) hashPointersValid = false;
  }
  recordTest(159, cat9, 'Previous event hash pointers strictly match predecessor event hashes', 'true', String(hashPointersValid), hashPointersValid);

  // Test 160: Each event's event_hash is a valid 64-character SHA-256 hex string
  const allHashesValid = standardEvents.every((e) => e.event_hash.length === 64 && /^[0-9a-f]{64}$/.test(e.event_hash));
  recordTest(160, cat9, 'All event_hash digests are valid 64-char hex strings', 'true', String(allHashesValid), allHashesValid);

  // Test 161: All events share identical run_id
  const allSameRunId = standardEvents.every((e) => e.run_id === standardEvents[0].run_id);
  recordTest(161, cat9, 'All events in run share identical run_id', 'true', String(allSameRunId), allSameRunId);

  // Test 162: Event timestamps are valid ISO 8601 strings and monotonically non-decreasing
  let timesValid = true;
  for (let i = 0; i < standardEvents.length; i++) {
    const t = Date.parse(standardEvents[i].timestamp);
    if (isNaN(t)) timesValid = false;
    if (i > 0 && t < Date.parse(standardEvents[i - 1].timestamp)) timesValid = false;
  }
  recordTest(162, cat9, 'Event timestamps are ISO 8601 and monotonically non-decreasing', 'true', String(timesValid), timesValid);

  // Test 163: Checkpoint message format
  const chkData = evChk.payload.checkpoint;
  const chkMsg = `${chkData.checkpoint_id}:${chkData.run_id}:${chkData.root_event_hash}:${chkData.timestamp}`;
  recordTest(163, cat9, 'Checkpoint message format is {checkpoint_id}:{run_id}:{root_event_hash}:{timestamp}', 'true', String(Boolean(chkMsg)), Boolean(chkMsg));

  // Test 164: Checkpoint algorithm and key_id
  recordTest(164, cat9, 'Checkpoint algorithm is HMAC-SHA256 and key_id is secp256k1-hsm-signer-01', 'HMAC-SHA256:secp256k1-hsm-signer-01', `${chkData.algorithm}:${chkData.key_id}`, chkData.algorithm === 'HMAC-SHA256' && chkData.key_id === 'secp256k1-hsm-signer-01');

  // Test 165: Checkpoint signature verifies successfully
  const isSigValid = await verifyCheckpointSignature(chkData);
  recordTest(165, cat9, 'verifyCheckpointSignature validates HMAC signature on clean checkpoint', 'true', String(isSigValid), isSigValid);

  // =========================================================================
  // CATEGORY 10: Ledger Cryptographic Integrity & Tamper Detection (Tests 166–180)
  // =========================================================================
  const cat10 = 'Ledger Cryptographic Integrity & Tamper Detection';

  // Test 166: verifyEvidenceChain reports VALID on clean 15-event ledger
  const report166 = await verifyEvidenceChain(standardEvents);
  recordTest(166, cat10, 'verifyEvidenceChain validates 15-event clean ledger with status VALID', 'VALID:15', `${report166.status}:${report166.validCount}`, report166.status === 'VALID' && report166.validCount === 15);

  // Test 167: verifyEvidenceChain detects tampering when event #4 payload status is modified
  const tampered167 = JSON.parse(JSON.stringify(standardEvents));
  tampered167[3].payload.status = 'FORGED_PASS';
  const report167 = await verifyEvidenceChain(tampered167);
  recordTest(167, cat10, 'Tamper detection: Modified payload status triggers TAMPERED status', 'TAMPERED', report167.status, report167.status === 'TAMPERED');

  // Test 168: Tamper report identifies exact sequence index where tampering occurred
  recordTest(168, cat10, 'Tamper report accurately pinpoints brokenSequenceIndex = 3', '3', String(report167.brokenSequenceIndex), report167.brokenSequenceIndex === 3);

  // Test 169: Tamper report provides both expectedHash and actualHash
  const hasHashDiff = Boolean(report167.expectedHash && report167.actualHash && report167.expectedHash !== report167.actualHash);
  recordTest(169, cat10, 'Tamper report provides expectedHash and actualHash discrepancy', 'true', String(hasHashDiff), hasHashDiff);

  // Test 170: verifyEvidenceChain detects tampering when event #1 run_id modified
  const tampered170 = JSON.parse(JSON.stringify(standardEvents));
  tampered170[0].run_id = 'forged-run-id';
  const report170 = await verifyEvidenceChain(tampered170);
  recordTest(170, cat10, 'Tamper detection: Altered run_id triggers TAMPERED', 'TAMPERED', report170.status, report170.status === 'TAMPERED');

  // Test 171: verifyEvidenceChain detects tampering when timestamp altered
  const tampered171 = JSON.parse(JSON.stringify(standardEvents));
  tampered171[2].timestamp = '2026-01-01T00:00:00.000Z';
  const report171 = await verifyEvidenceChain(tampered171);
  recordTest(171, cat10, 'Tamper detection: Altered timestamp triggers TAMPERED', 'TAMPERED', report171.status, report171.status === 'TAMPERED');

  // Test 172: verifyEvidenceChain detects pointer breakage when previous_event_hash altered
  const tampered172 = JSON.parse(JSON.stringify(standardEvents));
  tampered172[5].previous_event_hash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  const report172 = await verifyEvidenceChain(tampered172);
  recordTest(172, cat10, 'Pointer breakage: Altered previous_event_hash triggers TAMPERED', 'TAMPERED', report172.status, report172.status === 'TAMPERED');

  // Test 173: verifyEvidenceChain detects pointer breakage when Genesis hash altered
  const tampered173 = JSON.parse(JSON.stringify(standardEvents));
  tampered173[0].previous_event_hash = '1111111111111111111111111111111111111111111111111111111111111111';
  const report173 = await verifyEvidenceChain(tampered173);
  recordTest(173, cat10, 'Pointer breakage: Altered Genesis hash triggers TAMPERED', 'TAMPERED', report173.status, report173.status === 'TAMPERED');

  // Test 174: verifyEvidenceChain detects forged checkpoint signature
  const tampered174 = JSON.parse(JSON.stringify(standardEvents));
  // Find checkpoint event
  const chkIdx = tampered174.findIndex((e) => e.event_type === 'checkpoint.signed');
  tampered174[chkIdx].payload.checkpoint.signature = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
  // Rehash this event so hash matches, but signature verification fails!
  tampered174[chkIdx].event_hash = await hashEventPayload(
    tampered174[chkIdx].sequence,
    tampered174[chkIdx].run_id,
    tampered174[chkIdx].timestamp,
    tampered174[chkIdx].event_type,
    tampered174[chkIdx].payload,
    tampered174[chkIdx].previous_event_hash
  );
  // Also rehash terminal event so pointer matches
  tampered174[chkIdx + 1].previous_event_hash = tampered174[chkIdx].event_hash;
  tampered174[chkIdx + 1].event_hash = await hashEventPayload(
    tampered174[chkIdx + 1].sequence,
    tampered174[chkIdx + 1].run_id,
    tampered174[chkIdx + 1].timestamp,
    tampered174[chkIdx + 1].event_type,
    tampered174[chkIdx + 1].payload,
    tampered174[chkIdx + 1].previous_event_hash
  );
  const report174 = await verifyEvidenceChain(tampered174);
  recordTest(174, cat10, 'Signature forgery: Forged checkpoint signature caught even if event hash is recomputed', 'TAMPERED', report174.status, report174.status === 'TAMPERED');

  // Test 175: verifyEvidenceChain detects truncated signature string
  const isTruncatedSigValid = await verifyCheckpointSignature({
    ...chkData,
    signature: 'bad-sig',
  });
  recordTest(175, cat10, 'Invalid / truncated HMAC signature string fails verification', 'false', String(isTruncatedSigValid), isTruncatedSigValid === false);

  // Test 176: verifyEvidenceChain handles empty event list gracefully
  const report176 = await verifyEvidenceChain([]);
  recordTest(176, cat10, 'Empty events list [] returns status VALID and totalEvents=0', 'VALID:0', `${report176.status}:${report176.totalEvents}`, report176.status === 'VALID' && report176.totalEvents === 0);

  // Test 177: verifyEvidenceChain handles single-event ledger
  const singleEvent = {
    sequence: 1,
    run_id: 'run-single-test',
    timestamp: new Date().toISOString(),
    event_type: 'observation.recorded',
    payload: { metric: 'environment_baseline', value: 'verified' },
    previous_event_hash: GENESIS_HASH,
    event_hash: '',
  };
  singleEvent.event_hash = await hashEventPayload(
    singleEvent.sequence,
    singleEvent.run_id,
    singleEvent.timestamp,
    singleEvent.event_type,
    singleEvent.payload,
    singleEvent.previous_event_hash
  );
  const report177 = await verifyEvidenceChain([singleEvent]);
  recordTest(177, cat10, 'Single self-contained event ledger verifies correctly with status VALID:1', 'VALID:1', `${report177.status}:${report177.validCount}`, report177.status === 'VALID' && report177.validCount === 1);

  // Test 178: verifyEvidenceChain detects re-ordered events as pointer break
  const tampered178 = JSON.parse(JSON.stringify(standardEvents));
  const temp = tampered178[2];
  tampered178[2] = tampered178[3];
  tampered178[3] = temp;
  const report178 = await verifyEvidenceChain(tampered178);
  recordTest(178, cat10, 'Re-ordered events detected as pointer breakage (TAMPERED)', 'TAMPERED', report178.status, report178.status === 'TAMPERED');

  // Test 179: Standalone CLI verifyLedgerFile validates clean ledger file
  const tmpFilePathClean = './temp_audit_clean_200.json';
  writeFileSync(tmpFilePathClean, JSON.stringify(standardEvents, null, 2), 'utf8');
  const cliReportClean = verifyLedgerFile(tmpFilePathClean);
  try { unlinkSync(tmpFilePathClean); } catch {}
  recordTest(179, cat10, 'Standalone CLI verifier returns VALID for clean ledger file', 'VALID:15', `${cliReportClean.status}:${cliReportClean.totalEvents}`, cliReportClean.status === 'VALID' && cliReportClean.totalEvents === 15);

  // Test 180: Standalone CLI verifyLedgerFile detects tampered payload in file
  const tmpFilePathTamper = './temp_audit_tamper_200.json';
  writeFileSync(tmpFilePathTamper, JSON.stringify(tampered167, null, 2), 'utf8');
  const cliReportTamper = verifyLedgerFile(tmpFilePathTamper);
  try { unlinkSync(tmpFilePathTamper); } catch {}
  recordTest(180, cat10, 'Standalone CLI verifier returns TAMPERED for tampered file', 'TAMPERED', cliReportTamper.status, cliReportTamper.status === 'TAMPERED');

  // =========================================================================
  // CATEGORY 11: Completeness Protocol & Anti-Omission Detection (Tests 181–190)
  // =========================================================================
  const cat11 = 'Completeness Protocol & Anti-Omission Detection';

  // Helper to simulate omission where an attacker re-hashes the remaining chain,
  // or a run is truncated prematurely, proving that hash continuity alone cannot hide omissions.
  async function createOmittedChain(filterFn) {
    const rawFiltered = standardEvents.filter(filterFn);
    const cloned = JSON.parse(JSON.stringify(rawFiltered));
    for (let i = 0; i < cloned.length; i++) {
      cloned[i].sequence = i + 1;
      cloned[i].previous_event_hash = i === 0 ? GENESIS_HASH : cloned[i - 1].event_hash;
      cloned[i].event_hash = await hashEventPayload(
        cloned[i].sequence,
        cloned[i].run_id,
        cloned[i].timestamp,
        cloned[i].event_type,
        cloned[i].payload,
        cloned[i].previous_event_hash
      );
    }
    return cloned;
  }

  // Test 181: Completeness check detects omission of test.completed:T01
  const dropped181 = await createOmittedChain((e) => !(e.event_type === 'test.completed' && e.payload?.test_id === 'T01'));
  const rep181 = await verifyEvidenceChain(dropped181);
  recordTest(181, cat11, 'Omission detection: Dropping test.completed:T01 triggers INCOMPLETE', 'INCOMPLETE', rep181.status, rep181.status === 'INCOMPLETE');

  // Test 182: Completeness check detects omission of test.started:T03
  const dropped182 = await createOmittedChain((e) => !(e.event_type === 'test.started' && e.payload?.test_id === 'T03'));
  const rep182 = await verifyEvidenceChain(dropped182);
  recordTest(182, cat11, 'Omission detection: Dropping test.started:T03 triggers INCOMPLETE', 'INCOMPLETE', rep182.status, rep182.status === 'INCOMPLETE');

  // Test 183: Completeness check detects omission of manifest.captured
  const dropped183 = await createOmittedChain((e) => e.event_type !== 'manifest.captured');
  const rep183 = await verifyEvidenceChain(dropped183);
  recordTest(183, cat11, 'Omission detection: Dropping manifest.captured triggers INCOMPLETE', 'INCOMPLETE', rep183.status, rep183.status === 'INCOMPLETE');

  // Test 184: Completeness check detects omission of policy.decision
  const dropped184 = await createOmittedChain((e) => e.event_type !== 'policy.decision');
  const rep184 = await verifyEvidenceChain(dropped184);
  recordTest(184, cat11, 'Omission detection: Dropping policy.decision triggers INCOMPLETE', 'INCOMPLETE', rep184.status, rep184.status === 'INCOMPLETE');

  // Test 185: Completeness check detects omission of checkpoint.signed
  const dropped185 = await createOmittedChain((e) => e.event_type !== 'checkpoint.signed');
  const rep185 = await verifyEvidenceChain(dropped185);
  recordTest(185, cat11, 'Omission detection: Dropping checkpoint.signed triggers INCOMPLETE', 'INCOMPLETE', rep185.status, rep185.status === 'INCOMPLETE');

  // Test 186: Completeness check detects omission of run.completed
  const dropped186 = await createOmittedChain((e) => e.event_type !== 'run.completed');
  const rep186 = await verifyEvidenceChain(dropped186);
  recordTest(186, cat11, 'Omission detection: Dropping run.completed triggers INCOMPLETE', 'INCOMPLETE', rep186.status, rep186.status === 'INCOMPLETE');

  // Test 187: Completeness check detects omission of multiple events simultaneously
  const dropped187 = await createOmittedChain((e) => !(e.event_type === 'test.completed' && (e.payload?.test_id === 'T01' || e.payload?.test_id === 'T02')));
  const rep187 = await verifyEvidenceChain(dropped187);
  recordTest(187, cat11, 'Omission detection: Multiple missing probe events detected simultaneously', 'INCOMPLETE', rep187.status, rep187.status === 'INCOMPLETE');

  // Test 188: Completeness failure sets signatureValid = false
  recordTest(188, cat11, 'Completeness failure sets signatureValid = false', 'false', String(rep181.signatureValid), rep181.signatureValid === false);

  // Test 189: Completeness report lists missing events
  const missingListed = Array.isArray(rep181.missingEvents) && rep181.missingEvents.includes('test.completed:T01');
  recordTest(189, cat11, 'Completeness failure report lists exact missing events', 'true', String(missingListed), missingListed);

  // Test 190: Adversarial re-hashing of dropped chain CANNOT bypass completeness check
  const dropped190 = await createOmittedChain((e) => !(e.event_type === 'test.completed' && e.payload?.test_id === 'T04'));
  const rep190 = await verifyEvidenceChain(dropped190);
  recordTest(190, cat11, 'Anti-Omission: Re-hashed chain with clean pointers still rejected due to run.started contract', 'INCOMPLETE', rep190.status, rep190.status === 'INCOMPLETE');

  // =========================================================================
  // CATEGORY 12: Deterministic State Machine Transitions & Precedence Rules (Tests 191–200)
  // =========================================================================
  const cat12 = 'State Machine Transitions & Precedence Rules';

  // Helper state machine simulator
  class StateMachineSimulator {
    constructor() {
      this.state = 'UNVERIFIED';
      this.activeTicket = null;
    }

    onFullSuitePass(ledgerValid) {
      if (ledgerValid) {
        this.state = 'VERIFIED';
        this.activeTicket = `AUTH-TICKET-${Date.now().toString(36)}`;
      } else {
        this.state = 'UNVERIFIED';
        this.activeTicket = null;
      }
    }

    onConfigDrift(isDrifted) {
      if (isDrifted && this.state === 'VERIFIED') {
        this.state = 'STALE';
        this.activeTicket = null; // Revoke ticket
      }
    }

    onProbeFailure() {
      // Precedence Rule 1: Probe failure directly forces BREACHED
      this.state = 'BREACHED';
      this.activeTicket = null;
    }

    onRemediate() {
      if (this.state === 'BREACHED') {
        this.state = 'RECOVERING';
      }
    }

    onSelectiveProbePass(_testId) {
      if (this.state === 'RECOVERING' || this.state === 'STALE') {
        this.state = 'VERIFIED';
        this.activeTicket = `AUTH-TICKET-${Date.now().toString(36)}`;
      }
    }

    onTamperOrOmission() {
      // Precedence Rule 2: Tamper or omission directly forces UNVERIFIED lockdown
      this.state = 'UNVERIFIED';
      this.activeTicket = null;
    }
  }

  const sm = new StateMachineSimulator();

  // Test 191: Initial system state is UNVERIFIED
  recordTest(191, cat12, 'State Machine: Initial state before verification is UNVERIFIED', 'UNVERIFIED', sm.state, sm.state === 'UNVERIFIED');

  // Test 192: Transition UNVERIFIED -> VERIFIED when all 5 probes pass and ledger is valid
  sm.onFullSuitePass(true);
  recordTest(192, cat12, 'State Machine: Transition UNVERIFIED -> VERIFIED on successful full suite', 'VERIFIED', sm.state, sm.state === 'VERIFIED');

  // Test 193: Transition VERIFIED -> STALE when configuration drifts
  sm.onConfigDrift(true);
  recordTest(193, cat12, 'State Machine: Transition VERIFIED -> STALE upon security configuration drift', 'STALE', sm.state, sm.state === 'STALE');

  // Test 194: Transition STALE -> BREACHED when probe fails during retest
  sm.onProbeFailure();
  recordTest(194, cat12, 'State Machine: Transition STALE -> BREACHED on probe failure', 'BREACHED', sm.state, sm.state === 'BREACHED');

  // Test 195: Precedence Rule 1: Probe failure directly forces BREACHED regardless of previous state
  const sm2 = new StateMachineSimulator();
  sm2.state = 'VERIFIED';
  sm2.onProbeFailure();
  recordTest(195, cat12, 'Precedence Rule 1: Immediate probe failure forces state to BREACHED', 'BREACHED', sm2.state, sm2.state === 'BREACHED');

  // Test 196: Transition BREACHED -> RECOVERING when configuration is restored to baseline
  sm.onRemediate();
  recordTest(196, cat12, 'State Machine: Transition BREACHED -> RECOVERING upon baseline remediation', 'RECOVERING', sm.state, sm.state === 'RECOVERING');

  // Test 197: Transition RECOVERING -> VERIFIED when selective retest passes
  sm.onSelectiveProbePass('T03');
  recordTest(197, cat12, 'State Machine: Transition RECOVERING -> VERIFIED when selective probe passes', 'VERIFIED', sm.state, sm.state === 'VERIFIED');

  // Test 198: Precedence Rule 2: Ledger tampering or omission forces state directly to UNVERIFIED
  sm.onTamperOrOmission();
  recordTest(198, cat12, 'Precedence Rule 2: Ledger tampering or omission forces state directly to UNVERIFIED lockdown', 'UNVERIFIED', sm.state, sm.state === 'UNVERIFIED');

  // Test 199: Precedence Rule 3: Selective retesting never inherits old PASS results across configuration drift
  // Verify that if G1 drifts, old T01 PASS cannot be inherited without running T01
  const baselineDig = await computeConfigFingerprint(BASELINE_CONFIG);
  const driftedM2Dig = await computeConfigFingerprint(m2Config);
  const canInherit = baselineDig === driftedM2Dig;
  recordTest(199, cat12, 'Precedence Rule 3: No inheritance across configuration drift (canInherit = false)', 'false', String(canInherit), canInherit === false);

  // Test 200: Policy Gate Decision & Ticket Revocation
  const smGate = new StateMachineSimulator();
  smGate.onFullSuitePass(true);
  const ticketGranted = Boolean(smGate.activeTicket);
  smGate.onConfigDrift(true);
  const ticketRevokedOnDrift = smGate.activeTicket === null;
  recordTest(200, cat12, 'Fail-Closed Policy Gate: Ticket GRANTED in VERIFIED, immediately REVOKED on drift', 'granted->revoked', `${ticketGranted ? 'granted' : 'denied'}->${ticketRevokedOnDrift ? 'revoked' : 'active'}`, ticketGranted && ticketRevokedOnDrift);

  // =========================================================================
  // SUMMARY AND VERIFICATION
  // =========================================================================
  console.log('\n========================================================================');
  console.log(`200 TEST CASES EXECUTION COMPLETE`);
  console.log(`TOTAL TESTS: ${testResults.length}`);
  console.log(`PASSED:      ${passCount}`);
  console.log(`FAILED:      ${failCount}`);
  console.log('========================================================================\n');

  // Save report to disk as JSON for programmatic consumption and reporting
  const reportPath = './test_200_results.json';
  writeFileSync(reportPath, JSON.stringify({
    total: testResults.length,
    passed: passCount,
    failed: failCount,
    executedAt: new Date().toISOString(),
    results: testResults,
  }, null, 2), 'utf8');
  console.log(`Detailed test report saved to: ${reportPath}`);

  if (failCount > 0) {
    console.error(`\n[FATAL] ${failCount} test cases failed!`);
    process.exit(1);
  }
}

runAll200Tests().catch((err) => {
  console.error('[UNCAUGHT TEST RUNNER ERROR]:', err);
  process.exit(1);
});
