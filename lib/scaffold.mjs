import { readFile, lstat, unlink } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { atomicWrite, hash, json, matches, read, render, safePath, safeRelative, walk } from './files.mjs'
import { validate } from './schema.mjs'
export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
export const TEMPLATE = join(ROOT, 'template')
export const HOOK_COMMAND = 'node "$CLAUDE_PROJECT_DIR/.gated-pipeline/hooks/block-push-to-main.mjs"'
export const defaults = { PROJECT_SLUG: 'my-app', PROJECT_NAME: 'My App', PROJECT_DOMAIN: '', AI_COAUTHOR: '' }
const load = async path => JSON.parse(await readFile(path, 'utf8'))
export const projectSchema = () => load(join(TEMPLATE, '.gated-pipeline/schemas/project.schema.json'))

export function validateTokens(tokens) {
  for (const key of Object.keys(defaults)) if (typeof tokens[key] !== 'string' || /[\r\n\0]/.test(tokens[key])) throw new Error(`Invalid token ${key}`)
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(tokens.PROJECT_SLUG)) throw new Error('Slug must contain only letters, numbers, dots, underscores and hyphens')
  if (!tokens.PROJECT_NAME.trim()) throw new Error('Project name must not be blank')
}
export async function readProject(dest) {
  const text = await read(await safePath(dest, 'pipeline.config.json'))
  if (text === null) throw new Error('Missing pipeline.config.json; run install or sync first')
  const config = JSON.parse(text)
  const errors = validate(config, await projectSchema())
  for (const name of config.requiredChecks || []) if (!Object.hasOwn(config.commands || {}, name)) errors.push(`Unknown required command: ${name}`)
  for (const [name, path] of Object.entries(config.documents || {})) if (path !== null && !safeRelative(path)) errors.push(`Unsafe document path: ${name}`)
  for (const branch of config.protectedBranches || []) if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch) || branch.includes('..')) errors.push(`Invalid protected branch: ${branch}`)
  if (errors.length) throw new Error(`Invalid pipeline.config.json:\n${errors.join('\n')}`)
  return config
}
export function mergeBlock(previous, block, label) {
  if (previous === null) return block
  const start = '<!-- gated-pipeline:start -->', end = '<!-- gated-pipeline:end -->'
  const starts = previous.split(start).length - 1, ends = previous.split(end).length - 1
  if (!starts && !ends) return previous.trimEnd() + '\n\n' + block
  if (starts !== 1 || ends !== 1 || previous.indexOf(end) < previous.indexOf(start)) throw new Error(`Malformed managed block in ${label}`)
  const before = previous.slice(0, previous.indexOf(start)), after = previous.slice(previous.indexOf(end) + end.length)
  return before + block.trimEnd() + after
}
export function mergeSettings(previous) {
  const settings = previous === null ? {} : JSON.parse(previous)
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Claude settings must be an object')
  settings.hooks ??= {}
  if (typeof settings.hooks !== 'object' || Array.isArray(settings.hooks)) throw new Error('Invalid Claude hooks configuration')
  settings.hooks.PreToolUse ??= []
  if (!Array.isArray(settings.hooks.PreToolUse)) throw new Error('Claude PreToolUse must be an array')
  const registered = settings.hooks.PreToolUse.some(group => group.matcher === 'Bash' && Array.isArray(group.hooks) && group.hooks.some(hook => hook.type === 'command' && hook.command === HOOK_COMMAND))
  if (!registered) settings.hooks.PreToolUse.push({ matcher: 'Bash', hooks: [{ type: 'command', command: HOOK_COMMAND }] })
  return json(settings)
}
export async function scaffold(dest, { command, tokens = defaults, adapters, dry = false } = {}) {
  const pkg = await load(join(ROOT, 'package.json')), manifest = await load(join(ROOT, 'framework-manifest.json'))
  const cfgPath = await safePath(dest, '.gated-pipeline.json'), previousConfig = await read(cfgPath)
  const cfg = previousConfig === null ? { schemaVersion: 1, version: pkg.version, tokens, protect: [], files: {}, adapters: adapters || ['codex', 'claude'] } : JSON.parse(previousConfig)
  if (typeof cfg.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(cfg.version)) throw new Error('Invalid installed version')
  validateTokens(cfg.tokens || {})
  if (!Array.isArray(cfg.protect) || cfg.protect.some(path => !safeRelative(path))) throw new Error('Config protect must contain safe relative paths')
  if (cfg.files != null && (!cfg.files || typeof cfg.files !== 'object' || Array.isArray(cfg.files))) throw new Error('Invalid installed-file manifest')
  cfg.files ??= {}
  for (const [path, entry] of Object.entries(cfg.files)) if (!safeRelative(path) || !entry || !/^[a-f0-9]{64}$/.test(entry.hash)) throw new Error(`Invalid installed-file entry: ${path}`)
  cfg.adapters ??= ['codex', 'claude']
  if (!Array.isArray(cfg.adapters) || cfg.adapters.some(a => !['codex', 'claude'].includes(a))) throw new Error('Invalid configured adapters')
  if (command === 'install' && previousConfig !== null) return { messages: ['Already installed; configuration and files preserved. Use sync for updates.'], changes: 0 }
  if (command === 'sync' && previousConfig === null) throw new Error('No installation found; run install first')
  if (command === 'sync' && adapters) throw new Error('Edit adapters in .gated-pipeline.json before syncing')
  const protectedPath = path => matches(path, cfg.protect)
  const enabled = path => !((path.startsWith('.claude/') || path === 'CLAUDE.md') && !cfg.adapters.includes('claude')) && !(path.startsWith('.agents/') && !cfg.adapters.includes('codex'))
  const desired = new Map(), plan = [], messages = [], conflicts = []
  const legacyText = await read(join(ROOT, 'migrations', `${cfg.version}.json`))
  const legacy = legacyText ? JSON.parse(legacyText) : {}
  const baseline = path => cfg.files[path]?.hash || (legacy[path] ? hash(legacy[path].text.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => cfg.tokens[key] ?? m)) : null)
  for (const src of await walk(TEMPLATE)) {
    const path = relative(TEMPLATE, src).split('\\').join('/')
    if (!enabled(path)) continue
    desired.set(path, { text: render(await readFile(src, 'utf8'), cfg.tokens, path.endsWith('.json')), mode: src.endsWith('.mjs') && path.includes('/hooks/') ? 0o755 : 0o644, managed: matches(path, manifest.framework) })
  }
  const configPath = await safePath(dest, 'pipeline.config.json'), existingProject = await read(configPath)
  const project = existingProject === null ? JSON.parse(desired.get('pipeline.config.json').text) : await readProject(dest)
  if (cfg.adapters.includes('claude')) for (const [key, paths] of Object.entries(project.paths)) {
    if (paths.length) desired.set(`.claude/rules/gated-${key}.md`, { text: `---\npaths: ${JSON.stringify(paths)}\n---\n\nRead .gated-pipeline/guides/${key}.md and STACK.md for this change.\n`, mode: 0o644, managed: true })
  }
  const registry = JSON.parse(desired.get('.gated-pipeline/REGISTRY.json').text)
  for (const role of ['analyst', ...registry.pipeline.map(g => g.role), ...registry.cadence.map(g => g.role)]) {
    for (const name of ['inbox', 'memory']) {
      const path = `.gated-pipeline/state/${role}/${name}.md`
      const old = legacyText ? await read(await safePath(dest, `.claude/pipeline/agents/${role}/${name}.md`)) : null
      desired.set(path, { text: old ?? `# ${role} ${name}\n\n${name === 'inbox' ? 'Append handoffs; resolve messages without deleting history.' : 'Working state and evidence links; durable rules belong in project documents.'}\n`, mode: 0o644, managed: false })
    }
  }
  const schedule = async (path, text, requestedMode) => {
    const target = await safePath(dest, path), previous = await read(target)
    let previousMode = null
    if (previous !== null) previousMode = (await lstat(target)).mode & 0o777
    const mode = requestedMode ?? previousMode ?? 0o644
    if (text !== previous || (text !== null && mode !== previousMode)) plan.push({ path, target, text, previous, previousMode, mode })
  }
  for (const [path, item] of desired) {
    const previous = await read(await safePath(dest, path))
    if (protectedPath(path)) { messages.push(`protected ${path}`); continue }
    if (manifest.merged.includes(path)) { await schedule(path, mergeBlock(previous, item.text, path)); continue }
    if (!item.managed && previous !== null) continue
    if (item.managed && previous !== null && previous !== item.text && hash(previous) !== baseline(path)) {
      if (command === 'install') { messages.push(`preserved existing ${path}`); continue }
      conflicts.push(path); continue
    }
    await schedule(path, item.text, item.mode)
    if (item.managed) cfg.files[path] = { hash: hash(item.text), mode: item.mode }
  }
  // Old framework copies must not keep auto-loading after procedures move.
  const oldPaths = new Set([...Object.keys(cfg.files), ...Object.keys(legacy).filter(path => path.startsWith('.claude/rules/') || path.startsWith('.claude/hooks/') || path.startsWith('.claude/workflows/') || path === '.claude/pipeline/REGISTRY.json')])
  for (const path of oldPaths) {
    if (desired.has(path) || protectedPath(path)) continue
    const previous = await read(await safePath(dest, path))
    if (previous !== null && hash(previous) !== baseline(path)) { conflicts.push(path); continue }
    if (previous !== null) await schedule(path, null)
    delete cfg.files[path]
  }
  if (cfg.adapters.includes('claude') && !protectedPath('.claude/settings.json')) {
    const path = '.claude/settings.json'
    await schedule(path, mergeSettings(await read(await safePath(dest, path))))
  }
  if (!protectedPath('.gitignore')) {
    const previous = await read(await safePath(dest, '.gitignore')) || ''
    const line = '/.gated-pipeline/evidence/'
    if (!previous.split(/\r?\n/).includes(line)) await schedule('.gitignore', previous.trimEnd() + (previous ? '\n' : '') + line + '\n')
  }
  if (conflicts.length) throw new Error(`Sync conflicts; no files changed. Preserve/move these edits or add their paths to protect:\n${[...new Set(conflicts)].join('\n')}`)
  cfg.schemaVersion = 1; cfg.version = pkg.version
  await schedule('.gated-pipeline.json', json(cfg))
  // Recheck the entire plan before the first mutation to catch concurrent edits.
  for (const change of plan) if (await read(await safePath(dest, change.path)) !== change.previous) throw new Error(`Concurrent edit: ${change.path}; no files changed`)
  if (!dry) {
    const applied = []
    try {
      for (const change of plan) {
        await safePath(dest, change.path)
        if (change.text === null) await unlink(change.target)
        else await atomicWrite(change.target, change.text, change.mode)
        applied.push(change)
      }
    } catch (error) {
      for (const change of applied.reverse()) {
        if (change.previous === null) await unlink(change.target)
        else await atomicWrite(change.target, change.previous, change.previousMode)
      }
      throw error
    }
  }
  messages.push(...plan.map(change => `${dry ? 'would ' : ''}${change.text === null ? 'remove' : change.previous === null ? 'add' : 'update'} ${change.path}`))
  return { messages, changes: plan.length }
}
