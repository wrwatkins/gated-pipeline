import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { parseArgs } from '../bin/install.mjs'
import { fixture, run, put, project, record, sha } from './helpers.mjs'
import { read, json } from '../lib/files.mjs'
test('help is read-only even with --yes',async t=>{const dest=await fixture(t);const r=run(['--help','--yes'],dest);assert.equal(r.status,0);assert.match(r.stdout,/agent-neutral/);assert.equal(await read(join(dest,'.gated-pipeline.json')),null)})
test('noninteractive install fails before writes when identity is incomplete',async t=>{const dest=await fixture(t);const r=run([],dest);assert.equal(r.status,1);assert.match(r.stderr,/Non-interactive/);assert.equal(await read(join(dest,'.gated-pipeline.json')),null)})
test('documented identity flags do not prompt for an omitted optional domain',async t=>{const dest=await fixture(t);const r=run(['--slug=my-app','--name=My App','--coauthor=Claude <noreply@anthropic.com>'],dest);assert.equal(r.status,0);assert.ok(await read(join(dest,'.gated-pipeline.json')))})
for(const args of [['wat'],['--slgu=x'],['sync','--yes'],['--slug'],['--yes=false'],['--yes','--yes'],['sync','one','two'],['test-first','--through=3'],['test-first','one','two']])test(`invalid CLI ${args.join(' ')} is rejected`,()=>assert.throws(()=>parseArgs(args)))
test('quoted slug cannot produce malformed registry JSON',async t=>{const dest=await fixture(t);const r=run(['--yes','--slug=a"b'],dest);assert.equal(r.status,1);assert.equal(await read(join(dest,'.gated-pipeline.json')),null)})
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
const commit=(root,message)=>{git(root,'add','-A');git(root,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-q','--allow-empty','-m',message);return git(root,'rev-parse','HEAD')}
test('test-first inspects the branch without an evidence file',async t=>{
 const dest=await fixture(t);git(dest,'init','-q','--initial-branch=main');assert.equal(run(['--yes'],dest).status,0);const p=await project();p.paths.tests=['test/'];await put(dest,'pipeline.config.json',json(p));const base=commit(dest,'chore: scaffold')
 await put(dest,'test/add.test.mjs','test("x",()=>assert.ok(add()))\n');commit(dest,'test: red');await put(dest,'src/add.mjs','export const add=()=>1\n');const head=commit(dest,'feat: add')
 let r=run(['test-first',`--base=${base}`,`--head=${head}`],dest);assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/passed/)
 await put(dest,'src/more.mjs','export const more=1\n');const bad=commit(dest,'feat: more');await put(dest,'test/more.test.mjs','test("y",()=>assert.ok(1))\n');const late=commit(dest,'test: late')
 r=run(['test-first',`--base=${head}`,`--head=${late}`,'--json'],dest);assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).ok,false)
})
test('check binds red receipts to the branch when --base is supplied',async t=>{
 const dest=await fixture(t);git(dest,'init','-q','--initial-branch=main');assert.equal(run(['--yes'],dest).status,0);const p=await project();p.paths.tests=['test/'];await put(dest,'pipeline.config.json',json(p));const base=commit(dest,'chore: scaffold')
 await put(dest,'test/add.test.mjs','test("x",()=>assert.ok(add()))\n');const red=commit(dest,'test: red');await put(dest,'src/add.mjs','export const add=()=>1\n');const head=commit(dest,'feat: add')
 const r=record();r.headSha=head;for(const a of r.attempts)a.headSha=head;r.attempts[3].redReceipts[0].commit=red;r.attempts[3].redReceipts[0].tests=['test/add.test.mjs'];await put(dest,'evidence.json',json(r))
 let c=run(['check','evidence.json',`--head=${head}`,`--base=${base}`],dest);assert.equal(c.status,0,c.stderr)
 r.attempts[3].redReceipts[0].tests=['test/other.test.mjs'];await put(dest,'evidence.json',json(r));c=run(['check','evidence.json',`--head=${head}`,`--base=${base}`],dest);assert.equal(c.status,1);assert.match(c.stderr+c.stdout,/not touched/)
})
test('check/pr-body use a separate full head SHA and expose actual attribution',async t=>{
 const dest=await fixture(t);assert.equal(run(['--yes'],dest).status,0);await put(dest,'pipeline.config.json',json(await project()));await put(dest,'evidence.json',json(record()))
 const r=run(['check','evidence.json',`--head=${sha}`,'--json'],dest);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).valid,true)
 const body=run(['pr-body','evidence.json',`--head=${sha}`],dest);assert.equal(body.status,0,body.stderr);assert.match(body.stdout,/codex/);assert.match(body.stdout,/claude-code/)
 assert.equal(run(['check','evidence.json','--head='+'b'.repeat(40)],dest).status,1)
})
