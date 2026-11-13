import test from 'node:test'
import assert from 'node:assert/strict'
import { checkEvidence, prBody } from '../lib/evidence.mjs'
import { project, record, sha, redReceipt } from './helpers.mjs'
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
 ['full profile without a red receipt',r=>delete r.attempts[3].redReceipts,/red receipt/],
 ['red receipt that did not fail',r=>r.attempts[3].redReceipts[0].exitCode=0,/red receipt/],
 ['red receipt on the reviewed head itself',r=>r.attempts[3].redReceipts[0].commit=sha,/red receipt/],
 ['red receipt naming no tests',r=>r.attempts[3].redReceipts[0].tests=[],/too few items/],
 ['red receipt actor contradicting attribution',r=>r.attempts[3].redReceipts[0].actor={...r.attempts[3].actor,tool:'claude-code'},/contradictory/],
])test(name+' is rejected',async()=>{const r=record();mutate(r);assert.match((await check(r)).errors.join('\n'),pattern)})
test('a second red receipt may carry the tester actor and renders in the PR body',async()=>{
 const r=record();r.attempts[3].redReceipts.push(redReceipt(r.attempts[5].actor,['e2e/flow.spec.mjs']));const result=await check(r);assert.deepEqual(result.errors,[])
 const body=prBody(r,result.latest);assert.match(body,/red receipt/);assert.match(body,/e2e\/flow\.spec\.mjs/);assert.match(body,/review-session-5/)
})
test('chore and docs profiles do not require a red receipt but validate one when present',async()=>{
 const r=record({profile:'chore'});delete r.attempts[3].redReceipts;assert.doesNotMatch((await check(r)).errors.join('\n'),/red receipt/)
 r.attempts[3].redReceipts=[{...redReceipt(r.attempts[3].actor),exitCode:0}];assert.match((await check(r)).errors.join('\n'),/red receipt/)
})
test('branch inspection findings attach to gate 4',async()=>{
 const r=record();const errors=checkEvidence(r,await project(),{head:sha,testFirst:{ok:false,errors:['src/x.mjs changed before any test commit']}}).errors
 assert.match(errors.join('\n'),/Gate 4: .*before any test commit/)
 assert.deepEqual(checkEvidence(r,await project(),{head:sha,testFirst:{ok:true,errors:[]}}).errors,[])
})
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
 const r=record();const failed={...r.attempts[4],result:'FAIL',findings:[{id:'F1',severity:'HIGH',what:'bug',file:'x.js',line:1,resolved:false}]};r.attempts.splice(4,0,failed);r.attempts[5].attempt=2;r.attempts[5].supersedes={gate:5,attempt:1}
 assert.match((await check(r)).errors.join('\n'),/historical blocker/)
 r.attempts[5].findings=[{...failed.findings[0],resolved:true}];assert.deepEqual((await check(r)).errors,[])
})
test('renaming an author run cannot create an independent reviewer',async()=>{
 const r=record();r.attempts[3].actor.runId='author-run';r.attempts[4].actor={...r.attempts[3].actor,id:'renamed-author'}
 assert.match((await check(r)).errors.join('\n'),/independent/)
 r.attempts[4].actor.runId='separate-review-run';assert.deepEqual((await check(r)).errors,[])
})

