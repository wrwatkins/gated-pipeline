import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { mkdir, readFile, symlink } from 'node:fs/promises'
import { fixture } from './helpers.mjs'
import { teamClaim, teamRelease, teamStatus } from '../template/.gated-pipeline/workflows/team-coordination.mjs'
async function repo(t){const root=await fixture(t);const git=(...a)=>execFileSync('git',a,{cwd:root,stdio:'pipe'});git('init');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','fixture');const second=join(root,'second');git('worktree','add','-b','second',second);return {root,second}}
const request=(task,owner,paths=[],resources=[])=>({task,owner,tool:'future-tool',runId:owner,paths,resources})
test('claims are immediately shared across linked worktrees and disjoint work can proceed',async t=>{
 const {root,second}=await repo(t);await teamClaim(root,request('alpha','agent-a',['src/']))
 assert.equal((await teamStatus(second)).claims.length,1)
 await teamClaim(second,request('beta','agent-b',['docs/']))
 assert.equal((await teamStatus(root)).claims.length,2)
})
test('overlapping files, task identities, and shared merge slots fail without changing claims',async t=>{
 const {root,second}=await repo(t);await teamClaim(root,request('alpha','agent-a',['src/'],['merge']))
 for(const req of [request('beta','agent-b',['src/app.js']),request('alpha','agent-b',['docs/']),request('beta','agent-b',[],['merge'])])await assert.rejects(teamClaim(second,req),/conflict/i)
 assert.equal((await teamStatus(root)).claims.length,1)
})
test('only the recorded owner, run and worktree can release a claim',async t=>{
 const {root,second}=await repo(t);await teamClaim(root,request('alpha','agent-a',['src/']))
 await assert.rejects(teamRelease(second,'alpha','agent-a','agent-a'),/owner/i)
 await assert.rejects(teamRelease(root,'alpha','agent-b','agent-b'),/owner/i)
 await teamRelease(root,'alpha','agent-a','agent-a');assert.deepEqual((await teamStatus(second)).claims,[])
})
test('shared resources reject whitespace aliases before creating claims',async t=>{
 const {root,second}=await repo(t);await teamClaim(root,request('alpha','agent-a',[],['merge']))
 for(const resource of ['merge ', ' merge', '\u00a0merge', 'merge\u00a0'])await assert.rejects(teamClaim(second,request('beta','agent-b',[],[resource])),/invalid shared resource/i)
 assert.equal((await teamStatus(root)).claims.length,1)
})
test('directory and single-file claims do not confuse similar prefixes',async t=>{
 const {root,second}=await repo(t);await teamClaim(root,request('alpha','agent-a',['src/app.js']))
 await teamClaim(second,request('beta','agent-b',['src/app.js.map','src-other/']))
 assert.equal((await teamStatus(root)).claims.length,2)
})
test('concurrent registration cannot silently overwrite another agent and stale locks fail closed',async t=>{
 const {root,second}=await repo(t)
 const results=await Promise.allSettled([teamClaim(root,request('alpha','agent-a',['src/'])),teamClaim(second,request('beta','agent-b',['src/']))])
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
 assert.equal((await teamStatus(root)).claims.length,1)
 await mkdir(join(root,'.git','gated-pipeline-team','lock'))
 await assert.rejects(teamClaim(root,request('gamma','agent-c',['docs/'])),/busy|lock/i)
})
test('invalid paths and linked state cannot write outside the shared Git state',async t=>{
 const {root}=await repo(t), outside=await fixture(t)
 for(const path of ['../outside','/tmp/file','docs//bad','src/../bad','src/*.js'])await assert.rejects(teamClaim(root,request('alpha','agent-a',[path])),/invalid/i)
 await mkdir(join(root,'.git','gated-pipeline-team'),{recursive:true})
 await symlink(join(outside,'state.json'),join(root,'.git','gated-pipeline-team','claims.json'))
 await assert.rejects(teamClaim(root,request('alpha','agent-a',['src/'])),/linked|invalid/i)
 await assert.rejects(readFile(join(outside,'state.json')))
})
