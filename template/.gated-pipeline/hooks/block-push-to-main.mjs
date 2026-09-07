#!/usr/bin/env node
// gated-pipeline Claude guard. Early feedback only; shell text is not a
// security boundary. Git pre-push and remote branch rules cover other tools.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function inspectInvocation(input, branches) {
  if (!input || typeof input.tool_name !== 'string') return 'Malformed tool invocation'
  if (input.tool_name !== 'Bash') return null
  const command = input.tool_input?.command
  if (typeof command !== 'string' || !command.trim()) return 'Missing shell command'
  if (/\bgh\b[\s\S]*\bpr\b[\s\S]*\bmerge\b[\s\S]*--admin\b/.test(command)) return 'Administrative merge bypass is prohibited'
  if (!/\bgit\b/.test(command) || !/\bpush\b/.test(command)) return null
  // Fail closed for the push forms this deliberately narrow parser cannot
  // resolve. Never execute shell substitutions or guess a destination ref.
  if (!/^git\s+push\s+/.test(command) || /[\n\r;&|`$<>\\'"()]/.test(command)) return 'Use a standalone git push with an explicit remote and destination ref'
  const words = command.trim().split(/\s+/).slice(2)
  const safeFlags = new Set(['--force','--force-with-lease','-f','--set-upstream','-u','--dry-run','-n','--verbose','-v','--porcelain'])
  const positional = []
  for (const word of words) {
    if (word.startsWith('-')) { if (!safeFlags.has(word)) return `Unsupported push option ${word}; use explicit destination refs` }
    else positional.push(word)
  }
  if (positional.length < 2) return 'Remote-only or implicit pushes are ambiguous; name the destination ref'
  for (const refspec of positional.slice(1)) {
    if (refspec.includes('*')) return 'Wildcard pushes are not supported by this guard'
    const parts = refspec.replace(/^\+/, '').split(':')
    if (parts.length > 2 || !parts.at(-1)) return 'Malformed push refspec'
    const destination = parts.at(-1)
    if (destination === 'HEAD') return 'HEAD needs an explicit destination branch'
    const branch = destination.replace(/^refs\/heads\//, '')
    if (branches.includes(branch)) return `Direct push to ${branch} is prohibited; use a reviewed PR`
  }
  return null
}
function main() {
  try {
    const input = JSON.parse(readFileSync(0, 'utf8'))
    const root = process.env.CLAUDE_PROJECT_DIR || input.cwd
    if (!root) throw new Error('Project directory is missing')
    const config = JSON.parse(readFileSync(resolve(root,'pipeline.config.json'),'utf8'))
    if (!Array.isArray(config.protectedBranches) || !config.protectedBranches.length || config.protectedBranches.some(b=>typeof b!=='string'||!b)) throw new Error('Invalid protectedBranches configuration')
    const reason = inspectInvocation(input,config.protectedBranches)
    if(reason) throw new Error(reason)
  } catch(error) { process.stderr.write(`BLOCKED: ${error.message}\n`); process.exitCode=2 }
}
if(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
