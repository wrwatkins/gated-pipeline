import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, unlink, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { fixture, put, run } from './helpers.mjs'

const readJSON = async (root, path) => JSON.parse(await readFile(join(root, path), 'utf8'))
async function installed(t) {
  const root = await fixture(t)
  assert.equal(run(['install', '--yes'], root).status, 0)
  return root
}
test('scaffold codifies all nine areas without claiming adoption or measured savings', async t => {
  const root = await installed(t), result = run(['governance', '--json'], root)
  assert.equal(result.status, 0, result.stderr)
  const data = JSON.parse(result.stdout)
  assert.equal(data.valid, true)
  assert.equal(data.areaCount, 9)
  assert.equal(data.promptVersions, 0)
  assert.equal(data.auditEvents, 0)
  assert.ok(data.warnings.some(w => /not.*adoption|not.*compliance/.test(w)))
  const config = await readJSON(root, 'ai-repository.json')
  assert.deepEqual(config.dataClasses, ['public', 'internal', 'pii', 'secrets'])
})
test('missing area homes and unknown configuration fields fail', async t => {
  const root = await installed(t), config = await readJSON(root, 'ai-repository.json')
  await unlink(join(root, config.areas.standards))
  assert.equal(run(['governance'], root).status, 1)
  await put(root, config.areas.standards, '# Standards\n')
  await put(root, 'ai-repository.json', JSON.stringify({ ...config, assumeCompliant: true }))
  assert.equal(run(['governance'], root).status, 1)
})
test('versioned prompt hash catches edits and duplicate versions', async t => {
  const root = await installed(t), text = '# Synthetic prompt\nDo a bounded test task.\n'
  await put(root, 'prompts/sample/SKILL.md', text)
  const row = { id: 'sample', version: '1.0.0', path: 'prompts/sample/SKILL.md', sha256: createHash('sha256').update(text).digest('hex'), owner: 'test-owner', evaluationRef: 'synthetic fixture' }
  await put(root, 'prompts/registry.json', JSON.stringify({ schemaVersion: 1, prompts: [row] }))
  assert.equal(run(['governance'], root).status, 0)
  await put(root, 'prompts/sample/SKILL.md', text + 'Changed without version review.\n')
  assert.equal(run(['governance'], root).status, 1)
  await put(root, 'prompts/sample/SKILL.md', text)
  await put(root, 'prompts/registry.json', JSON.stringify({ schemaVersion: 1, prompts: [row, row] }))
  assert.equal(run(['governance'], root).status, 1)
})
test('audit events require explicit actor/model metadata and reject raw payload fields', async t => {
  const root = await installed(t)
  const event = { schemaVersion: 1, id: 'fixture-1', timestamp: '2026-09-09T00:00:00Z', action: 'test', result: 'pass', headSha: 'a'.repeat(40), actor: { id: 'synthetic-agent', kind: 'agent', tool: 'future-tool', model: null, runId: null }, evidenceRef: 'synthetic fixture', decisionRef: null, usageRef: null }
  await put(root, '.gated-pipeline/audit/actions.jsonl', JSON.stringify(event) + '\n')
  assert.equal(run(['governance'], root).status, 0)
  for (const invalid of [{ ...event, rawOutput: 'PRIVATE_MEMBER_BODY' }, { ...event, actor: { id: 'missing-attribution' } }, { ...event, timestamp: 'not-a-time' }]) {
    await put(root, '.gated-pipeline/audit/actions.jsonl', JSON.stringify(invalid) + '\n')
    const result = run(['governance', '--json'], root)
    assert.equal(result.status, 1)
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_MEMBER_BODY/)
  }
  await put(root, '.gated-pipeline/audit/actions.jsonl', JSON.stringify(event) + '\n' + JSON.stringify(event) + '\n')
  assert.equal(run(['governance'], root).status, 1)
})
test('governance rejects linked paths and redacts malformed configuration bodies', async t => {
  const root = await installed(t), outside = await fixture(t)
  await put(outside, 'private.json', 'DO_NOT_PRINT_PRIVATE_BODY')
  await unlink(join(root, 'prompts/registry.json'))
  await symlink(join(outside, 'private.json'), join(root, 'prompts/registry.json'))
  assert.equal(run(['governance'], root).status, 1)
  await put(root, 'ai-repository.json', 'DO_NOT_PRINT_PRIVATE_BODY')
  const result = run(['governance'], root)
  assert.equal(result.status, 1)
  assert.doesNotMatch(result.stdout + result.stderr, /DO_NOT_PRINT_PRIVATE_BODY/)
})
test('cost check distinguishes measured within-budget, exceeded and unknown usage', async t => {
  const root = await installed(t), policy = await readJSON(root, 'cost-policy.json')
  policy.budgets.totalTokens = 100
  policy.budgets.costUsd = 1
  await put(root, 'cost-policy.json', JSON.stringify(policy))
  const usage = { schemaVersion: 1, source: 'synthetic test fixture', reference: 'test event', inputTokens: 40, outputTokens: 20, cachedInputTokens: 10, costUsd: 0.5, peakAgents: 1 }
  await put(root, 'usage.json', JSON.stringify(usage))
  let result = run(['cost-check', 'usage.json', '--json'], root)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).status, 'within_budget')
  await put(root, 'usage.json', JSON.stringify({ ...usage, outputTokens: 80 }))
  result = run(['cost-check', 'usage.json', '--json'], root)
  assert.equal(result.status, 1)
  assert.equal(JSON.parse(result.stdout).status, 'exceeded')
  await put(root, 'usage.json', JSON.stringify({ ...usage, costUsd: null }))
  result = run(['cost-check', 'usage.json', '--json'], root)
  assert.equal(result.status, 1)
  assert.equal(JSON.parse(result.stdout).status, 'unknown')
})
test('cost check rejects impossible counters and retains project policy on sync', async t => {
  const root = await installed(t)
  const policy = await readJSON(root, 'cost-policy.json')
  policy.budgets.totalTokens = 123
  await put(root, 'cost-policy.json', JSON.stringify(policy))
  assert.equal(run(['sync'], root).status, 0)
  assert.equal((await readJSON(root, 'cost-policy.json')).budgets.totalTokens, 123)
  const usage = { schemaVersion: 1, source: 'synthetic fixture', reference: 'test', inputTokens: 10, outputTokens: 0, cachedInputTokens: 11, costUsd: null, peakAgents: 1 }
  await put(root, 'usage.json', JSON.stringify(usage))
  assert.equal(run(['cost-check', 'usage.json'], root).status, 1)
})

