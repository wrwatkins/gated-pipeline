import { execFileSync } from 'node:child_process'

const sha = value => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value)
const short = value => String(value).slice(0, 12)
// Paths that never count as production code, whatever the stack: documentation,
// the framework's own files, assistant adapters and CI configuration.
const NON_PRODUCTION = ['docs/', '.gated-pipeline/', '.claude/', '.agents/', '.codex/', '.github/']
const NON_PRODUCTION_FILES = new Set(['pipeline.config.json', '.gated-pipeline.json', 'STACK.md', 'AGENTS.md', 'CLAUDE.md'])
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
  const lines = text.split('\n')
  return [lines.filter(line => ASSERTION.test(line)).length, lines.filter(line => SKIP.test(line)).length]
}

/**
 * Inspect committed history for test-first ordering and red-test integrity.
 * Reads Git objects only; never runs project commands or contacts a model.
 * `tests` are declared test paths (prefix ending in `/`, exact path, or a
 * `*` glob); every path a receipt names is a test path as well. Anything
 * else outside documentation, framework and CI files is production code.
 */
export function inspectTestFirst(directory, { base, head, tests = [], receipts = [] } = {}) {
  if (!sha(base) || !sha(head) || base === head) throw new Error('Supply distinct full base and head SHAs')
  const git = args => {
    try {
      return execFileSync('git', ['--no-replace-objects', ...args], { cwd: directory, encoding: 'utf8',
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, timeout: 10000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch { throw new Error('Cannot inspect branch history; verify Git objects and that base is an ancestor of head') }
  }
  directory = git(['rev-parse', '--show-toplevel']).trimEnd()
  git(['merge-base', '--is-ancestor', base, head])
  const show = (commit, path) => { try { return git(['show', `${commit}:${path}`]) } catch { return null } }
  const receiptTests = new Set(receipts.flatMap(r => Array.isArray(r.tests) ? r.tests : []))
  const declared = matcher(tests)
  const isTest = path => receiptTests.has(path) || declared(path)
  const isProduction = path => !isTest(path) && !path.endsWith('.md') && !NON_PRODUCTION_FILES.has(path) && !NON_PRODUCTION.some(prefix => path.startsWith(prefix))
  const commits = git(['log', '--reverse', '--format=%x00%H', '--name-only', `${base}..${head}`])
    .split('\x00').filter(chunk => chunk.trim()).map(chunk => {
      const lines = chunk.split('\n').filter(line => line.trim())
      return { sha: lines[0], paths: lines.slice(1) }
    })
  const errors = []
  let firstRed = null, firstRedIndex = -1, firstProduction = null, firstProductionIndex = -1
  commits.forEach((commit, index) => {
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
    const touched = new Set(commits[index].paths)
    if (firstProductionIndex >= 0 && index > firstProductionIndex) errors.push(`red receipt ${short(receipt.commit)} was committed after the first production commit ${short(firstProduction)}`)
    for (const path of Array.isArray(receipt.tests) ? receipt.tests : []) {
      if (!touched.has(path)) { errors.push(`${path} was not touched by red receipt commit ${short(receipt.commit)}`); continue }
      const original = show(receipt.commit, path)
      const current = show(head, path)
      if (original === null) continue
      if (current === null) { errors.push(`${path} was added red in ${short(receipt.commit)} and deleted before the head`); continue }
      const [wasAsserts, wasSkips] = profile(original), [nowAsserts, nowSkips] = profile(current)
      if (nowAsserts < wasAsserts) errors.push(`${path} lost ${wasAsserts - nowAsserts} assertion(s) after its red commit ${short(receipt.commit)}`)
      if (nowSkips > wasSkips) errors.push(`${path} gained ${nowSkips - wasSkips} skip marker(s) after its red commit ${short(receipt.commit)}`)
    }
  }
  return { baseSha: base, headSha: head, commits: commits.length, firstRed, firstProduction, tests, receipts: receipts.length, ok: errors.length === 0, errors }
}
