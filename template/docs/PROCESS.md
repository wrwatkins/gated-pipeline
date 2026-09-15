# Delivery process — shared CORE

This process works with Codex, Claude Code, other assistants and human contributors. The project's instructions and existing user authorization take precedence over shared defaults. Procedures never grant permission to message others, publish, merge or deploy. Keep secrets and personal data out of prompts, logs and evidence; use synthetic fixtures where appropriate.

## Setup and loading

Run `gated-pipeline doctor`. Configure machine-consumed commands, paths and capabilities in `pipeline.config.json`, and explain project invariants in `STACK.md`. Only documents named in the project configuration are prerequisites; create design/requirements artifacts when the work needs them. The installer initializes role inboxes and memory.

`AGENTS.md` is the shared entry point; Claude's `CLAUDE.md` imports it. Core procedures are outside native rule-discovery directories. Read this CORE, project context and only the current gate's card/role. The optional Claude and Codex adapters route to the same files; provider frontmatter and hook behavior are not portable permissions. Models use the harness/user's settings. Never substitute a provider model name into another provider's configuration.

### Context freshness and size

Run `gated-pipeline context --gate=N` for the shared/current-role reading index.
Add applicable nested instructions, source and upstream task artifacts. Read
required instructions on a fresh agent/session, after compaction, when bytes
change or when the content is no longer available in the current context.
Within one uninterrupted context, reuse already-read unchanged instructions
across gates; that allowance covers one role's repeated work in its own context,
never running two gates in one shared context (see Agent isolation). A prior snapshot measures disk freshness; it cannot certify that
an agent read or retained a file. Never omit a prerequisite to meet a size budget.

Keep full procedures outside automatic rule-discovery directories and current
status separate from historical detail. Give independent reviewers the current
SHA, scope, diff/base, relevant rules, BR/TDS, test evidence and unresolved
findings; avoid a full conversation fork for a bounded review. They still inspect
source and may request missing context. Gate order, reviewer independence and
evidence requirements are unchanged. Load the [execution-cost guide](../.gated-pipeline/guides/execution-cost.md)
when tuning a run, not at every gate.

## Gates and profiles

The canonical gate order and role/card paths are in [the registry](../.gated-pipeline/REGISTRY.json): requirements → architecture → technical design → develop → code review → test → security → operations → PR approval. Optional discovery widens alternatives before requirements when needed.

Assign and explain a profile before implementation:

- **full:** production behavior, dependencies, security, data, migrations, infrastructure or ambiguous changes.
- **docs:** only documentation content, with no execution, policy or loader changes.
- **chore:** tooling/test-only changes without production impact. Check the actual diff; instructions, CI and policy edits are not automatically harmless.
- **docs-lite:** project-opted-in ordinary prose only; two actual records (4 author, 5 independent review/verification/approval). Follow the [eligibility and evidence guide](../.gated-pipeline/guides/docs-lite.md). Policy, instructions and release/audit evidence are excluded.

For full/docs/chore, every gate is represented. Gates 1–3 may use `PASS_NA` with a concrete reason when no decision/artifact is needed. Later gates must complete their applicable checks and record `PASS` or `FAIL`; individual n/a checks need evidence and a reason. A missing/failed/skipped execution is never a passing execution. The generic validator does not infer whether a profile is honest from the diff; the reviewer and approver audit that decision.

Follow gate order of record. On rework, record a new attempt and revalidate downstream gates. Gates 5, 6 and 7 may each fan out into independent read-only dimensions internally; all dimensions must return before that one gate completes. The optional `.gated-pipeline/workflows/review-gate.mjs` accepts a caller-provided reviewer function and returns supporting reports. It is not a model runtime or an alternate route around gate prerequisites.

### Test-first

