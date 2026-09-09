import { lstat, readFile, realpath } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'

const digest = value => createHash('sha256').update(value).digest('hex')
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const pathOK = value => typeof value === 'string' && value.length > 0 &&
  !/[\\\x00-\x1f\x7f]/.test(value) && !value.startsWith('/') &&
  !value.split('/').some(part => !part || part === '.' || part === '..')

function keys(value, expected, label) {
  if (!object(value) || Object.keys(value).some(k => !expected.includes(k)) || expected.some(k => !Object.hasOwn(value, k))) {
    throw new Error(`Invalid ${label} fields`)
  }
}
function paths(value) {
  if (!Array.isArray(value) || value.some(p => !pathOK(p)) || new Set(value).size !== value.length) {
    throw new Error('Context paths must be unique, safe, relative file paths')
  }
}
async function file(root, rel, optional = false) {
  if (!pathOK(rel)) throw new Error('Unsafe context path')
  let current = root
  try {
    for (const part of ['', ...rel.split('/')]) {
      if (part) current = join(current, part)
      if ((await lstat(current)).isSymbolicLink()) throw new Error(`Refusing context symlink: ${rel}`)
    }
    const stat = await lstat(current)
    if (!stat.isFile()) throw new Error(`Context path is not a regular file: ${rel}`)
    if (stat.size > 1024 * 1024) throw new Error(`Context file exceeds 1 MiB; split it before loading: ${rel}`)
    const bytes = await readFile(current)
    if (bytes.length > 1024 * 1024) throw new Error(`Context file exceeds 1 MiB: ${rel}`)
    return bytes
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (optional) return null
      throw new Error(`Missing required context file: ${rel}`)
    }
    throw error
  }
}

/** A metadata-only reading plan, not a prompt loader, model router or gate verdict. */
export async function contextPlan(directory, {
  gate, manifest = '.gated-pipeline/context.json', previous = null, budgetBytes = 65536,
} = {}) {
  if (!Number.isInteger(gate) || gate < 1 || gate > 9) throw new Error('Context requires --gate=1..9')
  if (!Number.isSafeInteger(budgetBytes) || budgetBytes < 1) throw new Error('Context budget must be a positive integer byte count')
  const root = resolve(directory)
  const config = JSON.parse((await file(root, manifest)).toString('utf8'))
  keys(config, ['schemaVersion', 'shared', 'gates'], 'context manifest')
  if (config.schemaVersion !== 1 || !object(config.gates)) throw new Error('Unsupported context manifest')
  paths(config.shared)
  for (const [number, group] of Object.entries(config.gates)) {
    if (!/^[1-9]$/.test(number)) throw new Error('Context gate keys must be 1..9')
    keys(group, ['required', 'optional'], `gate ${number}`)
    paths(group.required)
    paths(group.optional)
  }
  const group = config.gates[gate]
  if (!group) throw new Error(`No context manifest entry for gate ${gate}`)
  const rootId = digest(await realpath(root)), before = new Map()
  if (previous !== null) {
    const snapshot = JSON.parse((await file(root, previous)).toString('utf8'))
    if (!object(snapshot) || snapshot.schemaVersion !== 1 || snapshot.rootId !== rootId || !Array.isArray(snapshot.files)) {
      throw new Error('Invalid context snapshot or different checkout')
    }
    for (const entry of snapshot.files) {
      if (!object(entry) || !pathOK(entry.path) || !/^[a-f0-9]{64}$/.test(entry.sha256) || before.has(entry.path)) {
        throw new Error('Invalid context snapshot file entry')
      }
      before.set(entry.path, entry.sha256)
    }
  }
  const required = new Set([...config.shared, ...group.required])
  const selected = new Set([...required, ...group.optional])
  const files = [], missingOptional = []
  for (const path of selected) {
    const bytes = await file(root, path, !required.has(path))
    if (bytes === null) { missingOptional.push(path); continue }
    const sha256 = digest(bytes), old = before.get(path)
    files.push({ path, required: required.has(path), bytes: bytes.length, sha256,
      change: old === undefined ? 'unseen' : old === sha256 ? 'unchanged' : 'changed' })
  }
  const deferred = new Set(Object.values(config.gates).flatMap(g => [...g.required, ...g.optional]).filter(p => !selected.has(p)))
  const totalBytes = files.reduce((n, f) => n + f.bytes, 0)
  return {
    schemaVersion: 1, rootId, gate, files, missingOptional, deferredFileCount: deferred.size,
    totalBytes, budgetBytes, overBudget: totalBytes > budgetBytes,
    notice: 'Hashes describe disk bytes, not proof that a file remains in model context. Read required files after a fresh session or compaction, and changed files before relying on them. Add applicable rules and task artifacts explicitly. Byte counts are not token usage, cache hits or billed savings. A budget warning never omits required instructions.',
  }
}

export function formatContext(plan) {
  return [`Gate ${plan.gate} context: ${plan.totalBytes} bytes; budget ${plan.budgetBytes}${plan.overBudget ? ' (OVER BUDGET)' : ''}`,
    ...plan.files.map(f => `${f.change.padEnd(9)} ${String(f.bytes).padStart(7)} ${f.sha256.slice(0, 12)} ${f.path}`),
    ...plan.missingOptional.map(p => `optional, absent: ${p}`),
    `Other-gate files deferred: ${plan.deferredFileCount}`, plan.notice].join('\n')
}
