import { execFileSync } from 'node:child_process'

const sha = value => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value)
const short = value => String(value).slice(0, 12)
// Paths that never count as production code, whatever the stack: documentation,
// the framework's own files and assistant adapters. CI workflow definitions are
// production: a workflow line in a red commit changes what runs, so it belongs
// in the production commit, never in the red one.
const NON_PRODUCTION = ['docs/', '.gated-pipeline/', '.claude/', '.agents/', '.codex/']
const NON_PRODUCTION_FILES = new Set(['pipeline.config.json', '.gated-pipeline.json', 'STACK.md', 'AGENTS.md', 'CLAUDE.md'])
export const isNonProductionPath = path => path.endsWith('.md') || NON_PRODUCTION_FILES.has(path) || (NON_PRODUCTION.some(prefix => path.startsWith(prefix))) || (path.startsWith('.github/') && !path.startsWith('.github/workflows/'))
// Stack-neutral heuristics. They count lines, so a test cannot lose an
// assertion or gain a skip marker without the count moving.
const ASSERTION = /\bassert\w*\b|\bexpect\s*[(.]|\bshould\b|\.to(?:Be|Equal|Throw|Match|Contain)\w*\s*\(|\bverify\s*\(/
const SKIP = /\.skip\s*\(|\bskip\s*\(|@skip\b|@unittest\.skip|pytest\.mark\.skip|\bxit\s*\(|\bxtest\s*\(|\bxdescribe\s*\(|\.fixme\s*\(|\.todo\s*\(|@Ignore\b|@Disabled\b|\bt\.Skip\s*\(/

const globToRegExp = pattern => new RegExp('^' + pattern.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*') + '$')
function matcher(patterns) {
  const compiled = patterns.map(p => p.endsWith('/') ? path => path.startsWith(p) : p.includes('*') ? (re => path => re.test(path))(globToRegExp(p)) : path => path === p)
  return path => compiled.some(fn => fn(path))
}
function profile(text) {
  if (text === null) return null
  const lines = text.split('\n')
  return [lines.filter(line => ASSERTION.test(line)).length, lines.filter(line => SKIP.test(line)).length]
}

export function gitReader(directory) {
  const git = args => {
    try {
      return execFileSync('git', ['--no-replace-objects', ...args], { cwd: directory, encoding: 'utf8',
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, timeout: 10000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch { throw new Error('Cannot inspect branch history; verify Git objects and that base is an ancestor of head') }
  }
  const show = (commit, path) => { try { return git(['show', `${commit}:${path}`]) } catch { return null } }
  // First-parent history between two revisions, oldest first. Each entry lists
  // the paths changed against its first parent, so a merge commit reports what
  // the merge brought in rather than every commit of the merged-in side.
  const firstParent = (base, head) => git(['log', '--first-parent', '--reverse', '--format=%x00%H %P', '--name-only', '--diff-merges=first-parent', `${base}..${head}`])
    .split('\x00').filter(chunk => chunk.trim()).map(chunk => {
      const lines = chunk.split('\n').filter(line => line.trim())
      const [commit, ...parents] = lines[0].split(' ')
      return { sha: commit, parents, paths: lines.slice(1) }
    })
  const mergeBase = (a, b) => git(['merge-base', a, b]).trim()
  return { git, show, firstParent, mergeBase }
}

/**
 * Inspect committed history for test-first ordering and red-test integrity.
 * Reads Git objects only; never runs project commands or contacts a model.
 * `tests` are declared test paths (prefix ending in `/`, exact path, or a
 * `*` glob); every path a receipt names is a test path as well. Anything
 * else outside documentation, framework and adapter files is production code.
 *
 * The walk follows first parents, so commits that a merge of the target branch
 * brought in do not count as this branch's own production or test commits.
 * A receipt path may lose assertions or gain skip markers only as far as the
 * merged-in side itself changed that file; anything beyond that is the
 * branch's own weakening and is reported.
 */
export function inspectTestFirst(directory, { base, head, tests = [], receipts = [] } = {}) {
  if (!sha(base) || !sha(head) || base === head) throw new Error('Supply distinct full base and head SHAs')
  const reader = gitReader(directory)
  reader.git(['merge-base', '--is-ancestor', base, head])
  const receiptTests = new Set(receipts.flatMap(r => Array.isArray(r.tests) ? r.tests : []))
  const declared = matcher(tests)
  const isTest = path => receiptTests.has(path) || declared(path)
  const isProduction = path => !isTest(path) && !isNonProductionPath(path)
  const commits = reader.firstParent(base, head)
  const errors = []
  let firstRed = null, firstRedIndex = -1, firstProduction = null, firstProductionIndex = -1
  commits.forEach((commit, index) => {
    if (commit.parents.length > 1) return
    const touchesTests = commit.paths.some(isTest), touchesProduction = commit.paths.some(isProduction)
    if (touchesTests && touchesProduction) {
      if (firstRed === null && firstProduction === null) errors.push(`${short(commit.sha)} commits tests and production code together, so no red phase is provable for it`)
      if (firstProduction === null) { firstProduction = commit.sha; firstProductionIndex = index }
      return
    }
    if (touchesTests && firstRed === null) { firstRed = commit.sha; firstRedIndex = index }
    if (touchesProduction && firstProduction === null) { firstProduction = commit.sha; firstProductionIndex = index }
  })
  if (firstProduction !== null && !errors.length) {
    if (firstRed === null) errors.push(`${short(firstProduction)} adds production code before any test commit on this branch`)
    else if (firstRedIndex > firstProductionIndex) errors.push(`${short(firstProduction)} adds production code before the first test commit ${short(firstRed)}`)
  }
  for (const receipt of receipts) {
    const index = commits.findIndex(commit => commit.sha === receipt.commit)
    if (index < 0) { errors.push(`red receipt commit ${short(receipt.commit)} is not on this branch between base and head`); continue }
    if (commits[index].parents.length > 1) { errors.push(`red receipt commit ${short(receipt.commit)} is a merge commit, not a red commit`); continue }
    const touched = new Set(commits[index].paths)
    if (firstProductionIndex >= 0 && index > firstProductionIndex) errors.push(`red receipt ${short(receipt.commit)} was committed after the first production commit ${short(firstProduction)}`)
    const merges = commits.slice(index + 1).filter(commit => commit.parents.length > 1)
    for (const path of Array.isArray(receipt.tests) ? receipt.tests : []) {
      if (!touched.has(path)) { errors.push(`${path} was not touched by red receipt commit ${short(receipt.commit)}`); continue }
      const original = profile(reader.show(receipt.commit, path))
      if (original === null) continue
      // Credit only what the merged-in side did to this file: the drop between
      // the merge base and the merged tip, for every merge after the receipt.
      let lossAllowed = 0, skipAllowed = 0, deletionAllowed = false
      for (const merge of merges) {
        const [first, ...others] = merge.parents
        for (const other of others) {
          const before = profile(reader.show(reader.mergeBase(first, other), path)), after = profile(reader.show(other, path))
          if (before !== null && after === null) deletionAllowed = true
          if (before !== null && after !== null) { lossAllowed += Math.max(0, before[0] - after[0]); skipAllowed += Math.max(0, after[1] - before[1]) }
        }
      }
      const current = profile(reader.show(head, path))
      if (current === null) { if (!deletionAllowed) errors.push(`${path} was added red in ${short(receipt.commit)} and deleted before the head`); continue }
      const lost = original[0] - current[0] - lossAllowed, gained = current[1] - original[1] - skipAllowed
      if (lost > 0) errors.push(`${path} lost ${lost} assertion(s) after its red commit ${short(receipt.commit)}${lossAllowed ? ` beyond the ${lossAllowed} the merged-in side removed` : ''}`)
      if (gained > 0) errors.push(`${path} gained ${gained} skip marker(s) after its red commit ${short(receipt.commit)}${skipAllowed ? ` beyond the ${skipAllowed} the merged-in side added` : ''}`)
    }
  }
  return { baseSha: base, headSha: head, commits: commits.length, merges: commits.filter(c => c.parents.length > 1).length, firstRed, firstProduction, tests, receipts: receipts.length, ok: errors.length === 0, errors }
}
