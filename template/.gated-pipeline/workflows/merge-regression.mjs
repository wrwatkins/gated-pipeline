import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gitReader, isNonProductionPath } from './test-first.mjs'

const sha = value => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value)
const short = value => String(value).slice(0, 12)
const validPath = value => typeof value === 'string' && value.trim() === value && value.length > 0 && !value.startsWith('/') && !/[\x00-\x1f\x7f\\*?[\]{}]/.test(value) && !value.replace(/\/$/, '').split('/').some(part => !part || part === '.' || part === '..')
const under = (path, prefix) => prefix.endsWith('/') ? path.startsWith(prefix) : path === prefix

/**
 * Decide from Git alone whether the movement from a fully gated head to the
 * current head re-ran only regression activity, so that the planning,
 * authoring and review gates may stay bound to the earlier head.
 *
 * Every first-parent commit between verifiedHead and head must be one of:
 *  - a clean two-parent merge: every path it changes against its first parent
 *    is byte-identical to the merged-in side, so no conflict was hand-resolved
 *    and no edit rode in with the merge;
 *  - a records-only commit touching documentation and framework paths only.
 * The declared unit paths must be byte-identical between the two heads.
 *
 * `kind` is `records-only` when no merge occurred (every gate may stay bound),
 * `merge-regression` when at least one merge occurred (gates 1-5 may stay
 * bound; 6-9 must bind to the head), and `invalid` otherwise. Any doubt is
 * invalid: the inspector never infers eligibility from a declaration.
 */
export function inspectMergeRegression(directory, { verifiedHead, head, unitPaths = [] } = {}) {
  if (!sha(verifiedHead) || !sha(head) || verifiedHead === head) throw new Error('Supply distinct full verifiedHead and head SHAs')
  if (!Array.isArray(unitPaths) || !unitPaths.length || !unitPaths.every(validPath) || new Set(unitPaths).size !== unitPaths.length) throw new Error('Declare the unit paths as unique relative files or directory prefixes ending in /')
  const reader = gitReader(directory)
  const errors = []
  try { reader.git(['merge-base', '--is-ancestor', verifiedHead, head]) } catch { return { verifiedHead, head, kind: 'invalid', merges: 0, recordsOnly: 0, ok: false, errors: [`${short(verifiedHead)} is not an ancestor of ${short(head)}`] } }
  const commits = reader.firstParent(verifiedHead, head)
  let merges = 0, recordsOnly = 0
  for (const commit of commits) {
    if (commit.parents.length > 2) { errors.push(`${short(commit.sha)} is an octopus merge`); continue }
    if (commit.parents.length === 2) {
      merges++
      const [first, other] = commit.parents
      const brought = new Set(reader.git(['diff', '--name-only', '--no-renames', reader.mergeBase(first, other), other]).split('\n').filter(Boolean))
      for (const path of commit.paths) {
        if (!brought.has(path)) { errors.push(`${short(commit.sha)} changes ${path}, which the merged-in side did not change`); continue }
        if (reader.show(commit.sha, path) !== reader.show(other, path)) errors.push(`${short(commit.sha)} resolves ${path} by hand; it differs from the merged-in side`)
      }
      continue
    }
    const production = commit.paths.filter(path => !isNonProductionPath(path))
    if (production.length) errors.push(`${short(commit.sha)} edits ${production[0]} outside a merge`)
    else recordsOnly++
  }
  const changed = reader.git(['diff', '--name-only', '--no-renames', verifiedHead, head, '--', ...unitPaths]).split('\n').filter(Boolean)
  for (const path of changed) if (unitPaths.some(prefix => under(path, prefix))) errors.push(`unit path ${path} changed between ${short(verifiedHead)} and ${short(head)}`)
  const kind = errors.length ? 'invalid' : merges ? 'merge-regression' : 'records-only'
  return { verifiedHead, head, kind, merges, recordsOnly, unitPaths, ok: !errors.length, errors }
}

export async function main(args = process.argv.slice(2)) {
  const flags = new Map()
  for (const arg of args) { const match = arg.match(/^--([a-z-]+)=(.*)$/s); if (!match) throw new Error('Usage: merge-regression.mjs --verified-head=<sha> --head=<sha> --unit-paths=<a,b/> [--dir=project]'); flags.set(match[1], match[2]) }
  const result = inspectMergeRegression(flags.get('dir') || process.cwd(), { verifiedHead: flags.get('verified-head'), head: flags.get('head'), unitPaths: (flags.get('unit-paths') || '').split(',').filter(Boolean) })
  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) process.exitCode = 1
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1 })
