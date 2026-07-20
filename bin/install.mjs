#!/usr/bin/env node
// gated-pipeline installer — scaffolds the pipeline into a target repo and
// substitutes {{PLACEHOLDER}} tokens. Zero runtime dependencies (Node ≥18).
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout, argv, exit } from 'node:process'

const HERE = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = join(HERE, '..', 'template')

// {{TOKEN}} → prompt. Order matters only for display.
const TOKENS = [
  { key: 'PROJECT_SLUG', q: 'Project slug (repo/package name, e.g. my-app)', def: 'my-app' },
  { key: 'PROJECT_NAME', q: 'Project display name (e.g. My App)', def: 'My App' },
  { key: 'PROJECT_DOMAIN', q: 'Public domain (blank if none)', def: '' },
  { key: 'AI_COAUTHOR', q: 'Commit co-author trailer (e.g. Claude <noreply@anthropic.com>)', def: 'Claude <noreply@anthropic.com>' },
]

const rest = argv.slice(2)
const flags = new Map()
for (const a of rest) {
  const m = a.match(/^--([a-z-]+)(?:=(.*))?$/)
  if (m) flags.set(m[1], m[2] ?? true)
}
const DEST = rest.find((a) => !a.startsWith('-')) || process.cwd()
const DRY = flags.has('dry-run')
const YES = flags.has('yes') // non-interactive: take flag values / defaults, no prompts

async function walk(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else out.push(p)
  }
  return out
}

function apply(text, vals) {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in vals ? vals[k] : m))
}

async function main() {
  console.log('\n  gated-pipeline — install\n')
  if (!existsSync(TEMPLATE)) {
    console.error('  template/ not found next to the installer. Aborting.')
    exit(1)
  }

  // A flag per token: --slug / --name / --domain / --coauthor.
  const FLAG = { PROJECT_SLUG: 'slug', PROJECT_NAME: 'name', PROJECT_DOMAIN: 'domain', AI_COAUTHOR: 'coauthor' }
  const vals = {}
  const missing = TOKENS.filter((t) => !flags.has(FLAG[t.key]))
  for (const t of TOKENS) if (flags.has(FLAG[t.key])) vals[t.key] = String(flags.get(FLAG[t.key]))

  if (missing.length && !YES) {
    const rl = createInterface({ input: stdin, output: stdout })
    for (const t of missing) {
      const a = await rl.question(`  ${t.q}${t.def ? ` [${t.def}]` : ''}: `)
      vals[t.key] = a.trim() || t.def
    }
    await rl.close()
  } else {
    for (const t of missing) vals[t.key] = t.def // --yes: defaults for anything unspecified
  }

  const files = await walk(TEMPLATE)
  console.log(`\n  ${DRY ? 'Would write' : 'Writing'} ${files.length} files into ${DEST}\n`)

  let wrote = 0, skipped = 0
  for (const src of files) {
    const rel = relative(TEMPLATE, src)
    const dst = join(DEST, rel)
    if (existsSync(dst)) {
      console.log(`  skip (exists): ${rel}`)
      skipped++
      continue
    }
    const raw = await readFile(src, 'utf8')
    const out = apply(raw, vals)
    if (!DRY) {
      await mkdir(dirname(dst), { recursive: true })
      await writeFile(dst, out)
    }
    wrote++
  }

  console.log(`\n  Done. ${wrote} written, ${skipped} skipped (already present).`)
  console.log('  Next: read docs/PROCESS.md, then work your first unit through the gates.')
  console.log('  NOTE: the gate cards still carry example stack/domain wording from the')
  console.log('  source project — see GENERALIZATION-NOTES.md to tailor them to your stack.\n')
}

main().catch((e) => { console.error(e); exit(1) })
