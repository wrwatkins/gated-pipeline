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
- Data-model delta (expand→migrate→contract), API delta (`/api/v1`, authz per route).
- Placement: `packages/core` (pure, UTC-midnight math) vs `apps/web` vs `packages/db` — respect the architect's constraints verbatim.
- Test plan per tier with **named cases** (unit / integration / E2E).
- Security: authz, input validation, token handling, rate limits, PII touchpoints.
- Ops: PostHog events, structured logs, alarms, rollback, cron/idempotency implications.
- PADU check: *Acceptable*-tier tech gets a one-line justification; *Discouraged* gets an ADR.

If the BR or architecture verdict is unbuildable or underspecified, FAIL back with specifics rather than improvising.

## Test tiers detail (CORE one-line pointer)

- **Unit** — Vitest, colocated `*.test.ts`, across all packages. `packages/core` ≥90%-lines coverage gate.
- **Integration / functional** — Vitest invoking actual Next route handlers against PGlite with committed migrations (`@{{PROJECT_SLUG}}/db/test-helpers`). Active since S1.
- **E2E** — Playwright in `apps/web/e2e/`, serial convention (`workers: 1`, `fullyParallel: false`, `retries: 0`), pinned alphabetical spec order load-bearing (fixture state shared). Growth path (per-spec isolation) before ~40 tests.

## Prereqs

BR with numbered ACs **and** a gate-2 architecture verdict with constraints. On missing: `prereq-missing` to the responsible inbox (business-requirements or architect), exit FAIL.

## Handoff

Append a `handoff` message with the gate exit block to `.claude/pipeline/agents/developer/inbox.md`.
