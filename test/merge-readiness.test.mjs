import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { verifyMerge } from '../template/.gated-pipeline/workflows/merge-readiness.mjs'
import { ROOT } from '../lib/scaffold.mjs'
const head='a'.repeat(40)
const fixture=()=>({head,review:{schemaVersion:1,headSha:head,result:'PASS',author:{id:'author',tool:'future-tool',runId:'author-run'},reviewer:{id:'reviewer',tool:'codex',runId:'review-run'},evidence:['synthetic independent review']},policy:{schemaVersion:1,checks:[{name:'test',app:'github-actions',conclusions:['success'],skipReason:null},{name:'lint',app:'github-actions',conclusions:['success'],skipReason:null}]},checks:[{name:'test',head_sha:head,status:'completed',conclusion:'success',app:{slug:'github-actions'}},{name:'lint',head_sha:head,status:'completed',conclusion:'success',app:{slug:'github-actions'}}]})
test('current independent review and every named check pass',()=>assert.equal(verifyMerge(fixture()).ready,true))
test('stale, missing, failed or renamed self-review cannot approve',()=>{
 for(const change of [p=>p.review.headSha='b'.repeat(40),p=>p.review=null,p=>p.review.result='FAIL',p=>p.review.reviewer.id='author',p=>p.review.reviewer={id:'alias',tool:'future-tool',runId:'author-run'},p=>p.review.evidence=[]]){
  const p=fixture();change(p);assert.equal(verifyMerge(p).ready,false)
 }
})
test('one successful job, empty checks and an unconfigured policy cannot satisfy named requirements',()=>{
 for(const change of [p=>p.checks.pop(),p=>p.checks=[],p=>p.policy.checks=[],p=>p.policy.checks.push({...p.policy.checks[0]})]){
  const p=fixture();change(p);assert.equal(verifyMerge(p).ready,false)
 }
})
test('wrong-head, pending, failed, neutral, unapproved skipped and wrong-publisher checks fail',()=>{
 for(const fields of [{head_sha:'b'.repeat(40)},{status:'in_progress'},{conclusion:'failure'},{conclusion:'neutral'},{conclusion:'skipped'},{app:{slug:'another-publisher'}}]){
  const p=fixture();Object.assign(p.checks[0],fields);assert.equal(verifyMerge(p).ready,false)
 }
})
test('skips require an explicit named allowance and reason',()=>{
 const p=fixture();p.checks[0].conclusion='skipped';p.policy.checks[0].conclusions.push('skipped')
 assert.equal(verifyMerge(p).ready,false)
 p.policy.checks[0].skipReason='Synthetic fixture: docs-only classification separately verified'
 assert.equal(verifyMerge(p).ready,true)
})
test('an additional failing or pending check cannot be hidden by the required list',()=>{
 for(const fields of [{status:'in_progress'},{conclusion:'failure'}]){
  const p=fixture();p.checks.push({...p.checks[0],name:'extra',...fields});assert.equal(verifyMerge(p).ready,false)
 }
})
test('malformed metadata fails closed without reflecting provider payloads',()=>{
 const p=fixture();p.checks=[{PRIVATE_KEY:'PRIVATE_BODY'}]
 const result=verifyMerge(p);assert.equal(result.ready,false);assert.doesNotMatch(JSON.stringify(result),/PRIVATE_/)
})
test('repository policy pins the three supported Node CI jobs', async()=>{
 const policy=JSON.parse(await readFile(join(ROOT,'merge-policy.json'),'utf8'))
 const expected=[
  {name:'test (18)',app:'github-actions',conclusions:['success'],skipReason:null},
  {name:'test (22)',app:'github-actions',conclusions:['success'],skipReason:null},
  {name:'test (24)',app:'github-actions',conclusions:['success'],skipReason:null}
 ]
 assert.deepEqual(policy,{schemaVersion:1,checks:expected})
 const checks=expected.map(rule=>({name:rule.name,head_sha:head,status:'completed',conclusion:'success',app:{slug:rule.app}}))
 const result=verifyMerge({head,review:fixture().review,policy,checks})
 assert.equal(result.ready,true)
})
