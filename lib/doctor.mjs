import { readFile, readdir, lstat } from 'node:fs/promises'
import { join } from 'node:path'
import { read, safePath, walk } from './files.mjs'
import { readProject, HOOK_COMMAND } from './scaffold.mjs'
import { governance } from './governance.mjs'
import { testDataDoctor } from './test-data.mjs'
export async function doctor(dest) {
  const errors = [], warnings = [], checks = []
  let project, installation
  try {
    project = await readProject(dest)
    installation = JSON.parse(await readFile(await safePath(dest, '.gated-pipeline.json'), 'utf8'))
  } catch (error) { return { errors: [error.message], warnings, checks } }
  for (const name of project.requiredChecks) if (!project.commands[name]) errors.push(`Configure commands.${name} in pipeline.config.json`)
  const required = ['AGENTS.md','.gated-pipeline/START.md','.gated-pipeline/REGISTRY.json','.gated-pipeline/schemas/evidence.schema.json','docs/PROCESS.md','STACK.md','.github/pull_request_template.md']
  let registry
  try { registry = JSON.parse(await readFile(await safePath(dest,'.gated-pipeline/REGISTRY.json'),'utf8')) } catch { errors.push('Missing or malformed role registry') }
  if(registry) for(const role of ['analyst',...registry.pipeline.map(g=>g.role),...registry.cadence.map(g=>g.role)]) {
    required.push(`.gated-pipeline/roles/${role}.md`,`.gated-pipeline/state/${role}/inbox.md`,`.gated-pipeline/state/${role}/memory.md`)
  }
  if(registry) required.push(...registry.pipeline.map(g=>g.card))
  required.push(...Object.values(project.documents).filter(Boolean))
  for (const path of required) try { if (await read(await safePath(dest,path)) === null) errors.push(`Missing ${path}`) } catch(error) { errors.push(error.message) }
  if(installation.adapters?.includes('claude')) {
    try {
      const settings=JSON.parse(await readFile(await safePath(dest,'.claude/settings.json'),'utf8'))
      if(settings.disableAllHooks) errors.push('Claude hooks are disabled by project settings')
      if(!settings.hooks?.PreToolUse?.some(group=>group.matcher==='Bash'&&group.hooks?.some(h=>h.type==='command'&&h.command===HOOK_COMMAND))) errors.push('Claude push guard is not registered')
      const mode=(await lstat(await safePath(dest,'.gated-pipeline/hooks/block-push-to-main.mjs'))).mode
      if(!(mode&0o111)) errors.push('Push guard is not executable; sync to repair permissions')
    }catch(error){errors.push(`Claude setup: ${error.message}`)}
    for(const [key,paths] of Object.entries(project.paths)) if(paths.length){
      const current=await read(await safePath(dest,`.claude/rules/gated-${key}.md`))
      if(!current?.includes(`paths: ${JSON.stringify(paths)}`)) errors.push(`Generated ${key} scopes are stale; run sync`)
    }
    try { const rules = await walk(await safePath(dest,'.claude/rules'))
      for(const path of rules) if(/\/rules\/(gates|checklists)\//.test(path)) errors.push(`Legacy eager-loaded procedure remains: ${path}`)
    }catch(error){if(error.code!=='ENOENT') errors.push(error.message)}
    warnings.push('Claude hook activation still depends on the harness trusting/enabling project settings')
  }
  if(installation.adapters?.includes('codex')) {
    for(const name of ['compound','recall-solutions']) if(await read(await safePath(dest,`.agents/skills/${name}/SKILL.md`))===null) errors.push(`Missing Codex skill adapter: ${name}`)
    warnings.push('Codex does not execute Claude hooks; use the shared Git guard and remote branch protection')
  }
  try {
    if(await read(await safePath(dest,'ai-repository.json'))!==null) {
      const report=await governance(dest)
      errors.push(...report.errors);warnings.push(...report.warnings)
      if(report.valid)checks.push('Nine-area repository map and declared governance records inspected')
    } else warnings.push('No AI repository map; sync to adopt the project-owned governance scaffold')
  } catch { errors.push('Cannot inspect AI repository map') }
  const testData = await testDataDoctor(dest)
  if (testData.valid) {
    checks.push(...testData.checks)
    warnings.push(...testData.warnings)
  } else warnings.push('Synthetic test-data policy is missing or incomplete; configure it before claiming non-production data safety')
  if(!project.ci.requiredChecks.length) warnings.push('No required CI checks configured; local evidence does not enforce remote merges')
  warnings.push('Remote branch rules and current CI conclusions are not checked by this local doctor')
  checks.push('Project configuration and installed role prerequisites inspected')
  return {errors,warnings,checks}
}
