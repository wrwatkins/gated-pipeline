# Gate 4 — Developer

Agent: `developer` · Model tier: **sonnet** (verification gate; default; opus override for feature sprints when synthesis is required — recorded with reason).

## Exit criterion

Implementation + tests; `lint`/`typecheck`/`test` green locally (recorded verbatim); docs updated.

## Artifact

Feature branch / diff

## Profile behaviour

- **All profiles:** gate 4 runs unchanged under every profile (gates 4–9 never exit N/A).
- **Disposition form** — on artifact-is-the-deliverable PRs (e.g. docs built, data extracted, checks assembled), gate 4 still exits with a discrete literal `GATE: 4` block recording what was assembled/validated and how. Never silence; prose-only records need explicit gate-5 sign-off.
- **Chore profile:** disposition form applies on artifact-is-the-deliverable diffs.

## Procedure

Implement exactly the TDS — no scope creep. If the TDS is wrong or incomplete, FAIL back to tech-design's inbox with specifics rather than improvising.

- Tests land with the code: unit (your unit runner, colocated) for core logic; integration for API routes (S1+); extend E2E when a user flow changes.
- the core package stays pure (no I/O); the date-handling invariant your project sets (see STACK.md).
- Match existing idioms; comments only for constraints the code can't express.
- Conventional commits ending with `Co-Authored-By: {{AI_COAUTHOR}}`; feature branch, never main.
- **Before exiting, run and record verbatim:** your lint + typecheck + test commands (STACK.md) (and your e2e command when flows changed).
- Update docs your change invalidates (DESIGN, ROADMAP, TASKS).

Exit against the shared **Definition of Done** — [`.claude/rules/checklists/definition-of-done.md`](../checklists/definition-of-done.md): the pre-PR completion bar this gate produces and gate 9 audits.

**Scans to keep green before PR** (CORE one-line pointer): your SAST scan; ESLint (`next/core-web-vitals` + `next/typescript`) and `tsc --noEmit`; your dependency audit. Detail in gate-7 card.

**Test tier detail** (CORE one-line pointer): in gate-3 card.

## Prereqs

An approved TDS with a test plan, plus the gate-2/3 handoffs. On missing: `prereq-missing` to the responsible inbox, exit FAIL.

## Handoff

Append a `handoff` message with the gate exit block to `.claude/pipeline/agents/code-reviewer/inbox.md`. Bugs found in others' territory → their inbox.
