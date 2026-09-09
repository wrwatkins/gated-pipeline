# gated-pipeline

File-based delivery gates for Codex, Claude Code, other coding assistants and human contributors. Shared procedures, attributed PR evidence, safe framework updates, and setup diagnostics. Node 18+; no runtime packages, hosted service or model API calls.

## Install

From your project root, using a checkout of this repository:

```sh
node /path/to/gated-pipeline/bin/install.mjs install --yes --slug=my-app --name="My App"
```

Or install the package from GitHub, then use its CLI:

```sh
npm install --save-dev github:wrwatkins/gated-pipeline
npx gated-pipeline install --yes --slug=my-app --name="My App"
```

The default installs both adapters. `--agents=codex`, `--agents=claude`, or `--agents=none` selects a narrower setup. `AGENTS.md` always provides the shared entry point; Claude imports it through `CLAUDE.md`. Existing instructions are preserved outside an explicitly marked managed block. Skills have small native entry points pointing to shared procedures.

Edit `pipeline.config.json` for commands, required checks, paths, protected branches and optional capabilities. Write project invariants and context in `STACK.md`, then run:

```sh
npx gated-pipeline doctor
npx gated-pipeline hooks           # optional shared Git pre-push guard
npx gated-pipeline hooks --check
```

A fresh scaffold deliberately reports an unconfigured test command until you supply one. `doctor` validates local setup; it does not assert that remote branch protection exists, CI passed, or an assistant loaded every instruction. The Git hook installer refuses conflicting hooks, symlinked hook paths and custom `core.hooksPath` instead of replacing existing safeguards.

## One process across agents

The nine roles are requirements → architecture → technical design → develop → code review → test → security → operations → approval. An optional discovery role precedes requirements. Profiles (`full`, `docs`, `chore`) vary applicable work; all nine gates remain represented and each no-op needs a reason. See [PROCESS](template/docs/PROCESS.md).

Provider-neutral cards, roles, guides, schemas and orchestration live in `.gated-pipeline/`. Only applicable path-scoped Claude rules are generated under `.claude/rules/`. Codex uses `AGENTS.md` routing. Neither provider inherits the other's models, tool names or hook permissions. Models follow the current user/harness settings.

The optional [review fan-out module](template/.gated-pipeline/workflows/review-gate.mjs) runs dimensions *within* gates 5, 6 or 7 using a caller-supplied reviewer function. Missing, failed, stale, malformed or timed-out results fail the aggregate. It does not invoke a paid service or substitute a performance inspection for the testing gate.

## Model and context costs

```sh
npx gated-pipeline context --gate=4
npx gated-pipeline context --gate=4 --json > context-snapshot.json
npx gated-pipeline context --gate=5 --previous=context-snapshot.json --budget-bytes=65536
```

The metadata-only index lists shared instructions and the selected gate's files,
with byte counts and hashes. Other gates' procedures stay deferred; file bodies
are never printed. Missing required files fail, optional absences are explicit,
and a budget warning never removes required instructions. Edit the project-owned
`.gated-pipeline/context.json` to route local procedures; sync preserves it.
Snapshots compare disk content, not what an agent actually read or retained.
Fresh sessions and compaction still require reacquiring applicable instructions.

[Execution guidance](template/.gated-pipeline/guides/execution-cost.md) covers
model/effort selection by task risk, bounded independent-review context,
single-run evidence reuse and measuring acceptance cost including rework.
It makes no model calls, changes no personal settings and claims no measured
subscription savings from document sizes alone.

## Attributed PR evidence

Every gate attempt records its actual actor, tool, model when exposed, run reference when available, reviewed commit, findings and check evidence. The schema accepts any real agent tool identifier. Human work explicitly uses `kind: "human"`, `tool: "none"`; missing fields do not silently become human attribution. Model/run metadata is explicitly `null` when unavailable.

```sh
npx gated-pipeline check .gated-pipeline/evidence/unit.json --head=<full-reviewed-SHA> --through=8
npx gated-pipeline pr-body .gated-pipeline/evidence/unit.json --head=<full-reviewed-SHA> > pr-body.md
```

