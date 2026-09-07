import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, stat, chmod, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { scaffold, defaults, ROOT, mergeSettings, mergeBlock } from '../lib/scaffold.mjs'
import { doctor } from '../lib/doctor.mjs'
import { hash, json, read, render, walk } from '../lib/files.mjs'
import { fixture, put, readJSON } from './helpers.mjs'
const install=dest=>scaffold(dest,{command:'install',tokens:{...defaults,PROJECT_SLUG:'test-project'}})
const snapshot=async dest=>Object.fromEntries(await Promise.all((await walk(dest)).map(async p=>[p,await readFile(p,'utf8')])) )
test('fresh dual-agent install initializes roles, adapters, settings and executable guards',async t=>{
 const dest=await fixture(t);await install(dest)
 for(const path of ['AGENTS.md','CLAUDE.md','.agents/skills/compound/SKILL.md','.claude/agents/developer.md','.gated-pipeline/state/developer/inbox.md','.github/pull_request_template.md'])assert.ok(await read(join(dest,path)))
 assert.equal((await stat(join(dest,'.gated-pipeline/hooks/block-push-to-main.mjs'))).mode&0o777,0o755)
 assert.equal(await read(join(dest,'.claude/rules/gates/gate-1-business-requirements.md')),null)
 const checks=await doctor(dest);assert.deepEqual(checks.errors,['Configure commands.test in pipeline.config.json'])
 const config=await readJSON(join(dest,'pipeline.config.json'));config.commands.test='node --test';await put(dest,'pipeline.config.json',json(config));assert.deepEqual((await doctor(dest)).errors,[])
})
test('reinstall preserves identity, protection, custom rules, and every byte',async t=>{
 const dest=await fixture(t);await install(dest)
 const config=await readJSON(join(dest,'.gated-pipeline.json'));config.protect=['.gated-pipeline/cards/gate-5.md'];await put(dest,'.gated-pipeline.json',json(config));await put(dest,'.gated-pipeline/cards/gate-5.md','custom rule\n')
 const before=await snapshot(dest);await install(dest);assert.deepEqual(await snapshot(dest),before)
 await scaffold(dest,{command:'sync'});assert.equal(await read(join(dest,'.gated-pipeline/cards/gate-5.md')),'custom rule\n')
})
test('sync preserves the solutions index and lesson content',async t=>{
 const dest=await fixture(t);await install(dest);await put(dest,'docs/solutions/README.md','| lesson | trigger |\n');await put(dest,'docs/solutions/SOLUTION-safety.md','learned rule\n')
 await scaffold(dest,{command:'sync'});assert.equal(await read(join(dest,'docs/solutions/README.md')),'| lesson | trigger |\n');assert.equal(await read(join(dest,'docs/solutions/SOLUTION-safety.md')),'learned rule\n')
})
test('a locally edited framework file aborts the whole sync without mutations',async t=>{
 const dest=await fixture(t);await install(dest);await put(dest,'.gated-pipeline/cards/gate-5.md','local changes\n')
 const before=await snapshot(dest);await assert.rejects(scaffold(dest,{command:'sync'}),/Sync conflicts; no files changed/);assert.deepEqual(await snapshot(dest),before)
})
test('unchanged managed baselines upgrade and repair executable permissions',async t=>{
 const dest=await fixture(t);await install(dest);const path='.gated-pipeline/cards/gate-5.md';await put(dest,path,'old upstream\n')
 const cfg=await readJSON(join(dest,'.gated-pipeline.json'));cfg.files[path].hash=hash('old upstream\n');await put(dest,'.gated-pipeline.json',json(cfg));await chmod(join(dest,'.gated-pipeline/hooks/pre-push.mjs'),0o644)
 await scaffold(dest,{command:'sync'});assert.match(await read(join(dest,path)),/Code review/);assert.equal((await stat(join(dest,'.gated-pipeline/hooks/pre-push.mjs'))).mode&0o777,0o755)
})
test('dry-run makes no files or configuration changes',async t=>{
 const dest=await fixture(t);await scaffold(dest,{command:'install',tokens:defaults,dry:true});assert.deepEqual(await walk(dest),[])
})
test('existing AGENTS and Claude settings retain unrelated configuration',async t=>{
 const dest=await fixture(t);await put(dest,'AGENTS.md','# Local rules\nKeep this.\n');await put(dest,'.claude/settings.json',json({permissions:{deny:['Bash(rm *)']},hooks:{SessionStart:[{hooks:[]}]}}));await install(dest)
 assert.match(await read(join(dest,'AGENTS.md')),/^# Local rules\nKeep this/);const settings=await readJSON(join(dest,'.claude/settings.json'));assert.deepEqual(settings.permissions,{deny:['Bash(rm *)']});assert.equal(settings.hooks.SessionStart.length,1)
 await scaffold(dest,{command:'sync'});assert.equal((await readJSON(join(dest,'.claude/settings.json'))).hooks.PreToolUse.length,1)
})
test('malformed settings cause no partially installed files',async t=>{
 const dest=await fixture(t);await put(dest,'.claude/settings.json','{');const before=await snapshot(dest);await assert.rejects(install(dest));assert.deepEqual(await snapshot(dest),before)
})
test('symlinks cannot redirect installation into another directory',async t=>{
 const dest=await fixture(t),other=await fixture(t);await symlink(other,join(dest,'.gated-pipeline'));await assert.rejects(install(dest),/symlink/);assert.deepEqual(await walk(other),[])
})
test('agent selection keeps the neutral process without Claude files',async t=>{
 const dest=await fixture(t);await scaffold(dest,{command:'install',tokens:defaults,adapters:['codex']});assert.equal(await read(join(dest,'CLAUDE.md')),null);assert.ok(await read(join(dest,'AGENTS.md')));assert.ok(await read(join(dest,'.agents/skills/compound/SKILL.md')))
})
test('project paths generate real scopes and stale scopes are diagnosed',async t=>{
 const dest=await fixture(t);await install(dest);const config=await readJSON(join(dest,'pipeline.config.json'));config.commands.test='node --test';config.paths.api=['src/api/**'];await put(dest,'pipeline.config.json',json(config));assert.ok((await doctor(dest)).errors.some(e=>/scopes/.test(e)))
 await scaffold(dest,{command:'sync'});assert.match(await read(join(dest,'.claude/rules/gated-api.md')),/src\/api/);assert.deepEqual((await doctor(dest)).errors,[])
 config.paths.api=[];await put(dest,'pipeline.config.json',json(config));await scaffold(dest,{command:'sync'});assert.equal(await read(join(dest,'.claude/rules/gated-api.md')),null)
})
async function legacyInstall(dest){
 const files=await readJSON(join(ROOT,'migrations/0.6.0.json'));const tokens={...defaults,AI_COAUTHOR:'Claude <noreply@anthropic.com>'}
 for(const [path,file]of Object.entries(files))await put(dest,path,file.text.replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>tokens[key]))
 await put(dest,'.gated-pipeline.json',json({version:'0.6.0',tokens,protect:[]}))
}
test('v0.6 migration moves eager procedures and preserves project knowledge and memory',async t=>{
 const dest=await fixture(t);await legacyInstall(dest);await put(dest,'docs/solutions/README.md','project knowledge\n');await put(dest,'.claude/pipeline/agents/developer/memory.md','historical memory\n');await scaffold(dest,{command:'sync'})
 assert.equal(await read(join(dest,'.claude/rules/gates/gate-4-developer.md')),null);assert.equal(await read(join(dest,'docs/solutions/README.md')),'project knowledge\n');assert.equal(await read(join(dest,'.gated-pipeline/state/developer/memory.md')),'historical memory\n');assert.equal(await read(join(dest,'.claude/pipeline/agents/developer/memory.md')),'historical memory\n')
})
test('v0.6 migration stops on customized legacy procedures',async t=>{
 const dest=await fixture(t);await legacyInstall(dest);await put(dest,'.claude/rules/gates/gate-4-developer.md','custom');const before=await snapshot(dest);await assert.rejects(scaffold(dest,{command:'sync'}),/Sync conflicts/);assert.deepEqual(await snapshot(dest),before)
})
test('protected missing files are not recreated',async t=>{
 const dest=await fixture(t);await install(dest);const cfg=await readJSON(join(dest,'.gated-pipeline.json'));cfg.protect=['.claude/rules/gated-api.md'];await put(dest,'.gated-pipeline.json',json(cfg));const config=await readJSON(join(dest,'pipeline.config.json'));config.paths.api=['src/**'];await put(dest,'pipeline.config.json',json(config));await scaffold(dest,{command:'sync'});assert.equal(await read(join(dest,'.claude/rules/gated-api.md')),null)
})
test('JSON rendering escapes values and block merging rejects malformed markers',()=>{
 assert.equal(JSON.parse(render('{"name":"{{PROJECT_NAME}}"}',{PROJECT_NAME:'a "quote"'},true)).name,'a "quote"')
 assert.throws(()=>mergeBlock('<!-- gated-pipeline:start -->','x','AGENTS.md'),/Malformed/)
 assert.throws(()=>mergeSettings('{"hooks":[]}'),/Invalid/)
})
test('merging settings preserves restrictive existing file permissions',async t=>{
 const dest=await fixture(t);await put(dest,'.claude/settings.json','{}\n');await chmod(join(dest,'.claude/settings.json'),0o600);await install(dest);assert.equal((await stat(join(dest,'.claude/settings.json'))).mode&0o777,0o600)
})
