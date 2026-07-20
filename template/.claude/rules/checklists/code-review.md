# Checklist — Code review dimensions

Canonical home for the gate-5 review dimensions (ADR-024 pattern). Read by the [gate-5 card](../gates/gate-5-code-reviewer.md) and by any code-review fan-out dimension-checker. Severity ladder, profile behaviour, and handoff live in the gate-5 card, not here.

> The **categories** below are universal; the **examples** are illustrative. Declare your project's specific invariants and known-sharp edges in [`STACK.md`](../../../STACK.md), and the reviewer will hunt those too.

Hunt specifically:

- **Logic errors, unhandled edges** — null/empty collections; boundary values; date/time handling (timezone, month-end, DST); parsing/validation of untrusted input; off-by-one.
- **Invariant violations:**
  - **Layer/purity rules** — a module that must stay pure (no I/O, no side effects) doesn't reach for the network / db / filesystem. *(Name your core-purity rule in STACK.md.)*
  - **Idempotency** — an operation that must run at-most-once respects its dedupe/idempotency key; a re-run repeats nothing.
  - **Auth tokens** — single-purpose, expiring, constant-time compared.
  - **Product/business guardrails** — the project's non-negotiables (rate/quantity limits, consent-before-egress, data-minimization). *(List them in STACK.md.)*
- **Drift & waste** — divergence from the technical design; silent scope creep; needless abstraction; dead code.
- **Tests** — missing or vacuous tests (asserting nothing; testing mocks instead of behaviour); logic not covered at its appropriate tier (unit / integration / e2e).

Every finding: `file:line — what — why it matters — concrete fix`.
