import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { symlink, chmod, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { inspectDocsDiff } from '../template/.gated-pipeline/workflows/docs-scope.mjs'
import { checkEvidence, prBody } from '../lib/evidence.mjs'
import { fixture, put, project, record, sha, run } from './helpers.mjs'

const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const commit = root => { git(root, 'add', '-A'); git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '--allow-empty', '-qm', 'Fixture'); return git(root, 'rev-parse', 'HEAD') }
async function repo(t, policy = { schemaVersion: 1, paths: ['README.md', 'docs/'] }) {
  const root = await fixture(t); git(root, 'init', '-q')
  await put(root, 'docs-policy.json', JSON.stringify(policy))
  await put(root, 'README.md', '# Example\n'); await put(root, 'docs/guides/start.md', 'Read me.\n')
  await put(root, 'docs/security/audit.md', 'Original audit evidence.\n')
  return { root, base: commit(root) }
}
test('complete committed prose diff is eligible, and CLI inspects real Git instead of supplied metadata', async t => {
  const { root, base } = await repo(t); await put(root, 'docs/guides/start.md', 'Updated explanatory prose.\n'); const head = commit(root)
  const scope = inspectDocsDiff(root, { base, head }); assert.equal(scope.eligible, true); assert.deepEqual(scope.paths, [{ path: 'docs/guides/start.md', status: 'M' }])
  assert.equal(run(['docs-scope', '--base=' + base, '--head=' + head, '--json'], root).status, 0)
  assert.equal(run(['docs-scope', '--head=' + head], root).status, 1)
})
for (const path of ['code.js', 'docs/guide.mdx', 'docs/guide.html', 'AGENTS.md', 'docs/PROCESS.md', 'docs/security/check.md', 'docs/releases/2026.md', 'docs/knowledge/record.md', 'docs/prompts/helper.md', 'docs/guides/agent-policy.md']) {
  test(`sensitive or executable path cannot use docs-lite: ${path}`, async t => {
    const { root, base } = await repo(t); await put(root, path, 'text\n'); const head = commit(root)
    assert.equal(inspectDocsDiff(root, { base, head }).eligible, false)
  })
}
test('head cannot authorize its own policy expansion', async t => {
  const { root, base } = await repo(t, { schemaVersion: 1, paths: ['README.md'] })
  await put(root, 'docs-policy.json', JSON.stringify({ schemaVersion: 1, paths: ['docs/'] })); await put(root, 'docs/guides/start.md', 'Expanded.\n')
  const scope = inspectDocsDiff(root, { base, head: commit(root) }); assert.equal(scope.eligible, false)
  assert.ok(scope.reasons.includes('docs/guides/start.md: outside base policy'))
})
test('renaming a sensitive source into allowed docs still rejects its deletion', async t => {
  const { root, base } = await repo(t); await rename(join(root, 'docs/security/audit.md'), join(root, 'docs/guides/report.md'))
  const scope = inspectDocsDiff(root, { base, head: commit(root) }); assert.equal(scope.eligible, false)
  assert.ok(scope.paths.some(p => p.path === 'docs/security/audit.md' && p.status === 'D'))
})
test('symlink, executable mode, binary Markdown and complete-diff whitespace failures reject', async t => {
  for (const kind of ['symlink', 'executable', 'binary', 'whitespace']) {
    const { root, base } = await repo(t)
    if (kind === 'symlink') { await unlink(join(root, 'README.md')); await symlink('docs/guides/start.md', join(root, 'README.md')) }
    if (kind === 'executable') await chmod(join(root, 'README.md'), 0o755)
    if (kind === 'binary') await put(root, 'README.md', 'binary\0text\n')
    if (kind === 'whitespace') await put(root, 'README.md', 'trailing  \n')
    assert.equal(inspectDocsDiff(root, { base, head: commit(root) }).eligible, false, kind)
  }
})
test('disabled, malformed policy and empty diff fail closed', async t => {
  for (const policy of [{ schemaVersion: 1, paths: [] }, { schemaVersion: 1, paths: ['../'] }, { schemaVersion: 2, paths: ['README.md'] }]) {
    const { root, base } = await repo(t, policy); await put(root, 'README.md', 'Changed.\n')
    assert.throws(() => inspectDocsDiff(root, { base, head: commit(root) }), /policy/)
  }
  const { root, base } = await repo(t); assert.equal(inspectDocsDiff(root, { base, head: commit(root) }).eligible, false)
})
const item = (check, source = 'manual') => ({ check, status: 'pass', source, command: null, exitCode: null, reference: 'actual bounded evidence', reason: null })
async function lite() {
  const p = await project(); p.ci.requiredChecks = ['docs-ci']
  const r = record({ profile: 'docs-lite' }); r.attempts = r.attempts.filter(e => [4, 5].includes(e.gate))
  r.attempts[0].evidence = [item('docs')]; r.attempts[1].evidence = [item('scope'), item('docs'), item('docs-ci', 'ci')]
  return { p, r, options: { head: sha, docsScope: { eligible: true, whitespaceClean: true, headSha: sha, baseSha: 'b'.repeat(40), paths: [{ path: 'README.md', status: 'M' }] } } }
}
test('docs-lite needs two actual records, one independent reviewer, and named fast CI', async () => {
  const { p, r, options } = await lite(); const result = checkEvidence(r, p, options)
  assert.deepEqual(result.errors, []); assert.deepEqual(result.latest.map(e => e.gate), [4, 5])
  assert.match(prBody(r, result.latest), /reviewer \/ verifier \/ approver/)
})
for (const [name, mutate] of [
  ['missing scope inspection', (p, r, o) => { o.docsScope = null }],
  ['stale scope', (p, r, o) => { o.docsScope.headSha = 'c'.repeat(40) }],
  ['failed scope', (p, r, o) => { o.docsScope.eligible = false }],
  ['zero CI', p => { p.ci.requiredChecks = [] }],
  ['missing CI', (p, r) => { r.attempts[1].evidence.pop() }],
  ['manual CI claim', (p, r) => { r.attempts[1].evidence[2].source = 'manual' }],
  ['missing semantic review', (p, r) => { r.attempts[1].evidence.shift() }],
  ['self review even with independence disabled', (p, r) => { p.independentReview = false; r.attempts[1].actor = { ...r.attempts[0].actor } }],
  ['relabelled same agent run', (p, r) => { r.attempts[0].actor.runId = 'run'; r.attempts[1].actor = { ...r.attempts[0].actor, id: 'other-label' } }],
  ['stale review', (p, r) => { r.attempts[1].headSha = 'c'.repeat(40) }],
  ['failed review', (p, r) => { r.attempts[1].result = 'FAIL'; r.attempts[1].reason = 'Policy content' }],
  ['new author rework invalidates approval', (p, r) => { r.attempts.push({ ...r.attempts[0], attempt: 2 }) }],
]) test(`docs-lite rejects ${name}`, async () => { const { p, r, options } = await lite(); mutate(p, r, options); assert.ok(checkEvidence(r, p, options).errors.length) })
test('unresolved historical blocker must be explicitly resolved', async () => {
  const { p, r, options } = await lite(); const fail = structuredClone(r.attempts[1]); fail.result = 'FAIL'
  fail.findings = [{ id: 'D1', severity: 'BLOCKING', what: 'Changed policy', file: 'README.md', line: 1, resolved: false }]
  r.attempts.splice(1, 0, fail); r.attempts[2].attempt = 2
  assert.match(checkEvidence(r, p, options).errors.join('\n'), /historical blocker/)
  r.attempts[2].findings = [{ ...fail.findings[0], resolved: true }]; assert.deepEqual(checkEvidence(r, p, options).errors, [])
})

