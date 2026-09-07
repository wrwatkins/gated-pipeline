# Gate 7 — Security review

Role: security-reviewer. Read docs/PROCESS.md, pipeline.config.json, STACK.md and the applicable upstream artifacts.

Review .gated-pipeline/checklists/security-review.md and the actual sensitive surfaces. Run configured SAST and dependency checks; document unavailable checks and triage. Review input provenance and current authority at each entry and recovery path, including cross-user behavior and logging/telemetry. No unresolved BLOCKING, CRITICAL or HIGH finding can pass. Never downgrade a failure just because it lacks a finding object.

This gate must produce PASS or FAIL. Individual checks may be n/a only with an applicable, recorded reason.

Write an attributed attempt using .gated-pipeline/schemas/evidence.schema.json. Report observed results. On rework, record a new attempt and revalidate downstream gates; never replace a historical failure. Next role: ops-reviewer.
