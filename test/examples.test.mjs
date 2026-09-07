import test from 'node:test'
import assert from 'node:assert/strict'
import { cp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fixture, sha, run } from './helpers.mjs'
import { ROOT, scaffold, defaults } from '../lib/scaffold.mjs'
for(const [name,binary,args]of [['node-cli',process.execPath,['--test','sum.test.mjs']],['python-library','python3',['-m','unittest','discover','-p','test_*.py']]])test(`${name}: install, doctor, actual language tests and attributed evidence`,async t=>{
 const dest=await fixture(t);await cp(join(ROOT,'examples',name),dest,{recursive:true});await scaffold(dest,{command:'install',tokens:defaults});let r=run(['doctor','--json'],dest);assert.equal(r.status,0,r.stdout+r.stderr)
 r=spawnSync(binary,args,{cwd:dest,encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr)
 r=run(['check','evidence.fixture.json',`--head=${sha}`],dest);assert.equal(r.status,0,r.stderr)
})
