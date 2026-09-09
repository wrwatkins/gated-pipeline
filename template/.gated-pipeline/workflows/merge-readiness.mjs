import { readFile, lstat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const text = value => typeof value === 'string' && value.trim().length > 0 && !/[\x00-\x1f\x7f]/.test(value)
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const keys = (value, names) => object(value) && Object.keys(value).length === names.length && names.every(key => Object.hasOwn(value, key))
const actor = value => keys(value, ['id', 'tool', 'runId']) && text(value.id) && text(value.tool) && (value.runId === null || text(value.runId))

// Only validates declared evidence and fresh platform metadata supplied by the
// caller. No authentication, fetching, model invocation, approval or merge.
export function verifyMerge({ head, review, policy, checks } = {}) {
  const errors = []
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(head || '')) errors.push('Supply the observed full PR head')
  if (!keys(review, ['schemaVersion', 'headSha', 'result', 'author', 'reviewer', 'evidence']) || review.schemaVersion !== 1 || review.headSha !== head || review.result !== 'PASS' || !actor(review.author) || !actor(review.reviewer) || !Array.isArray(review.evidence) || !review.evidence.length || !review.evidence.every(text)) {
    errors.push('Missing, malformed, failed or stale independent review receipt')
  } else if (review.author.id === review.reviewer.id || (review.author.runId && review.author.tool === review.reviewer.tool && review.author.runId === review.reviewer.runId)) errors.push('An author or renamed author run cannot supply independent review')
  if (!keys(policy, ['schemaVersion', 'checks']) || policy.schemaVersion !== 1 || !Array.isArray(policy.checks) || !policy.checks.length) errors.push('Configure a nonempty named-check policy')
  else {
    const names = new Set()
    for (const rule of policy.checks) {
      if (!keys(rule, ['name', 'app', 'conclusions', 'skipReason']) || !text(rule.name) || !text(rule.app) || !Array.isArray(rule.conclusions) || !rule.conclusions.includes('success') || rule.conclusions.some(c => !['success', 'skipped'].includes(c)) || new Set(rule.conclusions).size !== rule.conclusions.length || (rule.skipReason !== null && !text(rule.skipReason)) || (rule.conclusions.includes('skipped') && !text(rule.skipReason))) { errors.push('Invalid named-check rule or unexplained skip allowance'); continue }
      if (names.has(rule.name)) errors.push('Duplicate required check name')
      names.add(rule.name)
    }
  }
  if (!Array.isArray(checks) || !checks.length) errors.push('No check runs supplied')
  else if (checks.some(check => !object(check) || !text(check.name) || check.head_sha !== head || !text(check.status) || !object(check.app) || !text(check.app.slug))) errors.push('Malformed or wrong-head check metadata')
  if (errors.length) return { ready: false, errors }
  for (const [index, rule] of policy.checks.entries()) {
    const found = checks.filter(check => check.name === rule.name && check.app.slug === rule.app)
    if (!found.length) errors.push(`Required check ${index + 1} is missing from its expected publisher`)
    else if (found.some(check => check.status !== 'completed' || !rule.conclusions.includes(check.conclusion))) errors.push(`Required check ${index + 1} has not completed with an allowed result`)
  }
  for (const check of checks) {
    const rule = policy.checks.find(rule => rule.name === check.name && rule.app === check.app.slug)
    if (check.status !== 'completed' || !(rule?.conclusions ?? ['success']).includes(check.conclusion)) errors.push('A pending, failing or unapproved skipped/neutral check remains')
  }
  return { ready: errors.length === 0, errors }
}
async function readJSON(path) {
  try {
    const stat = await lstat(path)
    if (!stat.isFile() || stat.size > 4 * 1024 * 1024) throw new Error('Invalid file')
    const bytes = await readFile(path)
    if (bytes.length > 4 * 1024 * 1024) throw new Error('File grew')
    return JSON.parse(bytes)
  } catch { throw new Error('Missing, linked, oversized or malformed merge-readiness input') }
}
export async function main(args = process.argv.slice(2)) {
  if (args.length !== 4) throw new Error('Usage: merge-readiness.mjs <observed-head> <review.json> <policy.json> <checks.json>')
  const [head, reviewPath, policyPath, checksPath] = args
  const review = await readJSON(reviewPath), policy = await readJSON(policyPath), pages = await readJSON(checksPath)
  // gh api --paginate --slurp returns every REST page. Accept a plain array of
  // check runs too, for isolated local tests and already-normalized snapshots.
  const checks = Array.isArray(pages) && pages.length && pages.every(page => object(page) && Array.isArray(page.check_runs)) ? pages.flatMap(page => page.check_runs) : pages
  const result = verifyMerge({ head, review, policy, checks })
  console.log(JSON.stringify(result, null, 2))
  if (!result.ready) process.exitCode = 1
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1 })