// Rules ported from a year of running the gates: fresh reviewer context,
// corrected FAIL rounds, independence at every review gate, clean records,
// the tester's disposition, the adversarial pass and regression-only carry.
import { disposition, testerActor, evidenceItem } from './helpers.mjs'
for(const [name,mutate,pattern]of [
 ['a resumed context at a review gate',r=>r.attempts[4].context='resumed',/fresh context/],
 ['a missing context at gate 9',r=>delete r.attempts[8].context,/fresh context/],
 ['a verifier sharing the author id',r=>r.attempts[5].actor={...r.attempts[3].actor},/Gate 6: independent/],
 ['an operations verifier sharing the author run with another tool',r=>{r.attempts[3].actor.runId='run-1';r.attempts[7].actor={...r.attempts[7].actor,runId:'run-1'}},/Gate 8: independent/],
 ['a control character in a reason',r=>{r.attempts[1].reason='fits\u0007'},/control or format character/],
 ['a zero-width format character in a reference',r=>{r.attempts[5].evidence[0].reference='ok​'},/control or format character/],
 ['a non-ASCII run id',r=>r.attempts[4].actor.runId='run-é',/printable ASCII/],
 ['a full profile with only the author red receipt and no disposition',r=>r.attempts[3].redReceipts=[r.attempts[3].redReceipts[0]],/tester's own red receipt or a noBrowserContract/],
 ['a disposition written by the author',r=>{r.attempts[3].redReceipts=[r.attempts[3].redReceipts[0]];r.attempts[3].noBrowserContract=disposition(r.attempts[3].actor)},/from the tester, not the author/],
 ['a placeholder disposition reason',r=>{r.attempts[3].noBrowserContract={...disposition(),reason:'n/a '.repeat(12)}},/explain the disposition/],
 ['a disposition reason with too few distinct words',r=>{r.attempts[3].noBrowserContract={...disposition(),reason:'browser browser browser browser browser browser browser browser'}},/explain the disposition/],
 ['a disposition with duplicate inspected items',r=>{r.attempts[3].noBrowserContract={...disposition(),inspected:['docs/design/TDS.md','Docs/Design/TDS.md ']}},/distinct, concrete items/],
 ['a disposition on a gate other than 4',r=>r.attempts[5].noBrowserContract=disposition(),/belongs to the gate 4 attempt/],
 ['a gate 7 pass without an adversarial pass',r=>r.attempts[6].evidence=r.attempts[6].evidence.filter(e=>e.check!=='adversarial'),/Gate 7: missing passing adversarial/],
 ['supersedes pointing at a passing attempt',r=>{r.attempts.push({...r.attempts[4],attempt:2,supersedes:{gate:5,attempt:1}})},/only a FAIL round is superseded/],
 ['supersedes pointing at another gate',r=>{r.attempts[4].result='FAIL';r.attempts[4].reason='blocked';r.attempts.splice(5,0,{...r.attempts[4],result:'PASS',reason:null,attempt:2,supersedes:{gate:4,attempt:1}})},/own gate|must declare supersedes/],
 ['supersedes naming no earlier attempt',r=>{r.attempts[4].supersedes={gate:5,attempt:7}},/names no earlier attempt/],
 ['carriedHead without unitPaths',r=>r.carriedHead='d'.repeat(40),/declared together/],
 ['carriedHead equal to the head',r=>{r.carriedHead=sha;r.unitPaths=['src/']},/must differ/],
 ['carriedHead without the inspector',r=>{r.carriedHead='d'.repeat(40);r.unitPaths=['src/']},/merge-regression inspection/],
])test(name+' is rejected',async()=>{const r=record();mutate(r);assert.match((await check(r)).errors.join('\n'),pattern)})
test('a correcting round after a FAIL must name it and use a fresh run, and the FAIL stays in the record',async()=>{
 const r=record();const failed={...r.attempts[6],result:'FAIL',reason:'open finding',actor:{...r.attempts[6].actor,runId:'sec-run-1'}};r.attempts.splice(6,0,failed);r.attempts[7]={...r.attempts[7],attempt:2,actor:{...failed.actor,runId:'sec-run-1'}}
 assert.match((await check(r)).errors.join('\n'),/must declare supersedes \{gate 7, attempt 1\}/)
 r.attempts[7].supersedes={gate:7,attempt:1};assert.match((await check(r)).errors.join('\n'),/fresh run/)
 r.attempts[7].actor={...r.attempts[7].actor,id:'review-session-6-round-2',runId:'sec-run-2'};const result=await check(r);assert.deepEqual(result.errors,[])
 assert.match(prBody(r,result.latest),/corrects attempt 1/);assert.equal(r.attempts.filter(a=>a.result==='FAIL').length,1)
})
test('a tester disposition replaces the tester red receipt and renders in the PR body',async()=>{
 const r=record();r.attempts[3].redReceipts=[r.attempts[3].redReceipts[0]];r.attempts[3].noBrowserContract=disposition();const result=await check(r);assert.deepEqual(result.errors,[])
 assert.match(prBody(r,result.latest),/no browser contract, disposition by review-session-5/)
})
test('chore needs an adversarial pass at gate 7; docs does not',async()=>{
 for(const [profile,expected] of [['chore',true],['docs',false]]){const r=record({profile});r.attempts[6].evidence=r.attempts[6].evidence.filter(e=>e.check!=='adversarial');if(profile==='docs'){for(const entry of r.attempts.slice(0,3)){entry.result='PASS_NA';entry.reason='no object'}}
  assert.equal(/adversarial/.test((await check(r)).errors.join('\n')),expected,profile)}
})
test('a verified merge-regression movement lets gates 1-5 stay bound while 6-9 bind to the head',async()=>{
 const carried='d'.repeat(40);const r=record();r.carriedHead=carried;r.unitPaths=['src/'];for(const a of r.attempts.slice(0,5))a.headSha=carried
 const p=await project();const inspection={ok:true,kind:'merge-regression',verifiedHead:carried,head:sha,errors:[]}
 assert.deepEqual(checkEvidence(r,p,{head:sha,mergeRegression:inspection}).errors,[])
 r.attempts[5].headSha=carried;assert.match(checkEvidence(r,p,{head:sha,mergeRegression:inspection}).errors.join('\n'),/Gate 6: stale evidence/)
 r.attempts[5].headSha=sha;assert.match(checkEvidence(r,p,{head:sha,mergeRegression:{...inspection,ok:false,errors:['unit path src/a.mjs changed']}}).errors.join('\n'),/carriedHead: unit path/)
 assert.match(checkEvidence(r,p,{head:sha,mergeRegression:{...inspection,verifiedHead:'e'.repeat(40)}}).errors.join('\n'),/carriedHead:/)
 assert.match(prBody(r,checkEvidence(r,p,{head:sha,mergeRegression:inspection}).latest),/Carried from: dddd/)
})
test('a records-only movement lets every gate stay bound',async()=>{
 const carried='d'.repeat(40);const r=record();r.carriedHead=carried;r.unitPaths=['src/'];for(const a of r.attempts)a.headSha=carried
 assert.deepEqual(checkEvidence(r,await project(),{head:sha,mergeRegression:{ok:true,kind:'records-only',verifiedHead:carried,head:sha,errors:[]}}).errors,[])
})
