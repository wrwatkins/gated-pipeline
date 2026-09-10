# Command and workflow reference

Start with [installation and the repository overview](README.md). Load the
section needed for the current operation; these commands make no model calls.

## AI-first repository contract

The scaffold gives nine areas a project-owned home: standards, business/context stores,
versioned specialized prompts, orchestration, audit, PII/security, human RACI,
adoption/ROI metrics and cost governance. [The repository map](template/docs/AI_REPOSITORY.md)
routes to each policy without loading them all into every task. Existing gate and
PR evidence contracts remain authoritative.

```sh
npx gated-pipeline governance --json
npx gated-pipeline cost-check usage.json --json
```

`ai-repository.json` declares the area homes and accountable owners. The governance
command checks the map, pinned prompt bytes, structured audit events and cost
policy. Project policy/docs, prompt registry and audit data survive sync; schema
updates remain framework-managed. Assign owners and complete project decisions
before claiming adoption. The validator does not certify compliance or authenticate
records. Privacy guidance covers PII, secrets, access, retention and agent boundaries.

`cost-policy.json` defines optional model routes and per-unit budgets. `cost-check`
compares recorded usage with configured limits; unknown required measurements and
exceeded budgets exit nonzero. It never calls models, meters a session, modifies
personal settings or caps live spending. CI/harness integration makes these checks
blocking. [Cost policy details](template/docs/cost/README.md) explain units and limits.


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
The generated shared CORE and both adapters use these same freshness rules;
installation tests keep the managed bootstrap small and all nine plans scoped.

[Execution guidance](template/.gated-pipeline/guides/execution-cost.md) covers
model/effort selection by task risk, bounded independent-review context,
single-run evidence reuse and measuring acceptance cost including rework.
It makes no model calls, changes no personal settings and claims no measured
subscription savings from document sizes alone.


## Local review and team coordination

The `merge-readiness` skill routes both agents to one local procedure. Its
portable helper rejects stale/self-review receipts and missing named checks,
wrong publishers, incomplete results and undocumented skips. `merge-policy.json`
starts unconfigured and is project-owned; fill it with the exact expected job
names. The skill binds authorized merges to the reviewed commit. No approval bot,
hosted AI reviewer or new Actions job is installed.

The `team-coordination` skill supports multiple leads in isolated worktrees.
Task/path/resource claims live in the shared Git common directory, with atomic
updates and collision checks. Reserve a single merge/deployment coordinator and
use distinct document identifiers. Claims are advisory, local to linked worktrees,
and require adoption by each writer; they do not authenticate agents or imply
that an unregistered worktree is idle. No background agent or watcher is started.


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

