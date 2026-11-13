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
export const redCommit='c'.repeat(40)
export const redReceipt=(actor,tests=['test/unit.test.mjs'])=>({actor,commit:redCommit,command:'node --test',exitCode:1,reference:'red tail: 2 failed, 0 passed',tests})
export const testerActor={id:'review-session-5',kind:'agent',tool:'claude-code',model:null,runId:null}
export const disposition=(actor=testerActor)=>({actor,reason:'The design names no browser-tier or integration contract: the unit changes a library function with no user-facing surface',inspected:['docs/design/TDS-sample.md section 4','docs/requirements/BR-sample.md acceptance criteria 1-3']})
export const evidenceItem=(check,extra={})=>({check,status:'pass',source:'manual',command:null,exitCode:null,reference:'recorded output',reason:null,...extra})
export function record({profile='full',through=9}={}){
 return {schemaVersion:1,unit:'sample',profile,headSha:sha,attempts:Array.from({length:through},(_,i)=>{const actor={id:i===3?'author-session':`review-session-${i}`,kind:'agent',tool:i===3?'codex':'claude-code',model:null,runId:null};return {gate:i+1,attempt:1,result:'PASS',reason:null,headSha:sha,actor,...(i>=4?{context:'fresh'}:{}),artifacts:[],evidence:[{check:i===3||i===5?'test':i===7?'rollback':'review',status:'pass',source:i===3||i===5?'command':'manual',command:i===3||i===5?'node --test':null,exitCode:i===3||i===5?0:null,reference:'recorded output',reason:null},...(i===6?[evidenceItem('adversarial',{reference:'threat model, 3 probes, no unexpected result'})]:[])],findings:[],...(i===3?{redReceipts:[redReceipt(actor),redReceipt(testerActor,['e2e/flow.spec.mjs'])]}:{})}})}
}