test('doctor detects broken governance and sync preserves populated project homes', async t => {
  const root = await installed(t), map = await readJSON(root, 'ai-repository.json')
  const path = map.areas.context, local = '# Project-specific decisions\nSynthetic business context.\n'
  await put(root, path, local)
  map.accountableOwners.context = 'synthetic-owner'
  await put(root, 'ai-repository.json', JSON.stringify(map))
  assert.equal(run(['sync'], root).status, 0)
  assert.equal(await readFile(join(root, path), 'utf8'), local)
  assert.equal((await readJSON(root, 'ai-repository.json')).accountableOwners.context, 'synthetic-owner')
  await unlink(join(root, path))
  const report = JSON.parse(run(['doctor', '--json'], root).stdout)
  assert.ok(report.errors.some(e => /Governance file/.test(e)))
})
test('unsafe paths, nonfiles, oversized and malformed governance inputs fail without private diagnostics', async t => {
  const root = await installed(t), original = await readJSON(root, 'ai-repository.json')
  for (const path of ['../private', '/tmp/private', 'prompts//registry.json', 'prompts/./registry.json', 'prompts/registry.json\n', 'prompts']) {
    await put(root, 'ai-repository.json', JSON.stringify({ ...original, promptRegistry: path }))
    assert.equal(run(['governance'], root).status, 1, path)
  }
  await put(root, 'ai-repository.json', JSON.stringify(original))
  for (const path of ['ai-repository.json', 'prompts/registry.json', '.gated-pipeline/audit/actions.jsonl', 'cost-policy.json']) {
    const saved = await readFile(join(root, path), 'utf8')
    for (const content of ['PRIVATE_PAYLOAD', '{"PRIVATE_KEY":"PRIVATE_VALUE"}', ' '.repeat(path.endsWith('jsonl') ? 4 * 1024 * 1024 + 1 : 1024 * 1024 + 1)]) {
      await put(root, path, content)
      const result = run(['governance', '--json'], root)
      assert.equal(result.status, 1, path)
      assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_/)
    }
    await put(root, path, saved)
  }
})
test('unconfigured budgets, zero ceilings, partial counters and invalid numbers are distinct', async t => {
  const root = await installed(t), policy = await readJSON(root, 'cost-policy.json')
  for (const key of Object.keys(policy.budgets)) policy.budgets[key] = null
  const usage = { schemaVersion: 1, source: 'fixture', reference: 'fixture', inputTokens: null, outputTokens: null, cachedInputTokens: null, costUsd: null, peakAgents: null }
  await put(root, 'cost-policy.json', JSON.stringify(policy))
  await put(root, 'usage.json', JSON.stringify(usage))
  let result = run(['cost-check', 'usage.json', '--dir', root, '--json'], root)
  assert.equal(result.status, 1)
  assert.equal(JSON.parse(result.stdout).status, 'unknown')
  policy.budgets.totalTokens = 0
  await put(root, 'cost-policy.json', JSON.stringify(policy))
  await put(root, 'usage.json', JSON.stringify({ ...usage, inputTokens: 0, outputTokens: 0 }))
  assert.equal(run(['cost-check', 'usage.json'], root).status, 0)
  for (const counters of [{ inputTokens: -1 }, { inputTokens: 0.5 }, { inputTokens: Number.MAX_SAFE_INTEGER, outputTokens: 1 }, { cachedInputTokens: 1 }]) {
    await put(root, 'usage.json', JSON.stringify({ ...usage, ...counters }))
    assert.equal(run(['cost-check', 'usage.json'], root).status, 1)
  }
  await put(root, 'usage.json', JSON.stringify(usage).replace('"costUsd":null', '"costUsd":1e999'))
  assert.equal(run(['cost-check', 'usage.json'], root).status, 1)
})
