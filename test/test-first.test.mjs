import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'
import { inspectTestFirst } from '../template/.gated-pipeline/workflows/test-first.mjs'
import { fixture, put } from './helpers.mjs'

// Every case builds a real repository: the inspector's whole job is reading
// commit order and file history, so a mocked git log would prove only the mock.
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
async function repo(t) {
  const root = await fixture(t)
  git(root, 'init', '-q', '--initial-branch=main')
  await put(root, 'README.md', '# base\n')
  const base = commit(root, 'chore: base')
  return { root, base }
}
function commit(root, message) {
  git(root, 'add', '-A')
  git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-q', '--allow-empty', '-m', message)
  return git(root, 'rev-parse', 'HEAD')
}
const UNIT = 'test("adds", () => { assert.equal(add(1, 2), 3) })\ntest("rejects text", () => { assert.throws(() => add("a", 1)) })\n'
const WEAKENED = 'test("adds", () => { assert.equal(add(1, 2), 3) })\ntest("rejects text", () => {})\n'
const SKIPPED = 'test("adds", () => { assert.equal(add(1, 2), 3) })\ntest.skip("rejects text", () => { assert.throws(() => add("a", 1)) })\n'
const CODE = 'export const add = (a, b) => a + b\n'
const receipt = (commit, tests) => ({ commit, tests })

