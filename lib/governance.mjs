import { lstat, readFile } from 'node:fs/promises'
import { safePath, hash } from './files.mjs'
import { validate } from './schema.mjs'

// Fixed diagnostics intentionally exclude input values, field names and native
// JSON parser excerpts: these files can accidentally contain private payloads.
async function contents(root, path, limit = 1024 * 1024) {
  if (typeof path !== 'string' || /[\x00-\x1f\x7f\\]/.test(path) || path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Unsafe governance path')
  try {
    const target = await safePath(root, path), stat = await lstat(target)
    if (!stat.isFile() || stat.size > limit) throw new Error('Invalid file')
    const bytes = await readFile(target)
    if (bytes.length > limit) throw new Error('File grew beyond limit')
    return bytes
  } catch { throw new Error('Governance file missing, linked, unreadable or over size limit') }
}
function parse(text, label) {
  try { return JSON.parse(text) } catch { throw new Error(`Invalid ${label} JSON`) }
}
const schemas = new Map()
async function checked(value, name) {
  if (!schemas.has(name)) schemas.set(name, readFile(new URL(`../template/.gated-pipeline/schemas/${name}.schema.json`, import.meta.url), 'utf8').then(JSON.parse))
  const schema = await schemas.get(name)
  if (validate(value, schema).length) throw new Error(`Invalid ${name} shape; see its shipped schema`)
  return value
}
async function document(root, path, name) {
  return checked(parse(await contents(root, path), name), name)
}
async function manifest(root) { return document(root, 'ai-repository.json', 'ai-repository') }

export async function governance(root) {
  const result = { valid: false, areaCount: 0, promptVersions: 0, auditEvents: 0, errors: [], warnings: [] }
  try {
    const config = await manifest(root)
    for (const path of Object.values(config.areas)) await contents(root, path)
    result.areaCount = Object.keys(config.areas).length
    const unassigned = Object.values(config.accountableOwners).filter(owner => owner === null).length
    if (unassigned) result.warnings.push(`${unassigned} accountable owner assignments are unknown; assign real human owners before adoption`)
    const registry = await document(root, config.promptRegistry, 'prompts'), versions = new Set(), paths = new Set()
    for (const prompt of registry.prompts) {
      const key = `${prompt.id}@${prompt.version}`
      if (versions.has(key)) throw new Error('Duplicate prompt id/version')
      if (prompt.path !== `prompts/${prompt.id}/${prompt.version}/SKILL.md`) throw new Error('Prompt path must be prompts/<id>/<version>/SKILL.md')
      if (paths.has(prompt.path)) throw new Error('Prompt versions cannot share a path')
      versions.add(key)
      paths.add(prompt.path)
      if (hash(await contents(root, prompt.path)) !== prompt.sha256) throw new Error('Prompt content differs from registered fingerprint')
    }
    result.promptVersions = versions.size
    const events = (await contents(root, config.auditLog, 4 * 1024 * 1024)).toString('utf8').split('\n').filter(line => line.trim()), ids = new Set()
    for (const line of events) {
      const event = await checked(parse(line, 'audit-event'), 'audit-event')
      const time = new Date(event.timestamp)
      if (!Number.isFinite(time.getTime()) || time.toISOString().replace('.000Z', 'Z') !== event.timestamp.replace('.000Z', 'Z')) throw new Error('Invalid audit timestamp')
      if (ids.has(event.id)) throw new Error('Duplicate audit event id')
      if (event.actor.kind === 'human' && (event.actor.model !== null || event.actor.tool !== 'none')) throw new Error('Human audit actors require tool none and model null')
      ids.add(event.id)
    }
    result.auditEvents = ids.size
    const policy = await document(root, config.costPolicy, 'cost-policy')
    if (Object.values(policy.models).some(model => model.model === null)) result.warnings.push('Some model routes use current harness defaults; model suitability is unverified')
    if (Object.entries(policy.budgets).filter(([key]) => key !== 'peakAgents').every(([, value]) => value === null)) result.warnings.push('Token and monetary budgets are unconfigured')
    result.warnings.push('Structure and declared records do not prove adoption, compliance, actor identity or measured savings')
    result.valid = true
  } catch (error) { result.errors.push(error.message) }
  return result
}

export async function costCheck(root, usagePath) {
  const config = await manifest(root), policy = await document(root, config.costPolicy, 'cost-policy')
  const usage = await document(root, usagePath, 'usage')
  if (usage.cachedInputTokens !== null && (usage.inputTokens === null || usage.cachedInputTokens > usage.inputTokens)) throw new Error('Cached input requires a measured input total at least as large')
  const total = usage.inputTokens !== null && usage.outputTokens !== null ? usage.inputTokens + usage.outputTokens : null
  if (total !== null && !Number.isSafeInteger(total)) throw new Error('Combined token count exceeds safe integer range')
  const measured = { ...usage, totalTokens: total }, checks = []
  for (const [metric, limit] of Object.entries(policy.budgets)) {
    if (limit === null) continue
    const actual = measured[metric]
    checks.push({ metric, limit, actual, status: actual === null ? 'unknown' : actual > limit ? 'exceeded' : 'within_budget' })
  }
  const status = checks.some(c => c.status === 'exceeded') ? 'exceeded' : !checks.length || checks.some(c => c.status === 'unknown') ? 'unknown' : 'within_budget'
  return { status, checks, unconfigured: Object.keys(policy.budgets).filter(key => policy.budgets[key] === null), note: 'Checks declared measurements against configured limits only; this command does not meter or cap a running model' }
}

// Reuse the same bounded, symlink-refusing reader and redacted schema errors.
export { document as readGovernanceDocument }
