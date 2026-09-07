# Gate 9 — PR approval

Role: pr-approver. Read docs/PROCESS.md, pipeline.config.json, STACK.md and the applicable upstream artifacts.

Audit the selected profile, gates 1–8, evidence and actual author/reviewer/verifier attribution. Run gated-pipeline check with --through=8 and the reviewed full commit SHA. Generate the PR record using gated-pipeline pr-body; attach its JSON evidence as well. Confirm independent review is real, not a bot approval receipt. With existing authorization, merge only the reviewed revision after required remote checks; on GitHub use --match-head-commit. Do not approve your own work using a different persona. After merge, record the outcome and follow-ups, then capture a reusable lesson when one exists.

This gate must produce PASS or FAIL. Individual checks may be n/a only with an applicable, recorded reason.

Write an attributed attempt using .gated-pipeline/schemas/evidence.schema.json. Report observed results. On rework, record a new attempt and revalidate downstream gates; never replace a historical failure. Next role: initiating user / merge record.
