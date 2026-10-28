import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { canonicalJson, sha256Hex, GENESIS_HASH } from '../src/core/canonical.ts';
import { generateSigningKeyPair, signDataP256, KEY_LABEL } from '../src/core/signing.ts';
import { BASELINE_CONFIG } from '../src/services/simulation.ts';
import { getSecurityRelevantConfig, computeGuaranteeDigests } from '../src/utils/crypto.ts';

async function generate() {
  const examplesDir = resolve(process.cwd(), 'examples');
  if (!existsSync(examplesDir)) {
    mkdirSync(examplesDir, { recursive: true });
  }

  // Generate signing keypair
  const keyPair = await generateSigningKeyPair('key-judge-eval-01');

  // Compute manifest and digests
  const secConfig = getSecurityRelevantConfig(BASELINE_CONFIG);
  const manifestJson = canonicalJson(secConfig);
  const fingerprint = await sha256Hex(manifestJson);
  const guaranteeDigests = await computeGuaranteeDigests(BASELINE_CONFIG);

  const runId = 'run-judge-audit-demo';
  const expectedPlan = [
    'manifest.captured',
    'test.started:T01',
    'test.completed:T01',
    'test.started:T02',
    'test.completed:T02',
    'test.started:T03',
    'test.completed:T03',
    'test.started:T04',
    'test.completed:T04',
    'test.started:T05',
    'test.completed:T05',
    'policy.decision',
    'checkpoint.signed',
    'run.completed',
  ];

  const events = [];
  let prevHash = GENESIS_HASH;

  async function addEvent(eventType, payload) {
    const seq = events.length + 1;
    const ts = new Date(Date.now() - (15 - seq) * 100).toISOString();
    const body = {
      event_type: eventType,
      payload,
      previous_event_hash: prevHash,
      run_id: runId,
      sequence: seq,
      timestamp: ts,
    };
    const hash = await sha256Hex(canonicalJson(body));
    const ev = {
      sequence: seq,
      run_id: runId,
      timestamp: ts,
      event_type: eventType,
      payload,
      previous_event_hash: prevHash,
      event_hash: hash,
    };
    events.push(ev);
    prevHash = hash;
    return ev;
  }

  // 1. run.started
  await addEvent('run.started', {
    run_type: 'full',
    tests_planned: ['T01', 'T02', 'T03', 'T04', 'T05'],
    expected_plan: expectedPlan,
    config_fingerprint: fingerprint,
  });

  // 2. manifest.captured
  await addEvent('manifest.captured', {
    canonical_manifest: secConfig,
    digests: guaranteeDigests,
  });

  // 3-12. tests
  const tests = [
    { id: 'T01', gid: 'G1', name: 'Storage Isolation' },
    { id: 'T02', gid: 'G2', name: 'Network Isolation' },
    { id: 'T03', gid: 'G3', name: 'API Authorization' },
    { id: 'T04', gid: 'G4', name: 'Model Session Confidentiality' },
    { id: 'T05', gid: 'G5', name: 'Workload Hardening' },
  ];

  for (const t of tests) {
    await addEvent('test.started', { test_id: t.id, guarantee_id: t.gid });
    await addEvent('test.completed', {
      test_id: t.id,
      guarantee_id: t.gid,
      status: 'PASS',
      duration_ms: 42,
      details: `${t.name} verified compliant under certified baseline.`,
    });
  }

  // 13. policy.decision
  await addEvent('policy.decision', {
    assurance_state: 'VERIFIED',
    fingerprint,
    guarantees_passed: 5,
    has_failures: false,
    policy_verdict: 'GRANTED',
  });

  // 14. checkpoint.signed
  const signedPayload = {
    runId,
    headHash: prevHash,
    state: 'VERIFIED',
    decision: 'GRANTED',
  };
  const signatureHex = await signDataP256(signedPayload, keyPair.privateKeyJwk);
  const checkpoint = {
    checkpoint_id: `chk-${runId}`,
    run_id: runId,
    root_event_hash: prevHash,
    state: 'VERIFIED',
    decision: 'GRANTED',
    key_label: KEY_LABEL,
    key_id: keyPair.keyId,
    algorithm: 'ECDSA-P256-SHA256',
    signature: signatureHex,
    public_key_jwk: keyPair.publicKeyJwk,
    timestamp: new Date().toISOString(),
  };

  await addEvent('checkpoint.signed', {
    checkpoint,
  });

  // 15. run.completed
  await addEvent('run.completed', {
    summary: `Run ${runId} finalized with state VERIFIED`,
    total_duration_ms: 380,
    tests_executed: 5,
  });

  const validBundle = {
    schema: 'bayora.evidence/1',
    simulated: true,
    manifest: secConfig,
    fingerprint,
    guaranteeDigests,
    fullLedger: events,
    signedCheckpoints: [checkpoint],
    publicKeyJwk: keyPair.publicKeyJwk,
    keyLabel: KEY_LABEL,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(
    resolve(examplesDir, 'valid.bundle.json'),
    JSON.stringify(validBundle, null, 2),
    'utf8'
  );

  // Generate Tampered Bundle (modify payload of block index 3)
  const tamperedLedger = JSON.parse(JSON.stringify(events));
  tamperedLedger[3].payload.status = 'FAIL'; // Injected tamper without recomputing hash

  const tamperedBundle = {
    ...validBundle,
    fullLedger: tamperedLedger,
  };

  writeFileSync(
    resolve(examplesDir, 'tampered.bundle.json'),
    JSON.stringify(tamperedBundle, null, 2),
    'utf8'
  );

  console.log('Examples generated successfully:');
  console.log(' - examples/valid.bundle.json');
  console.log(' - examples/tampered.bundle.json');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
