# Checklist — Security diff-review dimensions

Canonical home for the gate-7 diff-review dimensions ([ADR-024](../../../docs/decisions/ADR-024-shared-checklist-primitives.md)). Read by the [gate-7 card](../gates/gate-7-security-reviewer.md) and by any security fan-out dimension-checker (SAST / supply-chain / authz-token / PII; ADR-016). Scan commands, severity ladder, cadence duties, and supply-chain rules live in the gate-7 card, not here.

Review the diff for:

- **Injection** — Drizzle query builder only; no string-built SQL.
- **AuthZ** — on every `/api` route; rate limits on VIN-decode and token endpoints (and any unauthenticated surface).
- **Token hygiene** — signed, single-purpose, expiring, constant-time compare (email actions + unsubscribe).
- **Secrets** — none in code, logs, or client bundles; env only. Distinct secrets per purpose (no shared-secret fallback).
- **PII** — none in analytics events or logs (ids only); minimal capture per DESIGN §10. VIN is quasi-PII — `surface:"decode"` events carry `err.name` only, never `err.message`/URL.
- **Redirect abuse** — `/go/:offerId` redirects only to allowlisted merchant hosts.
- **Open-redirect / token-namespace** — `/a`, `/u`, `/go` per DESIGN §7.
- **PII columns / `audit_events` ids-only / suppressions** — per DESIGN §5.