Tests come from the acceptance criteria before any production code, and they must fail first. At gate 4 the developer's first act is a red phase: write the unit-tier cases the design names, run them on the unchanged branch, commit them before the first production-code commit, and record a **red receipt** (commit, command, nonzero exit, durable output reference, test paths) on the gate-4 attempt. Before gate 4 completes, the tester authors the browser-tier or integration specs for user-visible contracts from the same criteria, runs them red, commits them, and hands the developer a red receipt attributed to the tester's own actor. Gate 3 hands off to both roles at once and the two red phases run concurrently. Gate 4 cannot complete until every red test from both authors passes on the reviewed revision. Removing an assertion from, skipping, or deleting a red test to reach green is a blocking review finding; a deliberate change needs a recorded reason confirmed by the tester. The `full` profile requires at least one red receipt; `docs` and `chore` validate one when present. Detail: [test-first guide](../.gated-pipeline/guides/tests.md).

### Concurrent gates

Running roles concurrently costs the same tokens as running them in sequence — each role reads its own context either way — so concurrency is preferred wherever surfaces do not overlap, and the saving is wall-clock. After gate 5, gates 6, 7 and 8 may run concurrently on non-overlapping test, security and operations surfaces. The order of record is unchanged: attempts are still recorded 6, then 7, then 8, and each attempt's prerequisites must already hold on the same revision when it is recorded. A concurrent gate 8 starts with the checks that need no test evidence (instrumentation, alerting, rollback, migration compatibility, infrastructure) and holds its completion for exact-head CI and gate 6's evidence; a gate-6 or gate-7 FAIL voids a concurrent gate-8 pass. Concurrent roles write separate handoffs; when more than one writes pipeline files, isolate with worktrees or sequence the commits.

### Agent isolation

Every gate runs as its own role with its own context, and the mailbox is the only channel that may carry a gate decision. Separate context is structural: invoke each role through its own adapter or subagent; never through a context-inheriting fork, which would let a reviewer see the author's reasoning instead of the artifact. Mailbox-only communication is a discipline the runtime cannot enforce: a harness passes a prompt into a role and returns its report, and the review fan-out hands its reviewer callback a target directly. That channel may carry the fact that a gate finished, never a summary of one gate's findings in place of the next gate's inbox entry. Role memory is private to its owner; anything another role must know goes in the handoff or a durable document. A handoff that exists only in a returned report did not happen: a role starts on the entry in its own inbox, and a missing entry is a failed prerequisite. This isolation is what makes independent review independent; audit it after the fact from the committed inboxes and evidence.

## Evidence and attribution

The [evidence JSON schema](../.gated-pipeline/schemas/evidence.schema.json) is the canonical record; prose is its readable view. The file identifies the unit, profile and full reviewed SHA, with an ordered list of attempts. Each attempt records gate, attempt number, result, reason, artifacts, findings and check evidence.

Every attempt names its actual actor:

```json
{
  "id": "codex-session-or-local-run-id",
  "kind": "agent",
  "tool": "codex",
  "model": null,
  "runId": null
}
```

Use `claude-code`, `codex`, or another real tool identifier for agents. For a human, use `kind: "human"`, `tool: "none"` and `model: null`; absence is not human attribution. Actor IDs identify the real participant/run and must remain stable. Models and run links are nullable when the harness does not expose them; never guess. Keep private session links out of public PRs. If multiple people/tools collaborate in a role, record separate actual attempts so all contributions survive.

For full/docs/chore, the PR body records author (gate 4), reviewer (5), verifier (6), security reviewer (7), operations verifier (8) and approver (9), along with planning roles. By default the author cannot also supply gates 5, 7 or 9 under the same actor/run. A different label on self-review is not independence; do not fabricate an identity to pass validation. Independent review remains pending when unavailable. Commit `Assistant:`/`Co-Authored-By` conventions may supplement this record, but do not prove who reviewed a PR. Attribution is auditable declaration, not cryptographic attestation.

