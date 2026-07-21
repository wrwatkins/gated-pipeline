# Checklist — Definition of Done (pre-PR)

Canonical home for the pre-PR completion bar. Referenced by the [gate-4 card](../gates/gate-4-developer.md) (produce), the [gate-9 card](../gates/gate-9-pr-approver.md) (audit), and [`engineering.md`](../engineering.md). The gate cards own *how* each item is run/evidenced and the per-profile depth; this is the shared item-list.

A unit is done when all of the following hold (or carry a recorded, honest n/a):

1. **Tests at the right tier** — new/changed logic covered: unit (your unit runner, colocated) for pure logic; integration (your framework's route handlers + an in-memory test DB) for API routes; E2E (your e2e runner) for user flows. the core package ≥90% lines.
2. **Green locally, recorded verbatim** — your lint + typecheck + test commands (STACK.md) (and your e2e command when a flow changed). A flaky test is a FAIL, not a retry-until-green.
3. **SAST clean** — your SAST scan with no unresolved high/critical.
3b. **Structural lint clean** — the architectural-boundary linter (per `STACK.md`) passes: no layer/purity/import violations, no new cycles (PROCESS §Structural lint).
4. **Dependencies clean** — your dependency audit clean (false positives triaged in the PR, not silenced).
5. **Docs updated** — anything the change invalidates (DESIGN / ROADMAP / TASKS / ADR / PADU / README).
6. **Evidence pasted, not linked** — the PR body carries the actual output (unit tail + core coverage %, integration/E2E results or recorded n/a, your SAST tool summary, lint + typecheck). Links expire; paste.
7. **Hygiene** — conventional commits with the Claude co-author trailer; feature branch, never `main`; `README updated: yes|no — <justification>` line present.
