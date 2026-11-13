import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { inspectMergeRegression } from '../template/.gated-pipeline/workflows/merge-regression.mjs'
import { fixture, put } from './helpers.mjs'

// Real repositories again: the inspector's whole job is reading merge shape.
const git = (root, ...args) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const commit = (root, message) => { git(root, 'add', '-A'); git(root, 'commit', '-q', '--allow-empty', '-m', message); return git(root, 'rev-parse', 'HEAD') }
const merge = (root, branch) => { git(root, 'merge', '-q', '--no-edit', '--no-ff', branch); return git(root, 'rev-parse', 'HEAD') }
async function repo(t) {
  const root = await fixture(t)
  git(root, 'init', '-q', '--initial-branch=main')
  await put(root, 'README.md', '# base\n'); await put(root, 'src/shared.mjs', 'export const shared = 1\n'); commit(root, 'chore: base')
  git(root, 'checkout', '-q', '-b', 'unit')
  await put(root, 'test/unit.test.mjs', 'assert.equal(1, 1)\n'); await put(root, 'src/unit.mjs', 'export const unit = 1\n'); const verified = commit(root, 'feat: fully gated')
  return { root, verified }
}
const unitPaths = ['src/unit.mjs', 'test/']

test('a clean merge of the target after the gated head is a merge-regression lane', async t => {
  const { root, verified } = await repo(t)
  git(root, 'checkout', '-q', 'main'); await put(root, 'src/other.mjs', 'export const other = 2\n'); commit(root, 'feat: main moves')
  git(root, 'checkout', '-q', 'unit'); const head = merge(root, 'main')
  const result = inspectMergeRegression(root, { verifiedHead: verified, head, unitPaths })
  assert.deepEqual(result.errors, []); assert.equal(result.kind, 'merge-regression'); assert.equal(result.merges, 1)
})
test('a records-only tail with no merge lets every gate stay bound', async t => {
  const { root, verified } = await repo(t)
  await put(root, 'docs/records/unit/gate-5.md', 'record\n'); await put(root, '.gated-pipeline/state/tester/inbox.md', 'handoff\n'); const head = commit(root, 'docs: records')
  const result = inspectMergeRegression(root, { verifiedHead: verified, head, unitPaths })
  assert.equal(result.kind, 'records-only'); assert.equal(result.recordsOnly, 1); assert.equal(result.ok, true)
})
test('a records-only tail after a merge keeps the merge-regression kind', async t => {
  const { root, verified } = await repo(t)
  git(root, 'checkout', '-q', 'main'); await put(root, 'src/other.mjs', 'x\n'); commit(root, 'feat: main')
  git(root, 'checkout', '-q', 'unit'); merge(root, 'main'); await put(root, 'docs/note.md', 'n\n'); const head = commit(root, 'docs: note')
  const result = inspectMergeRegression(root, { verifiedHead: verified, head, unitPaths })
  assert.equal(result.kind, 'merge-regression'); assert.equal(result.ok, true)
})
test('a hand edit outside a merge disqualifies the lane', async t => {
  const { root, verified } = await repo(t)
  await put(root, 'src/shared.mjs', 'export const shared = 3\n'); const head = commit(root, 'fix: sneak')
  const result = inspectMergeRegression(root, { verifiedHead: verified, head, unitPaths })
  assert.equal(result.kind, 'invalid'); assert.match(result.errors.join('\n'), /outside a merge/)
})
test('a unit path changed by the merge disqualifies the lane', async t => {
  const { root, verified } = await repo(t)
  git(root, 'checkout', '-q', 'main'); await put(root, 'test/main.test.mjs', 'assert.ok(true)\n'); commit(root, 'test: main adds a test under the unit prefix')
  git(root, 'checkout', '-q', 'unit'); const head = merge(root, 'main')
  const result = inspectMergeRegression(root, { verifiedHead: verified, head, unitPaths })
  assert.equal(result.ok, false); assert.match(result.errors.join('\n'), /unit path test\/main\.test\.mjs changed/)
})
test('a hand-resolved conflict differs from the merged-in side and is rejected', async t => {
  const { root, verified } = await repo(t)
  git(root, 'checkout', '-q', 'main'); await put(root, 'src/shared.mjs', 'export const shared = 2\n'); commit(root, 'feat: main edits shared')
  git(root, 'checkout', '-q', 'unit'); await put(root, 'src/shared.mjs', 'export const shared = 9\n'); const own = commit(root, 'feat: unit edits shared')
  try { git(root, 'merge', '-q', '--no-edit', '--no-ff', 'main') } catch { /* conflict expected */ }
  await put(root, 'src/shared.mjs', 'export const shared = 5\n'); git(root, 'add', '-A'); git(root, 'commit', '-q', '--no-edit'); const head = git(root, 'rev-parse', 'HEAD')
  const result = inspectMergeRegression(root, { verifiedHead: own, head, unitPaths })
  assert.equal(result.ok, false); assert.match(result.errors.join('\n'), /by hand/)
})
test('a commit the merge did not bring from the other side is rejected', async t => {
  const { root, verified } = await repo(t)
  git(root, 'checkout', '-q', 'main'); await put(root, 'src/other.mjs', 'x\n'); commit(root, 'feat: main')
  git(root, 'checkout', '-q', 'unit'); git(root, 'merge', '-q', '--no-commit', '--no-ff', 'main'); await put(root, 'src/extra.mjs', 'y\n'); git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'merge with a passenger'); const head = git(root, 'rev-parse', 'HEAD')
  const result = inspectMergeRegression(root, { verifiedHead: verified, head, unitPaths })
  assert.equal(result.ok, false); assert.match(result.errors.join('\n'), /merged-in side did not change/)
})
test('a verified head that is not an ancestor, bad SHAs and bad unit paths fail closed', async t => {
  const { root, verified } = await repo(t)
  const head = commit(root, 'docs: empty')
  assert.equal(inspectMergeRegression(root, { verifiedHead: 'b'.repeat(40), head, unitPaths }).ok, false)
  assert.throws(() => inspectMergeRegression(root, { verifiedHead: verified, head: verified, unitPaths }), /distinct/)
  assert.throws(() => inspectMergeRegression(root, { verifiedHead: verified, head, unitPaths: [] }), /unit paths/)
  assert.throws(() => inspectMergeRegression(root, { verifiedHead: verified, head, unitPaths: ['../x'] }), /unit paths/)
})
