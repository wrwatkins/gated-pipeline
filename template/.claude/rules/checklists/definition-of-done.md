# Checklist — Definition of Done (pre-PR)

Canonical home for the pre-PR completion bar ([ADR-024](../../../docs/decisions/ADR-024-shared-checklist-primitives.md)). Referenced by the [gate-4 card](../gates/gate-4-developer.md) (produce), the [gate-9 card](../gates/gate-9-pr-approver.md) (audit), and [`engineering.md`](../engineering.md). The gate cards own *how* each item is run/evidenced and the per-profile depth; this is the shared item-list.

A unit is done when all of the following hold (or carry a recorded, honest n/a):

1. **Tests at the right tier** — new/changed logic covered: unit (Vitest, colocated) for pure logic; integration (Next route handlers + PGlite) for API routes; E2E (Playwright) for user flows. `packages/core` ≥90% lines.
2. **Green locally, recorded verbatim** — `pnpm lint && pnpm typecheck && pnpm test` (and `pnpm test:e2e` when a flow changed). A flaky test is a FAIL, not a retry-until-green.
3. **SAST clean** — Semgrep (`p/default` + `p/typescript` + `p/owasp-top-ten`) with no unresolved high/critical.
4. **Dependencies clean** — `pnpm audit --prod --audit-level high` clean (false positives triaged in the PR, not silenced).
5. **Docs updated** — anything the change invalidates (DESIGN / ROADMAP / TASKS / ADR / PADU / README).
6. **Evidence pasted, not linked** — the PR body carries the actual output (unit tail + core coverage %, integration/E2E results or recorded n/a, Semgrep summary, lint + typecheck). Links expire; paste.
7. **Hygiene** — conventional commits with the Claude co-author trailer; feature branch, never `main`; `README updated: yes|no — <justification>` line present.
