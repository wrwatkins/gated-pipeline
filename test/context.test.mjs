import test from 'node:test'
import assert from 'node:assert/strict'
import { symlink, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fixture, put, run } from './helpers.mjs'

const config = { schemaVersion: 1, shared: ['AGENTS.md'], gates: { '4': { required: ['develop.md'], optional: ['memory.md'] }, '5': { required: ['review.md'], optional: [] } } }
async function setup(t) {
  const root = await fixture(t)
  await put(root, '.gated-pipeline/context.json', JSON.stringify(config))
  await put(root, 'AGENTS.md', 'Shared invariant: retain independent review.\n')
  await put(root, 'develop.md', 'Implementation instructions.\n')
  await put(root, 'review.md', 'Unrelated reviewer detail MUST_NOT_LOAD.\n')
  return root
}
const plan = root => run(['context', '--gate=4', '--json'], root)

test('context selects shared/current gate only, without disclosing file bodies', async t => {
  const root = await setup(t), result = plan(root)
  assert.equal(result.status, 0, result.stderr)
  const data = JSON.parse(result.stdout)
  assert.deepEqual(data.files.map(f => f.path), ['AGENTS.md', 'develop.md'])
  assert.equal(data.deferredFileCount, 1)
  assert.equal(data.missingOptional[0], 'memory.md')
  assert.ok(data.files.every(f => /^[a-f0-9]{64}$/.test(f.sha256)))
  assert.doesNotMatch(result.stdout, /MUST_NOT_LOAD|Shared invariant/)
  assert.equal(data.totalBytes, Buffer.byteLength(await readFile(join(root, 'AGENTS.md'))) + Buffer.byteLength(await readFile(join(root, 'develop.md'))))
})
test('context over budget retains mandatory files and reports the overage', async t => {
  const root = await setup(t), result = run(['context', '--gate=4', '--budget-bytes=1', '--json'], root)
  assert.equal(result.status, 0, result.stderr)
  const data = JSON.parse(result.stdout)
  assert.equal(data.overBudget, true)
  assert.equal(data.files.length, 2)
})
test('context snapshots detect changed bytes without treating unchanged as already read', async t => {
  const root = await setup(t), first = plan(root)
  assert.equal(first.status, 0, first.stderr)
  await put(root, 'snapshot.json', first.stdout)
  await put(root, 'develop.md', 'Changed instructions.\n')
  const result = run(['context', '--gate=4', '--previous=snapshot.json', '--json'], root)
  assert.equal(result.status, 0, result.stderr)
  const data = JSON.parse(result.stdout)
  assert.deepEqual(data.files.map(f => f.change), ['unchanged', 'changed'])
  assert.match(data.notice, /not proof.*context/)
})
test('context missing required files fails instead of presenting an incomplete plan', async t => {
  const root = await setup(t)
  await put(root, '.gated-pipeline/context.json', JSON.stringify({ ...config, shared: ['missing.md'] }))
  const result = plan(root)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Missing required.*missing.md/)
})
test('context refuses path traversal, symlinks, directories and unknown manifest fields', async t => {
  const root = await setup(t), outside = await fixture(t)
  await put(outside, 'private.md', 'MUST_NOT_DISCLOSE')
  await symlink(join(outside, 'private.md'), join(root, 'link.md'))
  for (const shared of [['../private.md'], ['link.md'], ['.gated-pipeline'], ['/etc/passwd']]) {
    await put(root, '.gated-pipeline/context.json', JSON.stringify({ ...config, shared }))
    const result = plan(root)
    assert.equal(result.status, 1, JSON.stringify(shared))
    assert.doesNotMatch(result.stdout + result.stderr, /MUST_NOT_DISCLOSE/)
  }
  await put(root, '.gated-pipeline/context.json', JSON.stringify({ ...config, secretlyOmitReview: true }))
  assert.equal(plan(root).status, 1)
})
test('context rejects malformed snapshots and snapshots from another checkout', async t => {
  const root = await setup(t), other = await setup(t)
  for (const snapshot of ['null', '{}', plan(other).stdout]) {
    await put(root, 'snapshot.json', snapshot)
    const result = run(['context', '--gate=4', '--previous=snapshot.json', '--json'], root)
    assert.equal(result.status, 1)
  }
})
test('malformed manifest and snapshot JSON never leak their bodies in parser diagnostics', async t => {
  const root = await setup(t)
  await put(root, '.gated-pipeline/context.json', 'TOP_SECRET_MANIFEST_BODY')
  let result = plan(root)
  assert.equal(result.status, 1)
  assert.doesNotMatch(result.stdout + result.stderr, /TOP_SECRET_MANIFEST_BODY/)
  assert.match(result.stderr, /Invalid context manifest JSON/)
  await put(root, '.gated-pipeline/context.json', JSON.stringify(config))
  await put(root, 'snapshot.json', 'TOP_SECRET_SNAPSHOT_BODY')
  result = run(['context', '--gate=4', '--previous=snapshot.json', '--json'], root)
  assert.equal(result.status, 1)
  assert.doesNotMatch(result.stdout + result.stderr, /TOP_SECRET_SNAPSHOT_BODY/)
  assert.match(result.stderr, /Invalid context snapshot JSON/)
})
test('context input validation rejects unsupported gates, budgets and missing gate', async t => {
  const root = await setup(t)
  for (const flags of [[], ['--gate=0'], ['--gate=10'], ['--gate=4', '--budget-bytes=NaN'], ['--gate=4', '--budget-bytes=0'], ['--gate=4', '--budget-bytes=1.5']]) {
    assert.equal(run(['context', ...flags], root).status, 1)
  }
})
test('installed context manifest works and survives project overrides during sync', async t => {
  const root = await fixture(t)
  assert.equal(run(['install', '--yes'], root).status, 0)
  assert.equal(plan(root).status, 0)
  const path = '.gated-pipeline/context.json', original = JSON.parse(await readFile(join(root, path), 'utf8'))
  original.gates['4'].optional.push('local-notes.md')
  await put(root, path, JSON.stringify(original))
  assert.equal(run(['sync'], root).status, 0)
  assert.equal(JSON.parse(await readFile(join(root, path), 'utf8')).gates['4'].optional.at(-1), 'local-notes.md')
})
