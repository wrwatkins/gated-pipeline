import test from 'node:test'
import assert from 'node:assert/strict'
import { cadenceDue, parseEvents } from '../lib/cadence.mjs'
import { project, sha } from './helpers.mjs'
const registry={cadence:[{role:'trace',interval:10,capability:null},{role:'a11y',interval:5,capability:'accessibility'}]}
test('cadence counts past 30, catches missed boundaries, and avoids re-triggering completed ones',async()=>{
 const p=await project();p.cadenceBaseline=30;p.capabilities.accessibility=true
 const due=cadenceDue(registry,p,41,[{type:'cadence_completed',role:'a11y',boundary:35,report:'report.md'}]);assert.deepEqual(due,[{role:'a11y',boundary:40},{role:'trace',boundary:40}])
})
test('disabled capabilities do not invent work for non-web projects',async()=>{const p=await project();p.cadenceBaseline=30;assert.deepEqual(cadenceDue(registry,p,40),[{role:'trace',boundary:40}])})
test('event input rejects duplicate merges, IDs, malformed JSON and impossible counts',async()=>{
 const merge={type:'merge',id:'a',pr:1,headSha:sha};assert.throws(()=>parseEvents(JSON.stringify(merge)+'\n'+JSON.stringify({...merge,id:'b'})),/duplicate/)
 assert.throws(()=>parseEvents('{'),/Invalid/);assert.throws(()=>parseEvents('{"type":"merge"}'),/Invalid/);assert.throws(()=>cadenceDue(registry,{cadenceBaseline:0,capabilities:{}},NaN),/integer/)
})
test('escape observations append without changing historical merge records',()=>{const merge={type:'merge',id:'merge-1',pr:1,headSha:sha};const text=JSON.stringify(merge)+'\n'+JSON.stringify({type:'escape_found',id:'escape-1',originPr:1,what:'later regression'});assert.deepEqual(parseEvents(text)[0],merge)})
test('invalid cadence intervals cannot create an unbounded loop',async()=>{assert.throws(()=>cadenceDue({cadence:[{role:'trace',interval:-10}]},{cadenceBaseline:0,capabilities:{}},40),/Invalid cadence/)})
