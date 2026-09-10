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


## Choose the context you need

The scaffold gives standards, context, versioned prompts, orchestration, audit,
PII/security, human RACI, metrics and cost governance their own project-owned
homes. [The repository map](template/docs/AI_REPOSITORY.md) routes to them.
Keep GitHub's existing deterministic CI and local independent reviews; the
framework installs no approval bot, hosted reviewer or background agent.

| Task | Read on demand |
|---|---|
| Configure ownership, prompts, audit and budget policy | [AI-first contract](CLI.md#ai-first-repository-contract) |
| Select models, scope context and compare snapshots | [Model and context costs](CLI.md#model-and-context-costs) |
| Coordinate leads and check current-commit reviews | [Local review and team coordination](CLI.md#local-review-and-team-coordination) |
| Validate evidence and generate PR attribution | [Attributed PR evidence](CLI.md#attributed-pr-evidence) |
| Understand checks and their limits | [What is enforced](CLI.md#what-is-enforced) |
| Upgrade an existing scaffold safely | [Updates and migration](CLI.md#safe-updates-and-migration) |
| Record lessons and schedule evidence-based reviews | [Lessons and cadence](CLI.md#lessons-and-cadence) |

The [complete examples](examples/README.md) cover Node and Python projects with
explicitly synthetic mixed-agent evidence. The [CI integration example](examples/ci/README.md)
shows how to make checks blocking without privileged execution of untrusted PR
code. Metadata describes declared evidence; retain the actual test logs and
independent review. Document byte counts are not measured token or cost savings.

## Development

```sh
npm test
npm run check
```

Tests cover the nine-area contract, prompt fingerprints, audit privacy boundaries, unknown/exceeded cost checks, destructive-update regressions, v0.6 migration, hook refusal/allow cases, CLI behavior, attribution, evidence failure modes, cadence and workflow errors. Package checks verify that hidden adapter directories and executable assets ship. No live model calls, production services or paid reviews are needed to run this suite.

MIT license. [Migration notes](GENERALIZATION-NOTES.md).
