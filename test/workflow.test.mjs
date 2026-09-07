import test from 'node:test'
import assert from 'node:assert/strict'
import { reviewGate } from '../template/.gated-pipeline/workflows/review-gate.mjs'
import { sha } from './helpers.mjs'
const args={gate:5,target:'src/',headSha:sha}
test('dimension reports all complete before a gate result',async()=>{const r=await reviewGate({...args,reviewer:async()=>({result:'PASS',headSha:sha,findings:[]})});assert.equal(r.result,'PASS');assert.equal(r.reviews.length,3)})
for(const [label,reviewer] of [
 ['explicit FAIL',async()=>({result:'FAIL',headSha:sha,findings:[]})],
 ['missing result',async()=>null],
 ['stale result',async()=>({result:'PASS',headSha:'b'.repeat(40),findings:[]})],
 ['throwing reviewer',async()=>{throw new Error('failed')}],
 ['invalid findings',async()=>({result:'PASS',headSha:sha,findings:[{}]})],
 ['blocker on a PASS',async()=>({result:'PASS',headSha:sha,findings:[{severity:'HIGH',what:'bug'}]})]
])test(label+' fails closed',async()=>{assert.equal((await reviewGate({...args,reviewer})).result,'FAIL')})
test('timeouts fail rather than omitting a reviewer',async()=>{const result=await reviewGate({...args,timeoutMs:10,reviewer:()=>new Promise(()=>{})});assert.equal(result.result,'FAIL');assert.equal(result.reviews.length,3)})
test('ops is not eligible and no demo target is assumed',async()=>{await assert.rejects(reviewGate({...args,gate:8,reviewer:async()=>{}}));await assert.rejects(reviewGate({...args,target:'',reviewer:async()=>{}}))})

test('reports cannot rename their assigned dimension',async()=>{const r=await reviewGate({...args,reviewer:async()=>({result:'PASS',headSha:sha,findings:[],dimension:'spoofed'})});assert.equal(r.reviews[0].dimension,'correctness')})
test('provider failure text is not copied into public evidence',async()=>{const r=await reviewGate({...args,reviewer:async()=>{throw new Error('synthetic-private-prompt')}});assert.equal(r.result,'FAIL');assert.ok(!JSON.stringify(r).includes('synthetic-private-prompt'))})
test('string gates do not bypass typed eligibility',async()=>{await assert.rejects(reviewGate({...args,gate:'5',reviewer:async()=>{}}))})
test('sparse findings cannot pass',async()=>{const r=await reviewGate({...args,reviewer:async()=>({result:'PASS',headSha:sha,findings:new Array(1)})});assert.equal(r.result,'FAIL')})
test('malformed findings retain valid blockers and their source head',async()=>{
 const finding={severity:'HIGH',what:'fixture defect'},stale='b'.repeat(40)
 const r=await reviewGate({...args,reviewer:async()=>({result:'FAIL',headSha:stale,findings:[finding,null]})})
 assert.equal(r.result,'FAIL');assert.deepEqual(r.reviews[0].findings[0],finding);assert.equal(r.reviews[0].reportedHeadSha,stale)
})
