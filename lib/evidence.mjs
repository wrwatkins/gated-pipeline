import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { TEMPLATE } from './scaffold.mjs'
import { validate } from './schema.mjs'
const blocking = new Set(['BLOCKING', 'CRITICAL', 'HIGH'])
const roleNames = ['requirements', 'architecture', 'technical design', 'author', 'reviewer', 'verifier', 'security reviewer', 'operations verifier', 'approver']
const schema = JSON.parse(await readFile(join(TEMPLATE, '.gated-pipeline/schemas/evidence.schema.json'), 'utf8'))
const reviewGates = [5, 6, 7, 8, 9]
// A record is read by scripts and pasted into PR bodies, so no string may carry
// a C0/DEL control character or a Unicode format character, and a run id must
// be plain ASCII so it survives every transport unchanged.
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/, FORMAT = /\p{Cf}/u
function controlCharacters(value, path, errors) {
  if (typeof value === 'string') { if (CONTROL.test(value) || FORMAT.test(value)) errors.push(`${path}: control or format character in text`) }
  else if (Array.isArray(value)) value.forEach((item, i) => controlCharacters(item, `${path}[${i}]`, errors))
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) controlCharacters(item, `${path}.${key}`, errors)
}
const PLACEHOLDERS = new Set(['na', 'none', 'nil', 'null', 'tbd', 'tba', 'todo', 'fixme', 'unknown', 'nothing', 'empty', 'placeholder', 'pending', 'same', 'ok', 'yes', 'no', 'true', 'false', 'notapplicable', 'nobrowser', 'nobrowsercontract', 'seeabove', 'asabove', 'seerecord'])
const placeholder = text => { const key = [...text.toLowerCase()].filter(ch => /[\p{L}\p{N}]/u.test(ch)).join(''); return key === '' || PLACEHOLDERS.has(key) }
const distinctWords = text => new Set((text.toLowerCase().match(/[\p{L}]{2,}/gu) || [])).size
// A disposition that the design names no browser contract has to explain itself:
// a reason with at least four distinct words and no placeholder, and at least
// two distinct inspected items. Length bounds are in the schema.
function checkDisposition(entry, prefix, errors) {
  const d = entry.noBrowserContract
  if (!d) return
  if (placeholder(d.reason) || distinctWords(d.reason) < 4) errors.push(`${prefix}: noBrowserContract.reason must explain the disposition, not stand in for it`)
  if (d.inspected.some(placeholder) || new Set(d.inspected.map(item => item.trim().toLowerCase())).size !== d.inspected.length) errors.push(`${prefix}: noBrowserContract.inspected needs distinct, concrete items`)
  if (d.actor.id === entry.actor.id) errors.push(`${prefix}: the no-browser-contract disposition must come from the tester, not the author`)
}

