# Checklist — Security diff-review dimensions

Canonical home for the gate-7 diff-review dimensions (ADR-024 pattern). Read by the [gate-7 card](../gates/gate-7-security-reviewer.md) and by any security fan-out dimension-checker (SAST / supply-chain / authz-token / PII). Scan commands, severity ladder, cadence duties, and supply-chain rules live in the gate-7 card, not here.

> The **categories** are universal; add your project's specific sensitive fields, endpoints, and allowlists in [`STACK.md`](../../../STACK.md).

Review the diff for:

- **Injection** — parameterized queries / a query builder only; no string-built SQL, no shelled-out untrusted input, no unsanitized template rendering.
- **AuthZ** — every mutating/privileged endpoint checks identity *and* ownership; rate limits on expensive or unauthenticated endpoints.
- **Token hygiene** — signed, single-purpose, expiring, constant-time compared.
- **Secrets** — none in code, logs, or client bundles; environment only. Distinct secrets per purpose (no shared-secret fallback).
- **PII / sensitive data** — none in analytics events or logs (ids only); minimal capture. Know which fields are quasi-PII and never log their values or error messages. *(List your sensitive fields in STACK.md.)*
- **Redirect / SSRF** — outbound redirects and server-side fetches go only to an allowlist; no user-controlled host.
- **Access-control on shared surfaces** — object-level authorization, no id-guessing, no existence leaks (404 not 403).
- **Audit trail** — security-relevant actions recorded ids-only where the project requires it.
