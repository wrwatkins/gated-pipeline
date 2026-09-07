import test from 'node:test'
import assert from 'node:assert/strict'
import { checkEvidence, prBody } from '../lib/evidence.mjs'
import { project, record, sha } from './helpers.mjs'
const check=async r=>checkEvidence(r,await project(),{head:sha})
test('mixed Codex and Claude attribution produces a validated PR table',async()=>{
 const r=record(),result=await check(r);assert.deepEqual(result.errors,[]);const body=prBody(r,result.latest);assert.match(body,/author \| codex/);assert.match(body,/reviewer \| claude-code/);assert.match(body,/not exposed/)
})
for(const [name,mutate,pattern]of [
 ['missing gate',r=>r.attempts.splice(5,1),/prerequisite|missing/],
 ['explicit failure without findings',r=>{r.attempts[8].result='FAIL';r.attempts[8].reason='incomplete review'},/failed/],
 ['missing attribution',r=>delete r.attempts[4].actor,/actor/],
 ['self review',r=>r.attempts[4].actor={...r.attempts[3].actor},/independent/],
 ['unknown result',r=>r.attempts[3].result='SKIP',/expected one of/],
 ['stale evidence',r=>r.attempts[8].headSha='b'.repeat(40),/stale|prerequisite/],
 ['N/A at test gate',r=>{r.attempts[5].result='PASS_NA';r.attempts[5].reason='skip'},/restricted/],
 ['failed check marked passing',r=>r.attempts[5].evidence[0].status='fail',/failed evidence/],
 ['nonzero command exit',r=>r.attempts[3].evidence[0].exitCode=1,/nonzero/],
 ['unconfigured command masquerading as test',r=>r.attempts[3].evidence[0].command='true',/configured command/],
 ['unresolved blocker',r=>r.attempts[4].findings.push({id:'F1',severity:'HIGH',what:'bug',file:'code.js',line:1,resolved:false}),/unresolved/],
 ['duplicate check',r=>r.attempts[3].evidence.push({...r.attempts[3].evidence[0]}),/duplicate/],
 ['ambiguous human attribution',r=>r.attempts[3].actor.kind='human',/human attribution/],
 ['unsupported schema field',r=>r.trusted=true,/unknown field/],
])test(name+' is rejected',async()=>{const r=record();mutate(r);assert.match((await check(r)).errors.join('\n'),pattern)})
test('empty reviews cannot pass',async()=>{const r=record();r.attempts=[];assert.ok((await check(r)).errors.length)})
test('docs no-object gates and per-check n/a retain explicit real gate completion',async()=>{
 const r=record({profile:'docs'});for(const entry of r.attempts.slice(0,3)){entry.result='PASS_NA';entry.reason='documentation-only wording';entry.evidence=[]}
 for(const i of [3,5]){const entry=r.attempts[i];entry.evidence[0]={...entry.evidence[0],status:'na',command:null,exitCode:null,reason:'No executable changes'};entry.evidence.push({check:'docs',status:'pass',source:'manual',command:null,exitCode:null,reason:null,reference:'reviewed links and content'})}
 assert.deepEqual((await check(r)).errors,[])
})
test('rework invalidates later passes until rerun',async()=>{
 const r=record();r.attempts.push({...r.attempts[3],attempt:2});assert.match((await check(r)).errors.join('\n'),/invalidated/)
})
test('CI evidence is required for configured remote checks',async()=>{
 const p=await project();p.ci.requiredChecks=['quality'];const r=record();assert.match(checkEvidence(r,p,{head:sha}).errors.join('\n'),/quality/)
 r.attempts[7].evidence.push({check:'quality',status:'pass',source:'ci',command:null,exitCode:null,reference:'https://example.test/ci/run/1',reason:null});assert.deepEqual(checkEvidence(r,p,{head:sha}).errors,[])
})
test('reviewed head must be supplied independently',async()=>{assert.match(checkEvidence(record(),await project()).errors.join('\n'),/independently/)})
test('a blocker cannot disappear from a later passing attempt without resolution',async()=>{
 const r=record();const failed={...r.attempts[4],result:'FAIL',findings:[{id:'F1',severity:'HIGH',what:'bug',file:'x.js',line:1,resolved:false}]};r.attempts.splice(4,0,failed);r.attempts[5].attempt=2
 assert.match((await check(r)).errors.join('\n'),/historical blocker/)
 r.attempts[5].findings=[{...failed.findings[0],resolved:true}];assert.deepEqual((await check(r)).errors,[])
})
test('renaming an author run cannot create an independent reviewer',async()=>{
 const r=record();r.attempts[3].actor.runId='author-run';r.attempts[4].actor={...r.attempts[3].actor,id:'renamed-author'}
 assert.match((await check(r)).errors.join('\n'),/independent/)
 r.attempts[4].actor.runId='separate-review-run';assert.deepEqual((await check(r)).errors,[])
})
