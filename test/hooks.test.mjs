import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { chmod, readFile } from 'node:fs/promises'
import { inspectInvocation } from '../template/.gated-pipeline/hooks/block-push-to-main.mjs'
import { gitHooks } from '../lib/hooks.mjs'
import { TEMPLATE } from '../lib/scaffold.mjs'
import { fixture, put, project } from './helpers.mjs'
const inspect=command=>inspectInvocation({tool_name:'Bash',tool_input:{command}},['main','master'])
for(const command of ['git push origin main','git push','git push origin','git push origin HEAD:refs/heads/main','git -C . push origin main','true && git push','git push --all origin','git push origin :main','git push origin +HEAD:main','gh pr merge 1 --admin','git push origin HEAD','git push --no-verify origin feature'])test(`guard blocks ${command}`,()=>assert.ok(inspect(command)))
for(const command of ['git push origin feature','git push origin main-fix','git push origin HEAD:feature','git push --force-with-lease origin feature','npm test'])test(`guard allows ${command}`,()=>assert.equal(inspect(command),null))
test('malformed hook input exits with a blocking code',()=>{const r=spawnSync(process.execPath,[join(TEMPLATE,'.gated-pipeline/hooks/block-push-to-main.mjs')],{input:'{',encoding:'utf8'});assert.equal(r.status,2)})
test('shared Git guard operates on actual destination refs, including deletion',async t=>{
 const dest=await fixture(t);assert.equal(spawnSync('git',['init','--initial-branch=main',dest]).status,0);await put(dest,'pipeline.config.json',JSON.stringify(await project()));await gitHooks(dest)
 const script=join(dest,'.git/hooks/pre-push')
 for(const line of ['HEAD abc refs/heads/main def\n','(delete) 000 refs/heads/main def\n']){const r=spawnSync(process.execPath,[script],{cwd:dest,input:line,encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/prohibited/)}
 assert.equal(spawnSync(process.execPath,[script],{cwd:dest,input:'HEAD abc refs/heads/main-fix def\n'}).status,0)
 assert.match(await gitHooks(dest,{check:true}),/installed/)
 await chmod(script,0o644);await assert.rejects(gitHooks(dest,{check:true}),/executable/)
})
test('Git hook installation refuses unrelated hooks and custom hooksPath',async t=>{
 const dest=await fixture(t);spawnSync('git',['init',dest]);await put(dest,'.git/hooks/pre-push','#!/bin/sh\nexit 0\n');await assert.rejects(gitHooks(dest),/differs/);assert.equal(await readFile(join(dest,'.git/hooks/pre-push'),'utf8'),'#!/bin/sh\nexit 0\n')
 spawnSync('git',['config','core.hooksPath','custom-hooks'],{cwd:dest});await assert.rejects(gitHooks(dest),/core.hooksPath/)
})
