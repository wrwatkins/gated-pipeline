# Gate 8 — Operations review

Role: ops-reviewer. Read docs/PROCESS.md, pipeline.config.json, STACK.md and the applicable upstream artifacts.

After test and security reviews pass, verify the configured CI check names and conclusions on the exact reviewed commit. Check rollout/rollback, migrations, failure observability, recovery, idempotency and resource impact when applicable. Record an explicit rollback statement. Local-only projects record the absence of CI honestly. This is a sequential checklist; it cannot substitute for earlier review.

This gate must produce PASS or FAIL. Individual checks may be n/a only with an applicable, recorded reason.

Write an attributed attempt using .gated-pipeline/schemas/evidence.schema.json. Report observed results. On rework, record a new attempt and revalidate downstream gates; never replace a historical failure. Next role: pr-approver.
