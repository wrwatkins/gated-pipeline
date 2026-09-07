# Gate 6 — Test

Role: tester. Read docs/PROCESS.md, pipeline.config.json, STACK.md and the applicable upstream artifacts.

Trace each applicable acceptance criterion to an executed test or an explicitly justified manual check. Inspect the command, exit code, expected suite completion and skips, not just a green summary. Reuse evidence only for the same revision. Add missing tests through the developer and invalidate affected later evidence. Run the configured test tiers. When enabled, inspect performance against the budgets in STACK.md. Missing, crashed or incomplete test runs fail.

This gate must produce PASS or FAIL. Individual checks may be n/a only with an applicable, recorded reason.

Write an attributed attempt using .gated-pipeline/schemas/evidence.schema.json. Report observed results. On rework, record a new attempt and revalidate downstream gates; never replace a historical failure. Next role: security-reviewer.
