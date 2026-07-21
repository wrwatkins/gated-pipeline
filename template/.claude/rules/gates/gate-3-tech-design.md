# Gate 3 — Technical Design

Agent: `tech-design` · Model tier: **sonnet** (verification gate; default).

## Exit criterion

TDS: approach + alternatives, schema/API deltas, placement, per-tier test plan with named cases, security + ops notes, PADU check.

## Artifact

`docs/design/TDS-###.md` (+ ADRs)

## Profile behaviour

- **Full / docs / chore:** gate 3 exits `PASS (N/A — gate has no object)` on owner-directed tooling/process changes where the complete spec is already determined by the BR + architecture ADR. The recorded reason is audited at gate 9.
- Block carrier: gate-3 block may be delivered in the PR body when the gate-3 artifact is the architect's gate-2 ADR carrying the binding inventory.
- Combined `GATE: 1–3` block sanctioned when all three share one reason.

## Procedure

Produce `docs/design/TDS-<next>-<slug>.md` from TDS-000-template.md:

- Approach + alternatives with grounded tradeoffs (say plainly why the losers lose; no cheerleading).
- Data-model delta (expand→migrate→contract), API delta (your API routes, authz per route).
- Placement: the core package (pure, with your date-handling invariant) vs the app vs the db package — respect the architect's constraints verbatim.
- Test plan per tier with **named cases** (unit / integration / E2E).
- Security: authz, input validation, token handling, rate limits, PII touchpoints.
- Ops: your analytics events, structured logs, alarms, rollback, cron/idempotency implications.
- PADU check: *Acceptable*-tier tech gets a one-line justification; *Discouraged* gets an ADR.

If the BR or architecture verdict is unbuildable or underspecified, FAIL back with specifics rather than improvising.

## Test tiers detail (CORE one-line pointer)

- **Unit** — your unit runner, colocated tests, across all packages. the core package ≥90%-lines coverage gate.
- **Integration / functional** — your unit runner invoking actual your framework's route handlers against an in-memory test DB with committed migrations (your test-DB helpers). Active since S1.
- **E2E** — your e2e runner in your e2e test dir, serial convention (`workers: 1`, `fullyParallel: false`, `retries: 0`), pinned alphabetical spec order load-bearing (fixture state shared). Growth path (per-spec isolation) before ~40 tests.

## Prereqs

BR with numbered ACs **and** a gate-2 architecture verdict with constraints. On missing: `prereq-missing` to the responsible inbox (business-requirements or architect), exit FAIL.

## Handoff

Append a `handoff` message with the gate exit block to `.claude/pipeline/agents/developer/inbox.md`.
