# Gate 5 — Code review

Role: code-reviewer. Read docs/PROCESS.md, pipeline.config.json, STACK.md and the applicable upstream artifacts.

Review the diff and upstream requirements/design using .gated-pipeline/checklists/code-review.md. Review actual inputs, authority boundaries, failure paths, test assertions and unnecessary complexity. Give each finding a stable ID, severity, file/line and a concrete fix. Keep original FAIL attempts. Do not edit production code during review. A separate role name in the same authoring run is not independent review.

This gate must produce PASS or FAIL. Individual checks may be n/a only with an applicable, recorded reason.

Write an attributed attempt using .gated-pipeline/schemas/evidence.schema.json. Report observed results. On rework, record a new attempt and revalidate downstream gates; never replace a historical failure. Next role: tester.
