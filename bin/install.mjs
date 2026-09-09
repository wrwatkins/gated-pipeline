#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'
import { readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { scaffold, defaults, readProject, validateTokens } from '../lib/scaffold.mjs'
import { read, safePath } from '../lib/files.mjs'
import { doctor } from '../lib/doctor.mjs'
import { checkEvidence, prBody } from '../lib/evidence.mjs'
import { gitHooks } from '../lib/hooks.mjs'
import { mergedCount, parseEvents, cadenceDue } from '../lib/cadence.mjs'
import { contextPlan, formatContext } from '../template/.gated-pipeline/workflows/context-plan.mjs'

const usage=`gated-pipeline — agent-neutral delivery gates

  install [directory] [--yes] [--slug=x --name=x --domain=x --coauthor=x]
                      [--agents=both|codex|claude|none] [--dry-run]
  sync [directory] [--dry-run]
  doctor [directory] [--json]
  context [directory] --gate=1..9 [--manifest=path] [--previous=path]
                      [--budget-bytes=N] [--json]
  hooks [directory] [--check]
  check <evidence.json> --head=<full-SHA> [--through=1..9] [--dir=project] [--json]
  pr-body <evidence.json> --head=<full-SHA> [--through=1..9] [--dir=project]
  cadence [directory] [--count=N] [--events=path] [--json]

Install defaults to both Codex and Claude Code adapters. --yes supplies identity
 defaults without prompting. Existing installations are preserved; use sync.
Hooks installs a shared Git pre-push guard and refuses unrelated existing hooks.
check validates recorded evidence; it does not run tests or contact a model.
pr-body renders validated gate results and author/reviewer/verifier attribution.
cadence reads GitHub's exact merged count unless --count is supplied explicitly.
context lists only shared/current-gate file metadata; it never calls a model.
`
const booleans=new Set(['yes','dry-run','json','check','help'])
const values=new Set(['slug','name','domain','coauthor','agents','head','through','dir','count','events','gate','manifest','previous','budget-bytes'])
const allowed={install:['yes','dry-run','slug','name','domain','coauthor','agents'],sync:['dry-run'],doctor:['json'],context:['gate','manifest','previous','budget-bytes','json'],hooks:['check'],check:['head','through','dir','json'],'pr-body':['head','through','dir'],cadence:['count','events','json']}
export function parseArgs(argv) {
  const flags=new Map(),positionals=[]
  for(let i=0;i<argv.length;i++) {
    const arg=argv[i]
    if(arg==='-h'){flags.set('help',true);continue}
    if(!arg.startsWith('-')){positionals.push(arg);continue}
    const match=arg.match(/^--([a-z-]+)(?:=(.*))?$/s)
    if(!match)throw new Error(`Unknown option ${arg}`)
    const [,key,inline]=match
    if(flags.has(key)) throw new Error(`Duplicate option --${key}`)
    if(booleans.has(key)){if(inline!==undefined)throw new Error(`--${key} takes no value`);flags.set(key,true)}
    else if(values.has(key)){const value=inline??argv[++i];if(value===undefined||value.startsWith('--'))throw new Error(`--${key} requires a value`);flags.set(key,value)}
    else throw new Error(`Unknown option --${key}`)
  }
  const command=positionals.shift()||'install'
  if(flags.has('help'))return {help:true}
  if(!Object.hasOwn(allowed,command)) throw new Error(`Unknown command ${command}; use --help`)
  if(positionals.length>1) throw new Error('Too many positional arguments')
  for(const key of flags.keys())if(!allowed[command].includes(key))throw new Error(`--${key} is not valid for ${command}`)
  return {command,argument:positionals[0],flags}
}
async function gather(flags) {
  const mapping={slug:'PROJECT_SLUG',name:'PROJECT_NAME',domain:'PROJECT_DOMAIN',coauthor:'AI_COAUTHOR'}
  const tokens={...defaults},missing=[]
  for(const [flag,key] of Object.entries(mapping)) {
    if(flags.has(flag)) tokens[key]=flags.get(flag)
    else if(['slug','name'].includes(flag))missing.push([flag,key])
  }
  if(missing.length&&!flags.has('yes')) {
    if(!process.stdin.isTTY) throw new Error('Non-interactive install needs --yes or both --slug and --name')
    const rl=createInterface({input:process.stdin,output:process.stdout})
    try{for(const [flag,key] of missing)tokens[key]=(await rl.question(`${flag} [${tokens[key]}]: `)).trim()||tokens[key]}finally{rl.close()}
  }
  validateTokens(tokens)
  return tokens
}
export async function main(argv=process.argv.slice(2)) {
  const args=parseArgs(argv)
  if(args.help){console.log(usage);return}
  const {command,argument,flags}=args
  const evidenceCommand=['check','pr-body'].includes(command)
  const dest=resolve(evidenceCommand?flags.get('dir')||process.cwd():argument||process.cwd())
  if(command==='install'||command==='sync') {
    const existing=await read(await safePath(dest,'.gated-pipeline.json'))
    if(command==='install'&&existing!==null&&['slug','name','domain','coauthor','agents'].some(flag=>flags.has(flag)))throw new Error('Already installed; edit existing configuration explicitly, then sync')
    let adapters
    if(flags.has('agents')){adapters={both:['codex','claude'],codex:['codex'],claude:['claude'],none:[]}[flags.get('agents')];if(!adapters)throw new Error('agents must be both, codex, claude, or none')}
    const result=await scaffold(dest,{command,tokens:command==='install'&&existing===null?await gather(flags):undefined,adapters,dry:flags.has('dry-run')})
    console.log(result.messages.join('\n'))
    console.log(`${flags.has('dry-run')?'Planned':'Applied'} ${result.changes} changes. Configure pipeline.config.json and STACK.md, then run doctor.`)
    return
  }
  if(command==='doctor') {
    const result=await doctor(dest)
    console.log(flags.has('json')?JSON.stringify(result,null,2):[...result.checks,...result.errors.map(e=>'ERROR: '+e),...result.warnings.map(w=>'NOTE: '+w)].join('\n'))
    if(result.errors.length)process.exitCode=1
    return
  }
  if(command==='hooks'){console.log(await gitHooks(dest,{check:flags.has('check')}));return}
  if(command==='context') {
    const options={gate:Number(flags.get('gate'))}
    for(const [flag,key] of [['manifest','manifest'],['previous','previous']])if(flags.has(flag))options[key]=flags.get(flag)
    if(flags.has('budget-bytes'))options.budgetBytes=Number(flags.get('budget-bytes'))
    const result=await contextPlan(dest,options)
    console.log(flags.has('json')?JSON.stringify(result,null,2):formatContext(result))
    return
  }
  if(evidenceCommand) {
    if(!argument)throw new Error('Supply an evidence JSON file')
    const record=JSON.parse(await readFile(resolve(argument),'utf8')),project=await readProject(dest)
    const through=flags.has('through')?Number(flags.get('through')):command==='pr-body'?8:9
    const result=checkEvidence(record,project,{head:flags.get('head'),through})
    if(result.errors.length){if(flags.has('json'))console.log(JSON.stringify({valid:false,errors:result.errors},null,2));else console.error(result.errors.join('\n'));process.exitCode=1;return}
    console.log(command==='pr-body'?prBody(record,result.latest):flags.has('json')?JSON.stringify({valid:true,head:record.headSha,through}):`PASS: attributed gates 1–${through} at ${record.headSha}`)
    return
  }
  if(command==='cadence') {
    const project=await readProject(dest)
    const registry=JSON.parse(await readFile(await safePath(dest,'.gated-pipeline/REGISTRY.json'),'utf8'))
    const count=flags.has('count')?Number(flags.get('count')):mergedCount(dest)
    const path=resolve(dest,flags.get('events')||'docs/traces/events.jsonl')
    const events=parseEvents(await read(path)||'')
    for(const event of events)if(event.type==='cadence_completed'&&await read(await safePath(dest,event.report))===null)throw new Error(`Missing cadence report: ${event.report}`)
    const due=cadenceDue(registry,project,count,events)
    console.log(flags.has('json')?JSON.stringify({count,source:flags.has('count')?'supplied':'GitHub totalCount',due},null,2):`Merged count ${count}\n${due.map(d=>`${d.boundary}: ${d.role}`).join('\n')||'No cadence reviews due'}`)
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1})
