import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const sha = value => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value)
const safe = value => typeof value === 'string' && value.length > 0 &&
  !/[\\\x00-\x1f\x7f]/.test(value) && !value.startsWith('/') &&
  !value.replace(/\/$/, '').split('/').some(p => !p || p === '.' || p === '..')
const sensitive = /(?:^|[/_.-])(?:agents?|claude|readme_ai|security|audits?|releases?|evidence|knowledge|traces?|process|pipeline|policy|policies|governance|standards|prompts?|skills?|rules?|gates?|requirements?|design|decisions?|adr|tds|tasks|stack|contributing|code.of.conduct)(?:[/_.-]|$)/i

/** Read committed Git objects only. Path eligibility is not semantic approval. */
export function inspectDocsDiff(directory, { base, head } = {}) {
  if (!sha(base) || !sha(head) || base === head) throw new Error('Supply distinct full trusted base and head SHAs')
  const git = args => {
    try {
      return execFileSync('git', args, { cwd: directory, encoding: 'utf8',
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, timeout: 10000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch { throw new Error('Cannot inspect committed docs scope; verify Git objects, ancestry and policy availability') }
  }
  directory = git(['rev-parse', '--show-toplevel']).trimEnd()
  git(['merge-base', '--is-ancestor', base, head])
  const policyPath = 'docs-policy.json'
  if (!git(['ls-tree', base, '--', policyPath]).startsWith('100644 blob ')) throw new Error('Base must contain a regular docs-policy.json')
  let policy
  try { policy = JSON.parse(git(['show', `${base}:${policyPath}`])) }
  catch { throw new Error('Cannot read the trusted base docs policy') }
  if (!policy || Object.keys(policy).sort().join(',') !== 'paths,schemaVersion' || policy.schemaVersion !== 1 ||
      !Array.isArray(policy.paths) || !policy.paths.length || policy.paths.some(p => !safe(p)) || new Set(policy.paths).size !== policy.paths.length) {
    throw new Error('Docs policy needs schemaVersion1 and nonempty unique safe paths; empty paths disables docs-lite')
  }
  const raw = git(['diff', '--ignore-submodules=none', '--no-relative', '--no-ext-diff', '--no-textconv', '--no-renames', '--raw', '-z', base, head, '--']).split('\0')
  const paths = [], reasons = []
  for (let i = 0; i < raw.length - 1; i += 2) {
    const match = raw[i].match(/^:(\d{6}) (\d{6}) [a-f0-9]+ [a-f0-9]+ ([AMDT])$/)
    const path = raw[i + 1]
    if (!match || !safe(path)) throw new Error('Unsupported or unsafe complete-diff entry')
    const [, before, after, status] = match
    paths.push({ path, status })
    if (![before, after].every(mode => ['100644', '000000'].includes(mode))) reasons.push(`${path}: non-prose file mode`)
    if (!path.endsWith('.md') || path.split('/').some(p => p.startsWith('.')) || sensitive.test(path)) reasons.push(`${path}: excluded file or policy/evidence path`)
    if (!policy.paths.some(p => p.endsWith('/') ? path.startsWith(p) : path === p)) reasons.push(`${path}: outside base policy`)
    for (const [revision, mode] of [[base, before], [head, after]]) {
      if (mode !== '000000' && git(['show', `${revision}:${path}`]).includes('\0')) reasons.push(`${path}: binary content`)
    }
  }
  if (!paths.length) reasons.push('Empty committed diff')
  let whitespaceClean = true
  try { git(['diff', '--ignore-submodules=none', '--no-relative', '--no-ext-diff', '--no-textconv', '--check', base, head, '--']) }
  catch { whitespaceClean = false; reasons.push('Complete committed diff fails whitespace verification') }
  const diff = git(['diff', '--ignore-submodules=none', '--no-relative', '--no-ext-diff', '--no-textconv', '--no-renames', '--binary', base, head, '--'])
  return { schemaVersion: 1, baseSha: base, headSha: head, paths, whitespaceClean,
    diffSha256: createHash('sha256').update(diff).digest('hex'), eligible: reasons.length === 0, reasons,
    notice: 'Candidate paths only. An independent reviewer must inspect the actual diff and reject changes to behavior, instructions, policy, execution, security or release/audit status. Verify base against the current PR target; this tool does not contact GitHub or authorize a merge.' }
}
