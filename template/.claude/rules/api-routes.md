---
paths: ["the app/app/api/**", "the app/app/go/**", "the app/app/a/**", "the app/app/u/**", "the app/lib/**", "the app/tests/**", "the db package/**", "the core package/**"]
---

# API routes, dates & integration tests (your framework/your ORM/query builder — not Django)

Project rule file (the one normative home of the former CLAUDE.md §PR-review stack overrides, plus the API-adjacent rules from former `the project's earlier instructions file` §Testing/§Security & deploy). Binds authoring (gate 4) and review (gate 5); `.claude/skills/pr-review/SKILL.md` restates the checklist by pointer — if the two diverge, this file wins and the skill gets fixed.

## your API routes mutation skeleton

Every your API routes mutation must (1) check session → 401, (2) consume a `rateLimit` bucket, (3) resolve ownership via `getOwnedVehicle`/`getOwnedTask` → 404 (never 403 — no existence leak), (4) zod-parse the body (`z.iso.date` for day strings, never bare regex; zod 4 canonical forms).

## Dates

Day values are `YYYY-MM-DD` strings parsed/serialized **only** through UTC (``new Date(`${s}T00:00:00Z`)`` in, `toISOString.slice(0,10)` out). the core package stays pure — no I/O, the date-handling invariant your project sets (see STACK.md) (CLAUDE.md §Architecture is the home of the purity rule).

## Integration tests

- Integration tests run route handlers directly against an in-memory test DB with the committed migrations (your test-DB helpers); destructive handlers require cross-user-denial and unauthenticated-401 tests.
- **Every external-API dependency gets at least one real-API integration test** alongside the mocked layer (the the external-API test is the pattern). Mocks pin business logic; the real round-trip catches contract bugs mocks can't see. Gate on an env var so missing credentials skip cleanly, and assert on a sentinel that catches live-key misconfiguration.

## Logging & sends

- **Ops-log split:** app/web/system logs → the centralized platform logs (your platform logs per PADU); security-relevant audit events (admin actions, role/privilege changes, account deletion, sends) → the DB-backed `audit_events` table with a verb catalog — DESIGN §5 is the spec. Don't double-write the same event to both. Binds from S4 onward.
- Structured-log discipline (single-line JSON, ids only — no emails/a sensitive fields/zips): normative home `.claude/rules/security-conduct.md`.
- Transactional email to external recipients needs RFC 8058 one-click unsubscribe (signed token, dual-purpose endpoint, `List-Unsubscribe` + `-Post` headers, visible body link) — unsubscribe-token user-level skill. Binding since S4 sends.
