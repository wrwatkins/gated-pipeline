# Checklist — Code review dimensions

Canonical home for the gate-5 review dimensions ([ADR-024](../../../docs/decisions/ADR-024-shared-checklist-primitives.md)). Read by the [gate-5 card](../gates/gate-5-code-reviewer.md) and by any code-review fan-out dimension-checker (ADR-016). Severity ladder, profile behaviour, and handoff live in the gate-5 card, not here.

Hunt specifically:

- **Logic errors, unhandled edges** — null history; timezone drift (this is a UTC-midnight-only codebase); VIN charset / check-digit paths; month-end date math.
- **Invariant violations:**
  - `packages/core` purity — no `fetch`/db/fs in core.
  - Idempotent sends — `dedupe_key` respected; a re-run sends nothing twice.
  - Signed tokens — single-purpose, expiring, constant-time compare.
  - Trust guardrails — max one sponsored slot per surface; user data leaves only on explicit click (no passive sharing).
- **Drift & waste** — divergence from the TDS; silent scope creep; needless abstraction; dead code.
- **Tests** — missing or vacuous tests (asserting nothing; testing mocks instead of behaviour); logic not covered at its appropriate tier (unit / integration / E2E).

Every finding: `file:line — what — why it matters — concrete fix`.