test('check and pr-body derive docs-lite eligibility from committed Git', async t => {
  const { root, base } = await repo(t)
  const { p, r } = await lite()
  await put(root, 'README.md', 'Updated prose.\n')
  const head = commit(root)
  r.headSha = head; for (const e of r.attempts) e.headSha = head
  await put(root, 'pipeline.config.json', JSON.stringify(p))
  await put(root, 'evidence.json', JSON.stringify(r))
  const args = ['evidence.json', '--head=' + head, '--base=' + base]
  const checked = run(['check', ...args], root)
  assert.equal(checked.status, 0, checked.stderr)
  assert.match(run(['pr-body', ...args], root).stdout, /reviewer \/ verifier \/ approver/)
  assert.equal(run(['check', 'evidence.json', '--head=' + head], root).status, 1)
  await put(root, 'docs/security/check.md', 'A changed audit verdict.\n')
  const changed = commit(root); r.headSha = changed; for (const e of r.attempts) e.headSha = changed
  await put(root, 'evidence.json', JSON.stringify(r))
  assert.equal(run(['check', 'evidence.json', '--head=' + changed, '--base=' + base], root).status, 1)
})

test('nested working directory and diff.relative cannot hide runtime changes', async t => {
  const { root } = await repo(t)
  await put(root, 'docs/docs-policy.json', JSON.stringify({ schemaVersion: 1, paths: ['README.md'] }))
  await put(root, 'docs/README.md', 'Nested prose.\n')
  await put(root, 'runtime.js', 'original()\n')
  const base = commit(root)
  await put(root, 'runtime.js', 'changed()\n')
  await put(root, 'docs/README.md', 'Updated nested prose.\n')
  const head = commit(root)
  git(root, 'config', 'diff.relative', 'true')
  for (const directory of [root, join(root, 'docs')]) {
    const scope = inspectDocsDiff(directory, { base, head })
    assert.equal(scope.eligible, false)
    assert.ok(scope.paths.some(p => p.path === 'runtime.js'))
    assert.ok(scope.paths.some(p => p.path === 'docs/README.md'))
    assert.equal(run(['docs-scope', '--base=' + base, '--head=' + head], directory).status, 1)
  }
})
