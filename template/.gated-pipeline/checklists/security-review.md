# Security review dimensions

Use the project's actual surfaces and sensitive fields from STACK.md.

- Validate inputs at trust boundaries; safe query/command construction.
- Authentication, authorization and ownership on entry and recovery paths.
- Credential/token scope, expiry, revocation and reuse.
- Secrets and sensitive data in logs, telemetry, URLs and error payloads.
- Dependencies, untrusted content, outbound requests and redirect constraints.
- Concurrency, replay, abuse limits and failure observability.

A clean scan covers its stated scope only. Review provenance, not just value shape. Missing checks remain missing until run or explicitly justified as inapplicable.