test('a test commit before the production commit passes', async t => {
  const { root, base } = await repo(t)
  await put(root, 'test/add.test.mjs', UNIT); const red = commit(root, 'test: red')
  await put(root, 'src/add.mjs', CODE); const head = commit(root, 'feat: add')
  const result = inspectTestFirst(root, { base, head, tests: ['test/'], receipts: [receipt(red, ['test/add.test.mjs'])] })
  assert.deepEqual(result.errors, []); assert.equal(result.ok, true); assert.equal(result.firstRed, red); assert.equal(result.firstProduction, head)
})
test('production code before any test commit is reported', async t => {
  const { root, base } = await repo(t)
  await put(root, 'src/add.mjs', CODE); commit(root, 'feat: add')
  await put(root, 'test/add.test.mjs', UNIT); const head = commit(root, 'test: late')
  const result = inspectTestFirst(root, { base, head, tests: ['test/'] })
  assert.equal(result.ok, false); assert.match(result.errors.join('\n'), /production code before/)
})
test('a commit mixing tests and production code cannot show a red phase', async t => {
  const { root, base } = await repo(t)
  await put(root, 'src/add.mjs', CODE); await put(root, 'test/add.test.mjs', UNIT); const head = commit(root, 'feat: both')
  const result = inspectTestFirst(root, { base, head, tests: ['test/'] })
  assert.equal(result.ok, false); assert.match(result.errors.join('\n'), /together/)
})
test('a branch that touches no production code needs no red commit', async t => {
  const { root, base } = await repo(t)
  await put(root, 'docs/guide.md', 'prose\n'); await put(root, '.github/workflows/ci.yml', 'name: ci\n'); const head = commit(root, 'docs: prose')
  const result = inspectTestFirst(root, { base, head, tests: ['test/'] })
  assert.deepEqual(result.errors, []); assert.equal(result.firstProduction, null)
})
test('a receipt-listed file counts as a test even outside declared paths', async t => {
  const { root, base } = await repo(t)
  await put(root, 'spec/add_spec.rb', 'expect(add(1, 2)).to eq(3)\n'); const red = commit(root, 'test: red')
  await put(root, 'lib/add.rb', 'def add(a, b) = a + b\n'); const head = commit(root, 'feat: add')
  const result = inspectTestFirst(root, { base, head, tests: [], receipts: [receipt(red, ['spec/add_spec.rb'])] })
  assert.deepEqual(result.errors, [])
})
test('a receipt whose commit follows the first production commit is reported', async t => {
  const { root, base } = await repo(t)
  await put(root, 'test/a.test.mjs', UNIT); commit(root, 'test: red')
  await put(root, 'src/add.mjs', CODE); commit(root, 'feat: add')
  await put(root, 'test/b.test.mjs', UNIT); const late = commit(root, 'test: late receipt')
  const head = late
  const result = inspectTestFirst(root, { base, head, tests: ['test/'], receipts: [receipt(late, ['test/b.test.mjs'])] })
  assert.equal(result.ok, false); assert.match(result.errors.join('\n'), /receipt .* after production code|after the first production/)
})
test('a receipt must name tests its commit actually touched', async t => {
  const { root, base } = await repo(t)
  await put(root, 'test/a.test.mjs', UNIT); const red = commit(root, 'test: red')
  await put(root, 'src/add.mjs', CODE); const head = commit(root, 'feat: add')
  const result = inspectTestFirst(root, { base, head, tests: ['test/'], receipts: [receipt(red, ['test/never.test.mjs'])] })
  assert.equal(result.ok, false); assert.match(result.errors.join('\n'), /not touched/)
})
test('a receipt commit outside base..head is rejected', async t => {
  const { root, base } = await repo(t)
  await put(root, 'test/a.test.mjs', UNIT); commit(root, 'test: red')
  await put(root, 'src/add.mjs', CODE); const head = commit(root, 'feat: add')
  const result = inspectTestFirst(root, { base, head, tests: ['test/'], receipts: [receipt(base, ['test/a.test.mjs'])] })
  assert.equal(result.ok, false); assert.match(result.errors.join('\n'), /not on this branch/)
})
for (const [name, later, pattern] of [
  ['lost an assertion', WEAKENED, /lost .*assertion/],
  ['gained a skip marker', SKIPPED, /skip/],
]) test(`a red test that ${name} before the head is reported`, async t => {
  const { root, base } = await repo(t)
  await put(root, 'test/a.test.mjs', UNIT); const red = commit(root, 'test: red')
  await put(root, 'src/add.mjs', CODE); commit(root, 'feat: add')
  await put(root, 'test/a.test.mjs', later); const head = commit(root, 'test: relax')
  const result = inspectTestFirst(root, { base, head, tests: ['test/'], receipts: [receipt(red, ['test/a.test.mjs'])] })
  assert.equal(result.ok, false); assert.match(result.errors.join('\n'), pattern)
})
test('a red test deleted before the head is reported', async t => {
  const { root, base } = await repo(t)
  await put(root, 'test/a.test.mjs', UNIT); const red = commit(root, 'test: red')
  await put(root, 'src/add.mjs', CODE); commit(root, 'feat: add')
  await rm(join(root, 'test/a.test.mjs')); const head = commit(root, 'chore: drop test')
  const result = inspectTestFirst(root, { base, head, tests: ['test/'], receipts: [receipt(red, ['test/a.test.mjs'])] })
  assert.equal(result.ok, false); assert.match(result.errors.join('\n'), /deleted/)
})
test('adding assertions to a red test is not weakening', async t => {
  const { root, base } = await repo(t)
  await put(root, 'test/a.test.mjs', UNIT); const red = commit(root, 'test: red')
  await put(root, 'src/add.mjs', CODE); commit(root, 'feat: add')
  await put(root, 'test/a.test.mjs', UNIT + 'test("zero", () => { assert.equal(add(0, 0), 0) })\n'); const head = commit(root, 'test: more')
  assert.deepEqual(inspectTestFirst(root, { base, head, tests: ['test/'], receipts: [receipt(red, ['test/a.test.mjs'])] }).errors, [])
})
test('base must be a distinct ancestor of head', async t => {
  const { root, base } = await repo(t)
  assert.throws(() => inspectTestFirst(root, { base, head: base, tests: [] }), /distinct/)
  assert.throws(() => inspectTestFirst(root, { base: 'b'.repeat(40), head: base, tests: [] }))
})
