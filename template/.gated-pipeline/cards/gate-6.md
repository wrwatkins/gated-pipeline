# Gate 6 — Test

Role: tester. Read docs/PROCESS.md, pipeline.config.json, STACK.md and the applicable upstream artifacts.

This role runs twice per unit. Red pass, on the gate-3 handoff and concurrently with the developer's red phase: write the browser-tier or integration specs for every user-visible acceptance criterion as the design names them, asserting the required behaviour, run them red on the unchanged branch, commit them, and hand the developer a red receipt attributed to your own actor. Never write production code or fixtures that fake the feature; a spec that passes on the unchanged branch is rewritten, not handed off. When the design names no browser contract, record that reason in the handoff for the approver. Verification pass, after gate 5, is the rest of this card.

Trace each applicable acceptance criterion to an executed test or an explicitly justified manual check. Inspect the command, exit code, expected suite completion and skips, not just a green summary. Confirm every red test from both authors is green on the reviewed revision and still asserts what it asserted when red. Reuse evidence only for the same revision. Add missing tests through the developer and invalidate affected later evidence. Run the configured test tiers. When enabled, inspect performance against the budgets in STACK.md. Missing, crashed or incomplete test runs fail.

This gate must produce PASS or FAIL. Individual checks may be n/a only with an applicable, recorded reason.

Write an attributed attempt using .gated-pipeline/schemas/evidence.schema.json. Report observed results. On rework, record a new attempt and revalidate downstream gates; never replace a historical failure. Next role: security-reviewer.
