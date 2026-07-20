#!/usr/bin/env node
// gated-pipeline CLI — `install` (first-time scaffold) and `sync` (update the
// framework files in place, preserving your project-owned files). Zero deps.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout, argv, exit } from 'node:process'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = join(HERE, '..')
const TEMPLATE = join(PKG_ROOT, 'template')
const PKG = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'))
const MANIFEST = JSON.parse(readFileSync(join(PKG_ROOT, 'framework-manifest.json'), 'utf8'))
const CONFIG_NAME = '.gated-pipeline.json'

const TOKENS = [
  { key: 'PROJECT_SLUG', flag: 'slug', q: 'Project slug (repo/package name)', def: 'my-app' },
  { key: 'PROJECT_NAME', flag: 'name', q: 'Project display name', def: 'My App' },
  { key: 'PROJECT_DOMAIN', flag: 'domain', q: 'Public domain (blank if none)', def: '' },
  { key: 'AI_COAUTHOR', flag: 'coauthor', q: 'Commit co-author trailer', def: 'Claude <noreply@anthropic.com>' },
]

// ---- args ----
const rest = argv.slice(2)
const flags = new Map()
for (const a of rest) { const m = a.match(/^--([a-z-]+)(?:=(.*))?$/); if (m) flags.set(m[1], m[2] ?? true) }
const positional = rest.filter((a) => !a.startsWith('-'))
const CMD = ['install', 'sync'].includes(positional[0]) ? positional[0] : 'install'
const DEST = positional.find((p) => p !== CMD) || process.cwd()
const DRY = flags.has('dry-run')
const YES = flags.has('yes')

// ---- helpers ----
async function walk(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p))); else out.push(p)
  }
  return out
}
const apply = (t, v) => t.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in v ? v[k] : m))
const matches = (rel, list) => list.some((p) => rel === p || (p.endsWith('/') && rel.startsWith(p)))
function isFramework(rel, protect) {
  return matches(rel, MANIFEST.framework) && !matches(rel, protect)
}

async function gatherTokens() {
  const vals = {}
  const missing = TOKENS.filter((t) => !flags.has(t.flag))
  for (const t of TOKENS) if (flags.has(t.flag)) vals[t.key] = String(flags.get(t.flag))
  if (missing.length && !YES) {
    const rl = createInterface({ input: stdin, output: stdout })
    for (const t of missing) { const a = await rl.question(`  ${t.q}${t.def ? ` [${t.def}]` : ''}: `); vals[t.key] = a.trim() || t.def }
    await rl.close()
  } else for (const t of missing) vals[t.key] = t.def
  return vals
}

async function main() {
  if (!existsSync(TEMPLATE)) { console.error('  template/ not found. Aborting.'); exit(1) }
  const cfgPath = join(DEST, CONFIG_NAME)
  const files = await walk(TEMPLATE)

  if (CMD === 'install') {
    console.log(`\n  gated-pipeline install → ${DEST}\n`)
    const vals = await gatherTokens()
    let wrote = 0, skipped = 0
    for (const src of files) {
      const rel = relative(TEMPLATE, src), dst = join(DEST, rel)
      if (existsSync(dst)) { skipped++; continue }
      if (!DRY) { await mkdir(dirname(dst), { recursive: true }); await writeFile(dst, apply(await readFile(src, 'utf8'), vals)) }
      wrote++
    }
    if (!DRY) await writeFile(cfgPath, JSON.stringify({ version: PKG.version, tokens: vals, protect: [] }, null, 2) + '\n')
    console.log(`  ${DRY ? 'would write' : 'wrote'} ${wrote}, skipped ${skipped} (already present).`)
    console.log(`  Wrote ${CONFIG_NAME}. Adapt STACK.md, then run your first unit through the gates.`)
    console.log(`  Update later with: gated-pipeline sync\n`)
    return
  }

  // ---- sync ----
  if (!existsSync(cfgPath)) { console.error(`  ${CONFIG_NAME} not found in ${DEST} — run \`install\` first.`); exit(1) }
  const cfg = JSON.parse(await readFile(cfgPath, 'utf8'))
  const protect = cfg.protect || []
  console.log(`\n  gated-pipeline sync → ${DEST}  (from v${PKG.version}, was v${cfg.version})`)
  console.log(`  framework files are updated; project-owned + protected files are left alone.\n`)
  let updated = 0, same = 0, added = 0, kept = 0
  const changed = []
  for (const src of files) {
    const rel = relative(TEMPLATE, src), dst = join(DEST, rel)
    const out = apply(await readFile(src, 'utf8'), cfg.tokens || {})
    if (isFramework(rel, protect)) {
      const prev = existsSync(dst) ? await readFile(dst, 'utf8') : null
      if (prev === out) { same++; continue }
      if (!DRY) { await mkdir(dirname(dst), { recursive: true }); await writeFile(dst, out) }
      prev == null ? added++ : updated++
      changed.push(`${prev == null ? 'new ' : 'upd '} ${rel}`)
    } else {
      if (existsSync(dst)) { kept++; continue }              // project file, present → never touch
      if (!DRY) { await mkdir(dirname(dst), { recursive: true }); await writeFile(dst, out) }
      added++; changed.push(`new  ${rel} (project-once)`)
    }
  }
  if (!DRY && cfg.version !== PKG.version) { cfg.version = PKG.version; await writeFile(cfgPath, JSON.stringify(cfg, null, 2) + '\n') }
  for (const c of changed) console.log('   ' + c)
  console.log(`\n  ${DRY ? '[dry-run] ' : ''}framework: ${updated} updated, ${added} added, ${same} unchanged · project files kept: ${kept}`)
  console.log('  Review the diff (git diff) and commit.\n')
}

main().catch((e) => { console.error(e); exit(1) })