export function checkEvidence(record, project, { head, through = 9, docsScope = null, testFirst = null, mergeRegression = null } = {}) {
  const errors = validate(record, schema)
  controlCharacters(record, '$', errors)
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(head || '')) errors.push('Supply the independently observed full commit with --head')
  if (!Number.isInteger(through) || through < 1 || through > 9) errors.push('through must be between 1 and 9')
  if (errors.length) return { errors, latest: [] }
  if (record.headSha !== head) errors.push('Record belongs to a different head SHA')
  const lite = record.profile === 'docs-lite'
  // Regression-only movement since a fully gated head: the inspector, not the
  // record, decides which kind applies. Planning, authoring and review gates may
  // stay bound to carriedHead; verification, security, operations and approval
  // bind to the head unless no merge happened at all (records-only tail).
  let carriedGates = new Set()
  if (Object.hasOwn(record, 'carriedHead') !== Object.hasOwn(record, 'unitPaths')) errors.push('carriedHead and unitPaths are declared together')
  if (record.carriedHead) {
    if (record.carriedHead === head) errors.push('carriedHead must differ from the head')
    else if (!mergeRegression) errors.push('carriedHead needs the merge-regression inspection; run check inside the repository')
    else if (mergeRegression.ok !== true || mergeRegression.verifiedHead !== record.carriedHead || mergeRegression.head !== head) for (const problem of mergeRegression.errors?.length ? mergeRegression.errors : ['merge-regression inspection did not bind carriedHead to the head']) errors.push(`carriedHead: ${problem}`)
    else carriedGates = new Set(mergeRegression.kind === 'records-only' ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 2, 3, 4, 5])
  }
  const bound = (entry, gate) => entry.headSha === head || (carriedGates.has(gate) && entry.headSha === record.carriedHead)
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
    if (entry.actor.runId !== null && !/^[\x21-\x7e]+$/.test(entry.actor.runId)) errors.push(`${prefix}: runId must be printable ASCII`)
    if (reviewGates.includes(entry.gate) && entry.context !== 'fresh') errors.push(`${prefix}: review and verification gates run in a fresh context; record context: "fresh" or do not record a pass`)
    const previous = record.attempts.slice(0, index).filter(e => e.gate === entry.gate).at(-1)
    if (entry.supersedes) {
      const target = record.attempts.slice(0, index).find(e => e.gate === entry.supersedes.gate && e.attempt === entry.supersedes.attempt)
      if (!target) errors.push(`${prefix}: supersedes names no earlier attempt`)
      else {
        if (target.gate !== entry.gate) errors.push(`${prefix}: a correcting round supersedes an attempt on its own gate`)
        if (target.result !== 'FAIL') errors.push(`${prefix}: only a FAIL round is superseded; a pass is replaced by rework, not corrected`)
        if (target.actor.runId !== null && target.actor.runId === entry.actor.runId) errors.push(`${prefix}: a correcting round needs a fresh run, not the superseded attempt's run`)
      }
    }
    if (previous?.result === 'FAIL' && !(entry.supersedes && entry.supersedes.attempt === previous.attempt)) errors.push(`${prefix}: the round after a FAIL must declare supersedes {gate ${entry.gate}, attempt ${previous.attempt}}`)
    if (entry.noBrowserContract && entry.gate !== 4) errors.push(`${prefix}: the no-browser-contract disposition belongs to the gate 4 attempt`)
    checkDisposition(entry, prefix, errors)
    for (const [i, receipt] of (entry.redReceipts || []).entries()) {
      const rp = `${prefix} red receipt[${i}]`
      const rid = JSON.stringify([receipt.actor.kind, receipt.actor.tool, receipt.actor.model, receipt.actor.runId])
      if (actors.has(receipt.actor.id) && actors.get(receipt.actor.id) !== rid) errors.push(`${rp}: actor ID has contradictory tool/model/run attribution`)
      actors.set(receipt.actor.id, rid)
      if (entry.gate !== 4) errors.push(`${rp}: red receipts belong to the gate 4 attempt`)
      if (receipt.exitCode === 0) errors.push(`${rp}: a red receipt must record a failing run (nonzero exit)`)
      if (receipt.commit === entry.headSha) errors.push(`${rp}: a red receipt commit must precede the reviewed head, not be it`)
    }
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
      if (!predecessor || predecessor.result === 'FAIL' || (predecessor.headSha !== entry.headSha && !(carriedGates.has(gate) && predecessor.headSha === record.carriedHead))) errors.push(`${prefix}: gate ${gate} has no passing prerequisite on this revision`)
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
    if (!bound(entry, gate)) errors.push(`Gate ${gate}: stale evidence`)
    if (entry.result === 'PASS_NA') continue
    if (gate === 4 && !lite) {
      if (record.profile === 'full' && !entry.redReceipts?.length) errors.push('Gate 4: full profile needs at least one red receipt (failing tests committed before production code)')
      if (record.profile === 'full' && !entry.noBrowserContract && !entry.redReceipts?.some(r => r.actor.id !== entry.actor.id)) errors.push('Gate 4: full profile needs the tester\'s own red receipt or a noBrowserContract disposition from the tester')
      if (testFirst && testFirst.ok !== true) for (const problem of testFirst.errors || ['branch inspection did not pass']) errors.push(`Gate 4: ${problem}`)
    }
    let required = lite ? (gate === 4 ? ['docs'] : ['scope', 'docs', ...project.ci.requiredChecks]) : gate === 4 ? project.requiredChecks : gate === 6 ? ['test', ...(project.commands.e2e ? ['e2e'] : [])] : gate === 7 ? [...['sast', 'audit'].filter(name => project.commands[name]), ...(record.profile === 'docs' ? [] : ['adversarial'])] : gate === 8 ? ['rollback', ...project.ci.requiredChecks] : []
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
    for (const gate of (lite ? [5] : reviewGates).filter(gate => gate <= through)) {
      const reviewer = states.get(gate)?.actor
      if (author && reviewer && (reviewer.id === author.id || (author.runId && reviewer.runId === author.runId))) {
        errors.push(`Gate ${gate}: independent review requires a different actor/run from the author`)
      }
    }
  }
  return { errors, latest }
}
const cell = value => String(value ?? 'not exposed').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;').replace(/[\r\n]/g, ' ')
export function prBody(record, latest) {
  const rows = latest.map(entry => `| ${entry.gate} · ${record.profile === 'docs-lite' && entry.gate === 5 ? 'reviewer / verifier / approver' : roleNames[entry.gate-1]} | ${cell(entry.actor.tool)} | ${cell(entry.actor.id)} | ${cell(entry.actor.model)} | ${cell(entry.actor.runId)} | ${entry.result}${entry.supersedes ? ` (corrects attempt ${entry.supersedes.attempt})` : ''} |`)
  const receipts = latest.flatMap(entry => (entry.redReceipts || []).map(receipt => `- Gate ${entry.gate} / red receipt by ${cell(receipt.actor.id)}: ${receipt.tests.map(cell).join(', ')} failing at ${cell(receipt.commit.slice(0, 12))}; ${cell(receipt.command)} exit ${receipt.exitCode}; ${cell(receipt.reference)}`))
  const dispositions = latest.flatMap(entry => entry.noBrowserContract ? [`- Gate ${entry.gate} / no browser contract, disposition by ${cell(entry.noBrowserContract.actor.id)}: ${cell(entry.noBrowserContract.reason)}; inspected ${entry.noBrowserContract.inspected.map(cell).join(', ')}`] : [])
  const carried = record.carriedHead ? `\nCarried from: ${record.carriedHead} (regression-only movement over ${record.unitPaths.map(cell).join(', ')}; verified by the merge-regression inspector)` : ''
  const checks = [...receipts, ...dispositions, ...latest.flatMap(entry => entry.evidence.map(item => `- Gate ${entry.gate} / ${cell(item.check)}: ${item.status}; ${cell(item.command || item.source)}; ${cell(item.reference)}${item.reason ? '; ' + cell(item.reason) : ''}`))]
  return `## Gate evidence\n\nUnit: ${cell(record.unit)}\nGate profile: ${record.profile}\nReviewed commit: ${record.headSha}${carried}\n\n## Attribution\n\n| Gate / role | Tool | Actor / session ID | Model | Run reference | Result |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n\nAttribution is declared by the actors and reviewed with the evidence; it is not a cryptographic attestation. Unknown model/run metadata is explicitly recorded, never inferred.\n\n## Verification\n\n${checks.join('\n')}\n\nAttempts retained: ${record.attempts.length}; failed attempts: ${record.attempts.filter(e=>e.result==='FAIL').length}. Attach the complete JSON record so historical failures and attribution remain auditable.\n`
}