The generated PR section identifies the author, code reviewer, test verifier, security reviewer and operations verifier, with their outcomes. Record approval afterward and rerender with `--through=9`. Both commands retain failed attempts. No PR is created or posted by these commands.

`check` validates schema, gate prerequisites, revision consistency, required evidence and declared independent-review identities. It rejects missing attribution, stale evidence, explicit FAILs, unresolved blockers, invalid N/A results and rework that invalidates later gates. By default, author and reviewer/approver runs must differ. It cannot authenticate an actor's identity, decide whether a test is meaningful, or prove that a claimed CI run happened. Keep the original logs and use real CI plus independent review.

The [complete examples](examples/README.md) show a Node CLI and a Python library, including mixed-agent evidence fixtures. Fixture attribution is labeled synthetic; it is not a claim that agents actually reviewed the examples.

## What is enforced

- Installer/sync: local edits and project state are preserved; conflicting framework updates stop before any files change.
- Evidence command: invalid or incomplete records exit nonzero. The project must run this command as part of its workflow to make it blocking.
- Shared Git guard: blocks actual protected destination refs when installed, regardless of agent; local hooks can be bypassed and do not cover API merges.
- Claude guard: provides early feedback for supported Bash push forms when project hooks are trusted/enabled. Codex does not run it.
- Remote merge control: configure server-side required checks and branch protection. The scaffold does not configure GitHub permissions or install stack-specific scanners automatically.

GitHub Free supports protected public repositories. Where available, protect the default branch and require the relevant project jobs. For an authorized GitHub merge, `--match-head-commit` binds the action to the reviewed revision. [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [merge command](https://cli.github.com/manual/gh_pr_merge).

See [the CI integration example](examples/ci/README.md) for wiring the evidence checker without running untrusted PR code in a privileged workflow. The repository's own CI runs tests and template/package checks on pushes and PRs.

## Safe updates and migration

```sh
npx gated-pipeline sync --dry-run
npx gated-pipeline sync
```

`.gated-pipeline.json` records installed framework hashes, identity tokens, selected adapters and protected paths. Reinstall preserves an existing installation. Sync updates an unchanged managed file; it stops on local modifications. Add exact paths or directory prefixes ending in `/` to `protect`, or move project overrides out of framework files. Protected paths are never recreated. Instructions outside the managed AGENTS/CLAUDE blocks, project configuration, lesson indexes and role state remain project-owned.

The included v0.6 snapshot permits safe migration of unchanged legacy templates. Old eager-loaded cards/rules are removed only when their bytes match the installed baseline; customized legacy files stop migration for review. Existing agent inbox/memory files are copied into the neutral state homes and their originals retained. Recognized legacy Bash push-guard registrations migrate with the script; unfamiliar references, project-local settings registrations, or protected settings that would retain a broken reference stop sync before writes. Protect the legacy script as well if its registration must remain. Unknown older/customized versions are not blindly overwritten. User-edited project artifacts are never rewritten to match new examples. `doctor` flags stale legacy procedures left in the eager rule tree.

Each file is replaced atomically; ordinary write failures roll back applied file changes. Keep the target checkout idle while syncing. This is not a crash-proof multi-file database transaction; inspect the resulting Git diff before committing.

## Lessons and cadence

Capture useful lessons under `docs/solutions/` and recall them before planning. The project owns the index; updates preserve it. Trace observations append to `docs/traces/events.jsonl`; later escapes are separate events instead of edits to historical merges.

```sh
npx gated-pipeline cadence             # exact GitHub totalCount through gh
npx gated-pipeline cadence --count=41 --json
```

Set `cadenceBaseline` to the observed merged count when adopting the process. The registry owns review intervals; configuration enables optional web/dependency dimensions. Completed boundaries need report-backed events. Missing historical records stay unknown; no compliance or improvement is inferred from absent evidence.

## Development

```sh
npm test
npm run check
```

Tests cover destructive-update regressions, v0.6 migration, hook refusal/allow cases, CLI behavior, attribution, evidence failure modes, cadence and workflow errors. Package checks verify that hidden adapter directories and executable assets ship. No live model calls, production services or paid reviews are needed to run this suite.

MIT license. [Migration notes](GENERALIZATION-NOTES.md).
