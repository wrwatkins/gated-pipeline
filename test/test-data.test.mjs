import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, symlink, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { fixture, put, run } from './helpers.mjs'

const hash = value => createHash('sha256').update(value).digest('hex')
async function installed(t) {
  const root = await fixture(t)
  assert.equal(run(['install', '--yes'], root).status, 0)
  return root
}
async function receipt(root, overrides = {}) {
  const policy = await readFile(join(root, 'test-data-policy.json'))
  return {
    schemaVersion: 1,
    policySha256: hash(policy),
    tier: 'dev',
    source: 'synthetic',
    profile: 'not_used',
    profileApprovalRef: null,
    profileSummaryRef: null,
    seed: 'repeatable-fixture-1',
    outputRoot: '.test-data/run-1',
    counts: { users: 2000, articles: 5000, events: 2500, relatedRecords: 20000 },
    metrics: { elapsedMs: 12, peakMemoryBytes: 1024 },
    ...overrides
  }
}
test('test-data validates the shipped restrictive policy and a bound receipt', async t => {
  const root = await installed(t)
  let result = run(['test-data', '--json'], root)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).policy, 'synthetic-test-data')
  await put(root, 'receipt.json', JSON.stringify(await receipt(root)))
  result = run(['test-data', 'receipt.json', '--json'], root)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).receipt, 'dev')
})
test('test-data rejects prohibited sources, stale bindings, undersized tiers and unsafe outputs without payload leaks', async t => {
  const root = await installed(t)
  const policy = JSON.parse(await readFile(join(root, 'test-data-policy.json'), 'utf8'))
  for (const invalid of [
    { ...policy, productionPii: 'allowed' },
    { ...policy, pseudonymizedProductionPii: 'allowed' },
    { ...policy, nonPiiContent: 'reuse_production_articles' },
    { ...policy, productionExport: 'PRIVATE_MEMBER_PAYLOAD' }
  ]) {
    await put(root, 'test-data-policy.json', JSON.stringify(invalid))
    const result = run(['test-data', '--json'], root)
    assert.equal(result.status, 1)
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_MEMBER_PAYLOAD/)
  }
  await put(root, 'test-data-policy.json', JSON.stringify(policy))
  for (const invalid of [
    { ...(await receipt(root)), policySha256: 'b'.repeat(64) },
    { ...(await receipt(root)), counts: { users: 1, articles: 1, events: 1, relatedRecords: 1 } },
    { ...(await receipt(root)), outputRoot: 'outside', seed: 'PRIVATE_MEMBER_PAYLOAD' },
    { ...(await receipt(root)), outputRoot: '.test-data/../outside/run-1' }
  ]) {
    await put(root, 'receipt.json', JSON.stringify(invalid))
    const result = run(['test-data', 'receipt.json', '--json'], root)
    assert.equal(result.status, 1)
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_MEMBER_PAYLOAD/)
  }
})
test('test-data limits aggregate profiling and refuses linked receipts', async t => {
  const root = await installed(t)
  const policy = JSON.parse(await readFile(join(root, 'test-data-policy.json'), 'utf8'))
  await put(root, 'receipt.json', JSON.stringify(await receipt(root, { profile: 'aggregate_once_approved', profileApprovalRef: 'review/approval', profileSummaryRef: 'reports/summary' })))
  assert.equal(run(['test-data', 'receipt.json'], root).status, 1)
  policy.productionProfiling = 'approval_required_aggregate_only'
  await put(root, 'test-data-policy.json', JSON.stringify(policy))
  await put(root, 'receipt.json', JSON.stringify(await receipt(root, { profile: 'aggregate_once_approved', profileApprovalRef: 'review/approval', profileSummaryRef: 'reports/summary' })))
  assert.equal(run(['test-data', 'receipt.json'], root).status, 0)
  await put(root, 'outside.json', JSON.stringify(await receipt(root)))
  await unlink(join(root, 'receipt.json'))
  await symlink(join(root, 'outside.json'), join(root, 'receipt.json'))
  assert.equal(run(['test-data', 'receipt.json'], root).status, 1)
})
test('test-data policy is project-owned on sync and doctor reports unconfigured enforcement', async t => {
  const root = await installed(t)
  let report = JSON.parse(run(['doctor', '--json'], root).stdout)
  assert.ok(report.warnings.some(item => /Synthetic test-data .*not configured/.test(item)))
  const policy = JSON.parse(await readFile(join(root, 'test-data-policy.json'), 'utf8'))
  policy.commands.generate = 'python manage.py generate_synthetic_data --tier=dev --seed=fixture'
  policy.commands.validate = 'python manage.py validate_synthetic_data'
  policy.commands.ci = 'python manage.py validate_synthetic_data --receipt=.test-data/receipt.json'
  await put(root, 'test-data-policy.json', JSON.stringify(policy))
  assert.equal(run(['sync'], root).status, 0)
  assert.equal(JSON.parse(await readFile(join(root, 'test-data-policy.json'), 'utf8')).commands.generate, policy.commands.generate)
  report = JSON.parse(run(['doctor', '--json'], root).stdout)
  assert.ok(report.checks.some(item => /Synthetic test-data policy/.test(item)))
  assert.ok(!report.warnings.some(item => /Synthetic test-data .*not configured/.test(item)))
})
