import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { parseArgs } from '../bin/install.mjs'
import { fixture, run, put, project, record, sha } from './helpers.mjs'
import { read, json } from '../lib/files.mjs'
test('help is read-only even with --yes',async t=>{const dest=await fixture(t);const r=run(['--help','--yes'],dest);assert.equal(r.status,0);assert.match(r.stdout,/agent-neutral/);assert.equal(await read(join(dest,'.gated-pipeline.json')),null)})
test('noninteractive install fails before writes when identity is incomplete',async t=>{const dest=await fixture(t);const r=run([],dest);assert.equal(r.status,1);assert.match(r.stderr,/Non-interactive/);assert.equal(await read(join(dest,'.gated-pipeline.json')),null)})
test('documented identity flags do not prompt for an omitted optional domain',async t=>{const dest=await fixture(t);const r=run(['--slug=my-app','--name=My App','--coauthor=Claude <noreply@anthropic.com>'],dest);assert.equal(r.status,0);assert.ok(await read(join(dest,'.gated-pipeline.json')))})
for(const args of [['wat'],['--slgu=x'],['sync','--yes'],['--slug'],['--yes=false'],['--yes','--yes'],['sync','one','two']])test(`invalid CLI ${args.join(' ')} is rejected`,()=>assert.throws(()=>parseArgs(args)))
test('quoted slug cannot produce malformed registry JSON',async t=>{const dest=await fixture(t);const r=run(['--yes','--slug=a"b'],dest);assert.equal(r.status,1);assert.equal(await read(join(dest,'.gated-pipeline.json')),null)})
test('check/pr-body use a separate full head SHA and expose actual attribution',async t=>{
 const dest=await fixture(t);assert.equal(run(['--yes'],dest).status,0);await put(dest,'pipeline.config.json',json(await project()));await put(dest,'evidence.json',json(record()))
 const r=run(['check','evidence.json',`--head=${sha}`,'--json'],dest);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).valid,true)
 const body=run(['pr-body','evidence.json',`--head=${sha}`],dest);assert.equal(body.status,0,body.stderr);assert.match(body.stdout,/codex/);assert.match(body.stdout,/claude-code/)
 assert.equal(run(['check','evidence.json','--head='+'b'.repeat(40)],dest).status,1)
})
