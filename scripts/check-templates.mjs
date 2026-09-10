import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { walk, matches } from '../lib/files.mjs'
import { ROOT, TEMPLATE } from '../lib/scaffold.mjs'
const manifest=JSON.parse(await readFile(join(ROOT,'framework-manifest.json'),'utf8'))
for(const path of await walk(TEMPLATE)){
 const rel=relative(TEMPLATE,path).split('\\').join('/')
 if(!matches(rel,[...manifest.framework,...manifest.projectOnce,...manifest.merged]))throw new Error(`Unclassified template: ${rel}`)
 if(path.endsWith('.mjs'))execFileSync(process.execPath,['--check',path],{stdio:'pipe'})
 if(path.endsWith('.json'))JSON.parse(await readFile(path,'utf8'))
 if(/\.claude\/rules\/(gates|checklists)\//.test(rel))throw new Error(`Eager-loaded procedure: ${rel}`)
}
for(const dir of ['lib','bin'])for(const path of await walk(join(ROOT,dir)))if(path.endsWith('.mjs'))execFileSync(process.execPath,['--check',path],{stdio:'pipe'})
const scratch=await mkdtemp(join(tmpdir(),'gated-pack-check-'))
try{
 const pack=JSON.parse(execFileSync('npm',['pack','--dry-run','--json','--ignore-scripts','--cache',scratch],{cwd:ROOT,encoding:'utf8'}))[0]
 const files=new Set(pack.files.map(file=>file.path))
 for(const path of ['CLI.md','bin/install.mjs','lib/evidence.mjs','migrations/0.6.0.json','template/.agents/skills/compound/SKILL.md','template/.claude/agents/developer.md','template/.gated-pipeline/schemas/evidence.schema.json'])if(!files.has(path))throw new Error(`Package omits ${path}`)
 console.log(`Template syntax, ownership and package contents passed (${files.size} packaged files)`)
}finally{await rm(scratch,{recursive:true,force:true})}
