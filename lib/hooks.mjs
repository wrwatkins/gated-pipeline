import { execFileSync } from 'node:child_process'
import { readFile, lstat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { TEMPLATE } from './scaffold.mjs'
import { atomicWrite, read, safePath } from './files.mjs'
export async function gitHooks(dest,{check=false}={}) {
  const git=args=>execFileSync('git',args,{cwd:dest,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
  let configured
  try { configured=git(['config','--get','core.hooksPath']) } catch(error){if(error.status!==1)throw error}
  if(configured) throw new Error('core.hooksPath is configured; integrate the shared pre-push guard manually without replacing existing hooks')
  const common=resolve(dest,git(['rev-parse','--git-common-dir']))
  const path=await safePath(common,'hooks/pre-push')
  const content=await readFile(join(TEMPLATE,'.gated-pipeline/hooks/pre-push.mjs'),'utf8')
  const previous=await read(path)
  if(previous!==null&&previous!==content) throw new Error('Existing pre-push hook differs; integrate manually without replacing it')
  if(check) {
    if(previous!==content||!((await lstat(path)).mode&0o111)) throw new Error('Shared Git pre-push guard is not installed/executable; run gated-pipeline hooks')
    return 'Shared Git pre-push guard is installed'
  }
  await atomicWrite(path,content,0o755)
  return 'Installed shared Git pre-push guard; linked worktrees share this hook'
}
