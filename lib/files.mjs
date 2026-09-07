import { lstat, mkdir, readFile, readdir, rename, unlink, writeFile, chmod } from 'node:fs/promises'
import { resolve, relative, dirname, join, sep } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'

export const hash = text => createHash('sha256').update(text).digest('hex')
export const json = value => JSON.stringify(value, null, 2) + '\n'
export async function read(path) {
  try { return await readFile(path, 'utf8') } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
export async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Template symlink is unsupported: ${path}`)
    if (entry.isDirectory()) out.push(...await walk(path))
    else out.push(path)
  }
  return out.sort()
}
export function safeRelative(path) {
  return typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\') && !path.split('/').some(part => part === '..' || part === '.')
}
export const matches = (path, patterns) => patterns.some(pattern => pattern.endsWith('/') ? path.startsWith(pattern) : path === pattern)

// Check every path component before reading or replacing managed files. A linked
// .claude directory must not make a sync modify another project.
export async function safePath(root, rel) {
  if (!safeRelative(rel)) throw new Error(`Unsafe project path: ${rel}`)
  const base = resolve(root)
  const target = resolve(base, rel)
  if (!relative(base, target) || relative(base, target).startsWith('..' + sep)) throw new Error(`Path escapes project: ${rel}`)
  let current = base
  const parts = ['', ...relative(base, target).split(sep)]
  for (const part of parts) {
    if (part) current = join(current, part)
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error(`Refusing symlink: ${current}`) }
    catch (error) { if (error.code === 'ENOENT') break; throw error }
  }
  return target
}
export async function atomicWrite(path, contents, mode = 0o644) {
  await mkdir(dirname(path), { recursive: true })
  const temporary = join(dirname(path), `.gated-pipeline-${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, contents, { flag: 'wx', mode })
    await chmod(temporary, mode)
    await rename(temporary, path)
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error })
  }
}
export function render(text, tokens, isJSON = false) {
  const replace = value => value.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!Object.hasOwn(tokens, key)) throw new Error(`Unknown template token: ${key}`)
    return tokens[key]
  })
  if (!isJSON) return replace(text)
  const visit = value => typeof value === 'string' ? replace(value)
    : Array.isArray(value) ? value.map(visit)
      : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)])) : value
  return json(visit(JSON.parse(text)))
}
