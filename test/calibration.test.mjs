import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { calibrate } from '../lib/calibration.mjs'
import { fixture, put, run } from './helpers.mjs'

const attempt = (id, cost = 1, input = 100, output = 20) => ({
  id, headSha: 'a'.repeat(40), stage: 'implementation', outcome: 'pass',
  tool: 'example-agent', model: 'example-model', effort: 'medium', reference: `evidence:${id}`,
  usage: { reference: `usage:${id}`, inputTokens: input, outputTokens: output, cachedInputTokens: 10, costUsd: cost },
  contextBytes: 2000, checksRun: 1, checksReused: 0,
})
const unit = (id, attempts = [attempt(`${id}-run`)]) => ({
  id, kind: 'code', risk: 'standard', route: 'standard', billing: 'api',
  outcome: 'accepted', attemptsComplete: true, reference: `pr:${id}`, attempts,
})
async function report(t, units) {
  const root = await fixture(t)
  await put(root, 'samples.json', JSON.stringify({ schemaVersion: 1, units }))
  return calibrate(root, 'samples.json')
}

test('accepted-unit cost includes failed attempts, independent reviews and rejected units', async t => {
  const failed = { ...attempt('first', 1, 100, 20), outcome: 'fail' }
  const review = { ...attempt('review', 0.5, 50, 10), stage: 'review', checksRun: 0, checksReused: 1 }
  const rejected = { ...unit('rejected', [attempt('discarded', 2, 200, 40)]), outcome: 'rejected' }
  const r = await report(t, [unit('accepted', [failed, review]), rejected])
  assert.equal(r.summary.acceptedUnits, 1)
  assert.equal(r.summary.rejectedUnits, 1)
  assert.equal(r.summary.failedAttempts, 1)
  assert.equal(r.summary.reviewAttempts, 1)
  assert.equal(r.summary.measurements.costUsd.perAcceptedUnit, 3.5)
  assert.equal(r.summary.measurements.totalTokens.total, 420)
  assert.equal(r.summary.measurements.cachedInputTokens.total, 30)
  assert.equal(r.summary.measurements.checksRun.total, 2)
  assert.equal(r.summary.measurements.checksReused.total, 1)
  assert.equal(r.cohorts.length, 1)
})
test('one missing receipt counter makes its total unknown without losing known subtotals', async t => {
  const unknown = attempt('unknown')
  unknown.usage.inputTokens = unknown.usage.cachedInputTokens = unknown.usage.costUsd = null
  const { summary: s } = await report(t, [unit('unit', [attempt('known'), unknown])])
  assert.deepEqual(s.measurements.costUsd, { measuredAttempts: 1, missingAttempts: 1, knownSubtotal: 1, total: null, perAcceptedUnit: null })
  assert.equal(s.measurements.totalTokens.total, null)
  assert.equal(s.measurements.outputTokens.total, 40)
})
test('incomplete or unsettled populations cannot advertise cost per accepted unit', async t => {
  for (const change of [{ attemptsComplete: false }, { outcome: 'pending' }, { outcome: 'unknown' }]) {
    const r = await report(t, [unit('done'), { ...unit('open'), ...change }])
    assert.equal(r.status, 'partial')
    assert.equal(r.summary.measurements.costUsd.knownSubtotal, 2)
    assert.equal(r.summary.measurements.costUsd.total, null)
    assert.equal(r.summary.measurements.costUsd.perAcceptedUnit, null)
  }
})
test('empty populations and zero accepted units never divide by zero or invent zero usage', async t => {
  const empty = await report(t, [])
  assert.equal(empty.status, 'empty')
  assert.equal(empty.summary.measurements.inputTokens.knownSubtotal, null)
  const rejected = await report(t, [{ ...unit('failed'), outcome: 'rejected' }])
  assert.equal(rejected.summary.measurements.costUsd.total, 1)
  assert.equal(rejected.summary.measurements.costUsd.perAcceptedUnit, null)
  const noAttempts = await report(t, [{ ...unit('incomplete', []), attemptsComplete: false }])
  assert.equal(noAttempts.summary.measurements.costUsd.total, null)
})
test('genuinely measured zero cost remains distinct from missing usage', async t => {
  const a = attempt('zero', 0, 0, 0); a.usage.cachedInputTokens = 0
  const r = await report(t, [unit('zero', [a])])
  assert.equal(r.summary.measurements.costUsd.total, 0)
  assert.equal(r.summary.measurements.totalTokens.total, 0)
})
test('cohorts separate risk, work kind, route and billing; unknown models remain unknown', async t => {
  const units = [unit('one'), { ...unit('two'), kind: 'policy' }, { ...unit('three'), risk: 'high' },
    { ...unit('four'), route: 'routine' }, { ...unit('five'), billing: 'subscription' }]
  units[4].attempts[0].model = null
  const r = await report(t, units)
  assert.equal(r.cohorts.length, 5)
  assert.equal(r.summary.unknownModelAttempts, 1)
  assert.ok(r.models.some(m => m.model === null && m.attempts === 1))
})
test('duplicate units, executions and usage receipts are rejected instead of double counted', async t => {
  await assert.rejects(report(t, [unit('same'), unit('same')]), /Duplicate.*unit/)
  await assert.rejects(report(t, [unit('one', [attempt('same')]), unit('two', [attempt('same')])]), /Duplicate.*execution/)
  const a = attempt('first'), b = attempt('second'); b.usage.reference = a.usage.reference
  await assert.rejects(report(t, [unit('one', [a, b])]), /Duplicate.*receipt/)
})
test('impossible counters, missing receipts, empty complete units and unsafe aggregates fail', async t => {
  const variants = [
    a => { a.usage.cachedInputTokens = 101 },
    a => { a.usage.inputTokens = null },
    a => { a.usage.reference = null },
    a => { a.usage.inputTokens = -1 },
    a => { a.checksRun = 1.5 },
    a => { a.contextBytes = Number.MAX_SAFE_INTEGER + 1 },
    a => { a.usage.inputTokens = Number.MAX_SAFE_INTEGER },
  ]
  for (const change of variants) { const a = attempt('invalid'); change(a); await assert.rejects(report(t, [unit('bad', [a])])) }
  await assert.rejects(report(t, [unit('empty', [])]), /recorded attempts/)
  const a = attempt('a'), b = attempt('b'); a.contextBytes = Number.MAX_SAFE_INTEGER
  await assert.rejects(report(t, [unit('sum', [a, b])]), /safe numeric range/)
  a.contextBytes = 0; a.usage.costUsd = Number.MAX_SAFE_INTEGER
  await assert.rejects(report(t, [unit('sum', [a, b])]), /safe numeric range/)
})
test('CLI accepts partial records, uses --dir, is read-only and does not echo private references', async t => {
  const root = await fixture(t), elsewhere = await fixture(t), a = attempt('sample')
  a.reference = a.usage.reference = 'PRIVATE_EVIDENCE_REFERENCE'
  a.usage.inputTokens = a.usage.outputTokens = a.usage.cachedInputTokens = a.usage.costUsd = null
  const data = { schemaVersion: 1, units: [{ ...unit('sample', [a]), attemptsComplete: false }] }
  await put(root, 'samples.json', JSON.stringify(data))
  const before = await readdir(root), bytes = await readFile(join(root, 'samples.json'))
  const r = run(['calibrate', 'samples.json', '--dir', root, '--json'], elsewhere)
  assert.equal(r.status, 0, r.stderr)
  assert.equal(JSON.parse(r.stdout).status, 'partial')
  assert.doesNotMatch(r.stdout + r.stderr, /PRIVATE_EVIDENCE_REFERENCE/)
  assert.deepEqual(await readdir(root), before)
  assert.deepEqual(await readFile(join(root, 'samples.json')), bytes)
  assert.match(run(['calibrate', 'samples.json'], root).stdout, /total unknown/)
  assert.equal(run(['calibrate'], root).status, 1)
})
test('malformed, unknown-field, huge and symlinked inputs fail without exposing payloads', async t => {
  const root = await fixture(t), outside = await fixture(t)
  for (const bytes of ['PRIVATE_PAYLOAD', JSON.stringify({ schemaVersion: 1, units: [], rawOutput: 'PRIVATE_PAYLOAD' }), ' '.repeat(1024 * 1024 + 1)]) {
    await put(root, 'bad.json', bytes)
    const r = run(['calibrate', 'bad.json', '--json'], root)
    assert.equal(r.status, 1)
    assert.doesNotMatch(r.stdout + r.stderr, /PRIVATE_PAYLOAD/)
  }
  await put(outside, 'receipt.json', '{"schemaVersion":1,"units":[]}')
  await symlink(join(outside, 'receipt.json'), join(root, 'linked.json'))
  assert.equal(run(['calibrate', 'linked.json'], root).status, 1)
  assert.equal(run(['calibrate', '../receipt.json'], root).status, 1)
})
test('shipped synthetic calibration example validates without a scaffold or external calls', async t => {
  const root = await fixture(t)
  const bytes = await readFile(new URL('../examples/calibration.fixture.json', import.meta.url), 'utf8')
  await put(root, 'samples.json', bytes)
  const r = run(['calibrate', 'samples.json', '--json'], root)
  assert.equal(r.status, 0, r.stderr)
  assert.equal(JSON.parse(r.stdout).summary.failedAttempts, 1)
})
