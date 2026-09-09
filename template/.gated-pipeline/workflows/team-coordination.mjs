import { execFileSync } from 'node:child_process'
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const string = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 240 && !/[\x00-\x1f\x7f]/.test(value)
const fields = ['task', 'owner', 'tool', 'runId', 'paths', 'resources']
function validateRequest(value) {
  if (!value || typeof value !== 'object' || Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key)) || !['task', 'owner', 'tool', 'runId'].every(key => string(value[key])) || !Array.isArray(value.paths) || !Array.isArray(value.resources) || value.paths.length + value.resources.length > 100) throw new Error('Invalid team claim')
  for (const path of value.paths) {
    if (!string(path) || /[\\*?\[\]{}]/.test(path) || path.startsWith('/') || path.replace(/\/$/, '').split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid claim path; use relative files or directory prefixes')
  }
  for (const resource of value.resources) if (!string(resource)) throw new Error('Invalid shared resource')
  if (new Set(value.paths).size !== value.paths.length || new Set(value.resources).size !== value.resources.length) throw new Error('Invalid duplicate claim scope')
}
function location(root) {
  try {
    const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
    return { directory: resolve(root, git(['rev-parse', '--git-common-dir']), 'gated-pipeline-team'), worktree: git(['rev-parse', '--show-toplevel']) }
  } catch { throw new Error('Team coordination requires a Git checkout') }
}
async function regular(path, directory = false) {
  try { const stat = await lstat(path); if (stat.isSymbolicLink() || !(directory ? stat.isDirectory() : stat.isFile())) throw new Error('Invalid or linked coordination state'); return stat }
  catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
async function state(directory) {
  await regular(directory, true)
  const path = join(directory, 'claims.json'), stat = await regular(path)
  if (!stat) return { schemaVersion: 1, claims: [] }
  if (stat.size > 1024 * 1024) throw new Error('Invalid oversized coordination state')
  let result
  try { const bytes = await readFile(path); if (bytes.length > 1024 * 1024) throw new Error(); result = JSON.parse(bytes) } catch { throw new Error('Invalid coordination JSON') }
  if (!result || result.schemaVersion !== 1 || Object.keys(result).length !== 2 || !Array.isArray(result.claims)) throw new Error('Invalid coordination state')
  const tasks = new Set()
  for (const claim of result.claims) {
    if (!claim || Object.keys(claim).length !== fields.length + 3 || !string(claim.worktree) || !string(claim.branch) || !Number.isFinite(Date.parse(claim.updatedAt))) throw new Error('Invalid stored team claim')
    validateRequest(Object.fromEntries(fields.map(key => [key, claim[key]])))
    if (tasks.has(claim.task)) throw new Error('Invalid duplicate stored task')
    tasks.add(claim.task)
  }
  return result
}
export async function teamStatus(root = process.cwd()) {
  const { directory, worktree } = location(root)
  return { ...(await state(directory)), directory, worktree, note: 'Claims are advisory and shared by linked worktrees only. Unclaimed worktrees may still be active; old timestamps do not grant takeover permission.' }
}
async function mutate(root, change) {
  const { directory, worktree } = location(root)
  await regular(directory, true)
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const lock = join(directory, 'lock')
  try { await mkdir(lock, { mode: 0o700 }) } catch (error) { if (error.code === 'EEXIST') throw new Error('Team coordination lock is busy; inspect its owner before retrying or recovering a stale lock'); throw error }
  const temporary = join(directory, `claims-${randomUUID()}.tmp`)
  try {
    await writeFile(join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, worktree, startedAt: new Date().toISOString() }) + '\n', { flag: 'wx', mode: 0o600 })
    const record = await state(directory)
    const updated = await change(record, worktree)
    const serialized = JSON.stringify(updated, null, 2) + '\n'
    if (Buffer.byteLength(serialized) > 1024 * 1024) throw new Error('Coordination state exceeds size limit; resolve completed claims')
    await writeFile(temporary, serialized, { flag: 'wx', mode: 0o600 })
    await rename(temporary, join(directory, 'claims.json'))
    return updated
  } finally {
    await rm(temporary, { force: true })
    await rm(lock, { recursive: true })
  }
}
const overlaps = (a, b) => { a = a.replace(/\/$/, ''); b = b.replace(/\/$/, ''); return a === b || a.startsWith(b + '/') || b.startsWith(a + '/') }
export async function teamClaim(root, request) {
  validateRequest(request)
  return mutate(root, (record, worktree) => {
    const existing = record.claims.find(claim => claim.task === request.task)
    if (existing && (existing.owner !== request.owner || existing.runId !== request.runId || existing.tool !== request.tool || existing.worktree !== worktree)) throw new Error('Task ownership conflict')
    for (const other of record.claims.filter(claim => claim.task !== request.task)) {
      if (request.paths.some(path => other.paths.some(claimed => overlaps(path, claimed))) || request.resources.some(resource => other.resources.includes(resource))) throw new Error('Task path or shared-resource conflict; inspect team status and coordinate the handoff')
    }
    let branch
    try { branch = execFileSync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() } catch { throw new Error('Claim work on a named branch, not a detached checkout') }
    const claim = { ...request, worktree, branch, updatedAt: new Date().toISOString() }
    return { schemaVersion: 1, claims: [...record.claims.filter(claim => claim.task !== request.task), claim] }
  })
}
export async function teamRelease(root, task, owner, runId) {
  if (![task, owner, runId].every(string)) throw new Error('Invalid release identity')
  return mutate(root, (record, worktree) => {
    const current = record.claims.find(claim => claim.task === task)
    if (!current || current.owner !== owner || current.runId !== runId || current.worktree !== worktree) throw new Error('Only the recorded owner/run/worktree can release this claim')
    return { schemaVersion: 1, claims: record.claims.filter(claim => claim.task !== task) }
  })
}
export async function main(args = process.argv.slice(2)) {
  let result
  if (args.length === 1 && args[0] === 'status') result = await teamStatus()
  else if (args.length === 2 && args[0] === 'claim') {
    let request
    try { const stat = await regular(args[1]); if (!stat || stat.size > 65536) throw new Error(); const bytes = await readFile(args[1]); if (bytes.length > 65536) throw new Error(); request = JSON.parse(bytes) } catch { throw new Error('Invalid claim JSON file') }
    result = await teamClaim(process.cwd(), request)
  } else if (args.length === 4 && args[0] === 'release') result = await teamRelease(process.cwd(), ...args.slice(1))
  else throw new Error('Usage: team-coordination.mjs status | claim <claim.json> | release <task> <owner> <runId>')
  console.log(JSON.stringify(result, null, 2))
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1 })
