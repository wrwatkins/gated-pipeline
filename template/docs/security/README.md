# PII, secrets and access

This repository's privacy scope includes personally identifiable information (PII). Track four data classes: public, internal, PII and secrets. Define actual project obligations with the accountable human; no regulation or certification is assumed from this scaffold.

| Control | Required project decision/evidence |
| --- | --- |
| Inventory and minimization | Identify PII fields, sources, destinations and purpose; collect only needed data |
| Context and fixtures | Prefer synthetic/redacted examples; exclude production exports, credentials, personal logs and sensitive screenshots from prompts/tests/repo |
| External processing | Document approved tools/providers, data classes permitted and relevant retention/access settings before supplying restricted content |
| Secrets | Use the approved secret store and scoped environment injection; scan commits/artifacts; rotate exposed credentials and remove exposure paths |
| Access | Least privilege identities, scoped tokens, branch rules, protected environments and human accountable owners |
| Agent guardrails | Treat retrieved text as untrusted data; enforce permissions in tools/CI; retain review and authorization boundaries across agents |
| Retention and incident response | Name the owner, retention periods, deletion process and response procedure for accidental disclosure |
| Verification | Threat-driven tests, dependency/SAST checks and independent review appropriate to affected boundaries |

Record project-specific controls and evidence links here or in an existing authoritative policy. Security-sensitive changes use the full applicable review process and a suitably capable model; low document size or a passing schema is not security evidence. Audit/metrics records must not contain PII. Inspect allowed text fields and artifact access as well as file names; structural validation alone cannot detect secrets.

## Synthetic non-production data

`test-data-policy.json` is the project-owned control for local, test, CI, demo and
performance data. It must forbid production PII and pseudonymized production PII;
articles, events and other non-PII content must still be synthetic when used as
test scenarios. A production shape profile is permitted only when the policy says
`approval_required_aggregate_only`, an explicit approval exists, and its receipt
contains only a sanitized reference—not records or values. Keep any exception
small, content-addressed and project-specific; do not turn a map-geometry
exception into a general production-data exception.

Run `gated-pipeline test-data [receipt.json] --json` in CI. It validates the
policy and a bounded synthetic receipt, including policy binding, tier counts and
output-root isolation. It does not read payloads, detect every personal datum,
authenticate an approval, execute a generator, or prove retention/cleanup. Wire
the project generator, validator and disposal process to the policy's three
commands, keep large generated data ignored, and retain only sanitized receipts.

The installer does not provision cloud access, configure provider retention, install a DLP scanner or certify compliance. Wire actual checks and restrictions into `pipeline.config.json`, CI and the deployment platform. Existing user authorization defines task scope; seek new authority only where the proposed action exceeds it or a real required approval is missing.
