# Gate 4 — Develop

For opted-in `docs-lite`, follow [.gated-pipeline/guides/docs-lite.md](../guides/docs-lite.md) instead of the full sequence below. Gates 4 and 5 are its complete preparation/review sequence; gate 5 includes verification and merge readiness. Do not create a separate gate 9 record.

Role: developer. Read docs/PROCESS.md, pipeline.config.json, STACK.md and the applicable upstream artifacts.

Red first (PROCESS, Test-first; .gated-pipeline/guides/tests.md): write the unit-tier tests the design names, run them on the unchanged branch, commit them before the first production-code commit, and record the red receipt (commit, command, nonzero exit, output reference, test paths) on your attempt. Then implement the accepted scope until every red test passes, including the tester's red specs from your inbox; do not wait for those to start, but do not complete without them. Never edit a red test's assertions to reach green; a wrong test gets a recorded reason confirmed by the tester. Verify that a regression test detects the original defect when practical. Run the configured required checks once per code revision; keep commands, exit codes, logs, skips and environment limits. Update documentation affected by the change. Record code review as pending until an independent reviewer has actually run.

This gate must produce PASS or FAIL. Individual checks may be n/a only with an applicable, recorded reason.

Write an attributed attempt using .gated-pipeline/schemas/evidence.schema.json. Report observed results. On rework, record a new attempt and revalidate downstream gates; never replace a historical failure. Next role: code-reviewer.
