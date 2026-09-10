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
across gates. A prior snapshot measures disk freshness; it cannot certify that
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

Every gate is represented. Gates 1–3 may use `PASS_NA` with a concrete reason when no decision/artifact is needed. Later gates must complete their applicable checks and record `PASS` or `FAIL`; individual n/a checks need evidence and a reason. A missing/failed/skipped execution is never a passing execution. The generic validator does not infer whether a profile is honest from the diff; the reviewer and approver audit that decision.

Follow gate order. On rework, record a new attempt and revalidate downstream gates. Gates 5, 6 and 7 may each fan out into independent read-only dimensions internally; all dimensions must return before that one gate completes. The optional `.gated-pipeline/workflows/review-gate.mjs` accepts a caller-provided reviewer function and returns supporting reports. It is not a model runtime or an alternate route around gate prerequisites. Gate 8 remains sequential.

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

The PR body records author (gate 4), reviewer (5), verifier (6), security reviewer (7), operations verifier (8) and approver (9), along with planning roles. By default the author cannot also supply gates 5, 7 or 9 under the same actor/run. A different label on self-review is not independence; do not fabricate an identity to pass validation. Independent review remains pending when unavailable. Commit `Assistant:`/`Co-Authored-By` conventions may supplement this record, but do not prove who reviewed a PR. Attribution is auditable declaration, not cryptographic attestation.

Each check includes status (`pass`, `fail`, `na`), source (`command`, `ci`, `manual`), a durable result reference, command and exit code when executed, and a reason for n/a. Record expected suite completion, skips, environment and limitations in the referenced evidence. A command exit code alone does not establish that tests completed. Keep failed attempts and findings; resolve findings explicitly after repair.

Run checks once per relevant code revision and reuse their evidence. The validator requires completed gates on the independently supplied full SHA. When code changes, rerun affected checks and reconfirm other gates for that revision. Do not embed the final SHA into a committed evidence file on that same SHA: keep in-flight records under ignored `.gated-pipeline/evidence/`, then retain the JSON in the PR body/attachment or a durable CI artifact. Later trace records reference the completed revision.

```sh
gated-pipeline check .gated-pipeline/evidence/unit.json --head=<reviewed-full-SHA> --through=8
gated-pipeline pr-body .gated-pipeline/evidence/unit.json --head=<reviewed-full-SHA> --through=8 > pr-body.md
```

`check` defaults to gates 1–9; `pr-body` defaults to 1–8 because approval follows review. After gate 9, rerender with `--through=9` to preserve approver attribution. Commands validate declared records; they do not execute project checks or independently authenticate a CI run. Real CI must run the project's checks, and an independent reviewer must assess evidence quality.

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
