import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { ROOT, TEMPLATE } from '../lib/scaffold.mjs'
export const cli=join(ROOT,'bin/install.mjs')
export const sha='a'.repeat(40)
export async function fixture(t){const root=await mkdtemp(join(tmpdir(),'gated-pipeline-test-'));t.after(()=>rm(root,{recursive:true,force:true}));return root}
export async function put(root,path,text){await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),text)}
export const run=(args,cwd)=>spawnSync(process.execPath,[cli,...args],{cwd,encoding:'utf8',input:'',timeout:10000})
export const readJSON=async path=>JSON.parse(await readFile(path,'utf8'))
export async function project(){const value=await readJSON(join(TEMPLATE,'pipeline.config.json'));value.commands.test='node --test';return value}
export function record({profile='full',through=9}={}){
 return {schemaVersion:1,unit:'sample',profile,headSha:sha,attempts:Array.from({length:through},(_,i)=>({gate:i+1,attempt:1,result:'PASS',reason:null,headSha:sha,actor:{id:i===3?'author-session':`review-session-${i}`,kind:'agent',tool:i===3?'codex':'claude-code',model:null,runId:null},artifacts:[],evidence:[{check:i===3||i===5?'test':i===7?'rollback':'review',status:'pass',source:i===3||i===5?'command':'manual',command:i===3||i===5?'node --test':null,exitCode:i===3||i===5?0:null,reference:'recorded output',reason:null}],findings:[]}))}
}
