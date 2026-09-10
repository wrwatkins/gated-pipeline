import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { TEMPLATE } from './scaffold.mjs'
import { validate } from './schema.mjs'
const blocking = new Set(['BLOCKING', 'CRITICAL', 'HIGH'])
const roleNames = ['requirements', 'architecture', 'technical design', 'author', 'reviewer', 'verifier', 'security reviewer', 'operations verifier', 'approver']
const schema = JSON.parse(await readFile(join(TEMPLATE, '.gated-pipeline/schemas/evidence.schema.json'), 'utf8'))

export function checkEvidence(record, project, { head, through = 9, docsScope = null } = {}) {
  const errors = validate(record, schema)
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(head || '')) errors.push('Supply the independently observed full commit with --head')
  if (!Number.isInteger(through) || through < 1 || through > 9) errors.push('through must be between 1 and 9')
  if (errors.length) return { errors, latest: [] }
  if (record.headSha !== head) errors.push('Record belongs to a different head SHA')
  const lite = record.profile === 'docs-lite'
  const order = lite ? [4, 5] : [1, 2, 3, 4, 5, 6, 7, 8, 9]
  if (lite) {
    if (through < 4) errors.push('docs-lite starts at author preparation gate4')
    if (!docsScope || docsScope.eligible !== true || docsScope.whitespaceClean !== true || docsScope.headSha !== head ||
        !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(docsScope.baseSha || '') || !docsScope.paths?.length) {
      errors.push('docs-lite needs independently inspected eligible complete base/head Git scope')
    }
    if (!project.ci.requiredChecks.length) errors.push('docs-lite requires named fast CI checks; zero checks cannot pass')
  }
  const states = new Map(), attempts = new Map(), actors = new Map(), openFindings = new Map()
  for (const [index, entry] of record.attempts.entries()) {
    const prefix = `attempts[${index}] (gate ${entry.gate})`
    if (!order.includes(entry.gate)) errors.push(`${prefix}: gate is outside the docs-lite sequence4,5`)
    if (entry.attempt !== (attempts.get(entry.gate) || 0) + 1) errors.push(`${prefix}: attempt numbers must be consecutive`)
    attempts.set(entry.gate, entry.attempt)
    const identity = JSON.stringify([entry.actor.kind, entry.actor.tool, entry.actor.model, entry.actor.runId])
    if (actors.has(entry.actor.id) && actors.get(entry.actor.id) !== identity) errors.push(`${prefix}: actor ID has contradictory tool/model/run attribution`)
    actors.set(entry.actor.id, identity)
    if (entry.actor.kind === 'human' && (entry.actor.tool !== 'none' || entry.actor.model !== null)) errors.push(`${prefix}: human attribution requires tool=none and model=null`)
    if (entry.actor.kind === 'agent' && ['none', 'unknown'].includes(entry.actor.tool.toLowerCase())) errors.push(`${prefix}: name the actual agent tool`)
    const checkNames = new Set()
    for (const item of entry.evidence) {
      if (checkNames.has(item.check)) errors.push(`${prefix}: duplicate check ${item.check}`)
      checkNames.add(item.check)
      if (item.status === 'na' && !item.reason?.trim()) errors.push(`${prefix}: n/a check ${item.check} needs a reason`)
      if (item.source === 'command' && item.status !== 'na' && (!item.command?.trim() || item.exitCode === null)) errors.push(`${prefix}: command check ${item.check} needs command and exitCode`)
      if (item.status === 'pass' && item.source === 'command' && item.exitCode !== 0) errors.push(`${prefix}: nonzero exit code cannot pass`)
      if (item.source !== 'command' && (item.command !== null || item.exitCode !== null)) errors.push(`${prefix}: non-command evidence must use null command/exitCode`)
    }
    for (const finding of entry.findings) {
      if (finding.resolved) openFindings.delete(finding.id)
      else if (blocking.has(finding.severity)) openFindings.set(finding.id, entry.gate)
    }
    if (new Set(entry.findings.map(f => f.id)).size !== entry.findings.length) errors.push(`${prefix}: duplicate finding IDs`)
    if (entry.result === 'PASS_NA' && (entry.gate > 3 || !entry.reason?.trim())) errors.push(`${prefix}: PASS_NA is restricted to gates 1–3 with a reason`)
    if (entry.result !== 'FAIL') {
      if (entry.findings.some(f => blocking.has(f.severity) && !f.resolved)) errors.push(`${prefix}: unresolved blocker cannot pass`)
      if (entry.evidence.some(item => item.status === 'fail')) errors.push(`${prefix}: failed evidence cannot pass`)
      if (entry.result === 'PASS' && !entry.evidence.some(item => item.status === 'pass')) errors.push(`${prefix}: PASS needs at least one completed check`)
    } else if (!entry.reason?.trim() && !entry.findings.length) errors.push(`${prefix}: FAIL needs a reason or finding`)
    // Each revision has its own sequence. Historical failed/stale rounds stay
    // readable but cannot satisfy the current revision's prerequisites.
    for (const gate of order.filter(g => g < entry.gate)) {
      const predecessor = states.get(gate)
      if (!predecessor || predecessor.result === 'FAIL' || predecessor.headSha !== entry.headSha) errors.push(`${prefix}: gate ${gate} has no passing prerequisite on this revision`)
    }
    for (let gate = entry.gate; gate <= 9; gate++) states.delete(gate)
    states.set(entry.gate, entry)
  }
  for (const [id, gate] of openFindings) if (gate <= through) errors.push(`Unresolved historical blocker ${id}: record an explicit resolution`)
  const latest = []
  for (const gate of order.filter(g => g <= through)) {
    const entry = states.get(gate)
    if (!entry) { errors.push(`Gate ${gate}: missing or invalidated by rework`); continue }
    latest.push(entry)
    if (entry.result === 'FAIL') errors.push(`Gate ${gate}: failed`)
    if (entry.headSha !== head) errors.push(`Gate ${gate}: stale evidence`)
    if (entry.result === 'PASS_NA') continue
    let required = lite ? (gate === 4 ? ['docs'] : ['scope', 'docs', ...project.ci.requiredChecks]) : gate === 4 ? project.requiredChecks : gate === 6 ? ['test', ...(project.commands.e2e ? ['e2e'] : [])] : gate === 7 ? ['sast', 'audit'].filter(name => project.commands[name]) : gate === 8 ? ['rollback', ...project.ci.requiredChecks] : []
    for (const name of required) {
      const item = entry.evidence.find(item => item.check === name)
      const naAllowed = record.profile === 'docs' && gate !== 8
      if (!item || (item.status !== 'pass' && !(naAllowed && item.status === 'na' && item.reason))) errors.push(`Gate ${gate}: missing passing ${name} evidence`)
      if (item?.status === 'pass' && project.commands[name] && gate !== 8 && (item.source === 'manual' || (item.source === 'command' && item.command !== project.commands[name]))) errors.push(`Gate ${gate}: ${name} must cite the configured command or CI`)
      if ((gate === 8 || (lite && gate === 5)) && project.ci.requiredChecks.includes(name) && item?.source !== 'ci') errors.push(`Gate ${gate}: ${name} must cite CI evidence`)
    }
  }
  for (const name of lite ? [] : project.requiredChecks) if (!project.commands[name]) errors.push(`Project required command ${name} is not configured`)
  if ((project.independentReview || lite) && through >= 5) {
    const author = states.get(4)?.actor
    for (const gate of (lite ? [5] : [5, 7, 9]).filter(gate => gate <= through)) {
      const reviewer = states.get(gate)?.actor
      if (author && reviewer && (reviewer.id === author.id ||
          (author.runId && reviewer.runId === author.runId && reviewer.tool === author.tool))) {
        errors.push(`Gate ${gate}: independent review requires a different actor/run from the author`)
      }
    }
  }
  return { errors, latest }
}
const cell = value => String(value ?? 'not exposed').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;').replace(/[\r\n]/g, ' ')
export function prBody(record, latest) {
  const rows = latest.map(entry => `| ${entry.gate} · ${record.profile === 'docs-lite' && entry.gate === 5 ? 'reviewer / verifier / approver' : roleNames[entry.gate-1]} | ${cell(entry.actor.tool)} | ${cell(entry.actor.id)} | ${cell(entry.actor.model)} | ${cell(entry.actor.runId)} | ${entry.result} |`)
  const checks = latest.flatMap(entry => entry.evidence.map(item => `- Gate ${entry.gate} / ${cell(item.check)}: ${item.status}; ${cell(item.command || item.source)}; ${cell(item.reference)}${item.reason ? '; ' + cell(item.reason) : ''}`))
  return `## Gate evidence\n\nUnit: ${cell(record.unit)}\nGate profile: ${record.profile}\nReviewed commit: ${record.headSha}\n\n## Attribution\n\n| Gate / role | Tool | Actor / session ID | Model | Run reference | Result |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n\nAttribution is declared by the actors and reviewed with the evidence; it is not a cryptographic attestation. Unknown model/run metadata is explicitly recorded, never inferred.\n\n## Verification\n\n${checks.join('\n')}\n\nAttempts retained: ${record.attempts.length}; failed attempts: ${record.attempts.filter(e=>e.result==='FAIL').length}. Attach the complete JSON record so historical failures and attribution remain auditable.\n`
}
