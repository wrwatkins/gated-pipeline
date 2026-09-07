#!/usr/bin/env node
// gated-pipeline-pre-push v1
// Durable copy installed in the common Git hooks directory. Reads the active
// worktree's policy; this does not intercept API merges or --no-verify.
// Git removes the .mjs suffix when installing this hook. Dynamic imports
// keep the durable copy valid in both CommonJS (Node 18) and ESM contexts.
async function main() {
try {
  const { readFileSync } = await import('node:fs')
  const { execFileSync } = await import('node:child_process')
  const { resolve } = await import('node:path')
  const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim()
  const policy=JSON.parse(readFileSync(resolve(root,'pipeline.config.json'),'utf8'))
  if(!Array.isArray(policy.protectedBranches)||!policy.protectedBranches.length||policy.protectedBranches.some(b=>typeof b!=='string'||!b)) throw new Error('Invalid protected branch policy')
  const protectedRefs=new Set(policy.protectedBranches.map(branch=>'refs/heads/'+branch))
  const lines=readFileSync(0,'utf8').trim()
  if(lines) for(const line of lines.split('\n')) {
    const parts=line.trim().split(/\s+/)
    if(parts.length!==4) throw new Error('Malformed pre-push input')
    if(protectedRefs.has(parts[2])) throw new Error(`Direct update/deletion of ${parts[2]} is prohibited; use a reviewed PR`)
  }
}catch(error){process.stderr.write(`BLOCKED: ${error.message}\n`);process.exitCode=1}
}
main()
