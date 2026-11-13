# Gate 9 — PR approval

For opted-in `docs-lite`, follow [.gated-pipeline/guides/docs-lite.md](../guides/docs-lite.md) instead of the full sequence below. Gates 4 and 5 are its complete preparation/review sequence; gate 5 includes verification and merge readiness. Do not create a separate gate 9 record.

Role: pr-approver. Read docs/PROCESS.md, pipeline.config.json, STACK.md and the applicable upstream artifacts.

Audit the selected profile, gates 1–8, evidence and actual author/reviewer/verifier attribution. Run gated-pipeline check with --through=8, the reviewed full commit SHA and --base so recorded red receipts are bound to the branch; run gated-pipeline test-first for the same range. When the record declares `carriedHead`, check runs the merge-regression inspector; confirm its kind matches what the PR claims and that gates 6–8 are bound to the head. Confirm every review attempt is `fresh`, every FAIL is still in the record with a `supersedes` round after it, and the gate-7 attempt carries its adversarial pass or an explicit no-boundary statement with reasoning. A green command settles ordering, receipt binding and record shape only; you still judge whether each n/a reason is honest, whether each test proves its criterion, whether review was independent, and whether cited output came from the run it names. Generate the PR record using gated-pipeline pr-body; attach its JSON evidence as well. Confirm independent review is real, not a bot approval receipt. With existing authorization, merge only the reviewed revision after every required remote check has completed on that exact head; re-read the merged count inside the merge window and stop on an overdue cadence boundary unless this PR carries the report; on GitHub use `--merge --match-head-commit`, never squash. Record `context: "fresh"`. Do not approve your own work using a different persona. After merge, record the outcome and follow-ups, then capture a reusable lesson when one exists.

This gate must produce PASS or FAIL. Individual checks may be n/a only with an applicable, recorded reason.

Write an attributed attempt using .gated-pipeline/schemas/evidence.schema.json. Report observed results. On rework, record a new attempt and revalidate downstream gates; never replace a historical failure. Next role: initiating user / merge record.

Before an authorized merge, use .gated-pipeline/skills/merge-readiness.md for current-commit independent evidence and named checks. The local skill publishes no bot approval and runs no hosted AI.