Each check includes status (`pass`, `fail`, `na`), source (`command`, `ci`, `manual`), a durable result reference, command and exit code when executed, and a reason for n/a. Record expected suite completion, skips, environment and limitations in the referenced evidence. A command exit code alone does not establish that tests completed. Keep failed attempts and findings; resolve findings explicitly after repair.

Run checks once per relevant code revision and reuse their evidence under the [source, inventory, environment and freshness rules](../.gated-pipeline/guides/evidence-reuse.md). The validator requires completed gates on the independently supplied full SHA. When code changes, rerun affected checks and reconfirm other gates for that revision. Do not embed the final SHA into a committed evidence file on that same SHA: keep in-flight records under ignored `.gated-pipeline/evidence/`, then retain the JSON in the PR body/attachment or a durable CI artifact. Later trace records reference the completed revision.

```sh
gated-pipeline test-first --base=<base-full-SHA> --head=<reviewed-full-SHA>
gated-pipeline check .gated-pipeline/evidence/unit.json --head=<reviewed-full-SHA> --base=<base-full-SHA> --through=8
gated-pipeline pr-body .gated-pipeline/evidence/unit.json --head=<reviewed-full-SHA> --through=8 > pr-body.md
```

For full/docs/chore, `check` defaults to gates 1–9; `pr-body` defaults to 1–8 because approval follows review. After gate 9, rerender with `--through=9` to preserve approver attribution. `test-first` reads Git alone (tests precede production code; no red test lost an assertion, gained a skip marker or was deleted), so CI can run it on every branch without an evidence file; `check --base` additionally binds each recorded red receipt to the branch. Commands validate declared records and commit history; they do not execute project checks, judge whether a test proves its criterion, or independently authenticate a CI run. Real CI must run the project's checks, and an independent reviewer must assess evidence quality.

## Branch and merge

Use separate branches/worktrees for concurrent writers. Land changes via reviewed PRs. Install the optional shared Git guard with `gated-pipeline hooks`; it works for both assistants and humans, including linked worktrees, and refuses unrelated existing hooks/custom hooksPath. Claude also has an early Bash guard installed through project settings. Codex does not execute Claude hooks. Local hooks are bypassable and cannot block remote API merges; never claim otherwise.

Use server-side branch protection and required checks when available. Verify exact configured CI check names, conclusions and the reviewed SHA. On GitHub, bind an authorized merge with `gh pr merge <number> --squash --match-head-commit <reviewed-full-SHA>`. An approval posted by a transport bot is not evidence of an independent review. No direct main-branch bookkeeping commits.

## Handoffs and durable knowledge

Role homes are `.gated-pipeline/state/<role>/`. Read current inbox/memory before work, append a dated handoff with unit, sender, recipient and evidence reference on completion, and update working state. Resolve a message without deleting its history. Move archived material with verified byte preservation; retain the original evidence. Durable constraints live in project documents rather than only an inbox.

At planning, read the solution index and relevant lessons. At completion, capture a reusable lesson only when the work taught one. `docs/solutions/README.md` is project-owned. No filler entries are required.

Record post-merge events and lessons on the next bookkeeping/delivery PR as explicit obligations; never push directly to the protected branch to close the loop. Mark any gap pending until the record lands. Local-only units keep their evidence but do not invent a PR number or advance a merged-PR cadence.

## Cadence and measurement

The registry defines intervals; project capabilities enable optional dependency, performance, accessibility and SEO reviews. `gated-pipeline cadence` reads GitHub's exact merged-PR count, or accepts an explicitly supplied count. `cadenceBaseline` is the observed count when adopting the process; it does not certify earlier compliance. Completion events must reference real reports. Missing earlier boundaries stay due until recorded as completed.

Trace events are described in [docs/traces/README.md](traces/README.md). Preserve unknown historical results. Compare merge coverage before interpreting catch/rework rates; a small or incomplete sample cannot establish model superiority or zero defects. Pipeline improvements follow the same review process.
