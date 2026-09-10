# Gate 4 — Develop

For opted-in `docs-lite`, follow [.gated-pipeline/guides/docs-lite.md](../guides/docs-lite.md) instead of the full sequence below. Gates 4 and 5 are its complete preparation/review sequence; gate 5 includes verification and merge readiness. Do not create a separate gate 9 record.

Role: developer. Read docs/PROCESS.md, pipeline.config.json, STACK.md and the applicable upstream artifacts.

Implement the accepted scope and its regression tests. Verify that a regression test detects the original defect when practical. Run the configured required checks once per code revision; keep commands, exit codes, logs, skips and environment limits. Update documentation affected by the change. Record code review as pending until an independent reviewer has actually run.

This gate must produce PASS or FAIL. Individual checks may be n/a only with an applicable, recorded reason.

Write an attributed attempt using .gated-pipeline/schemas/evidence.schema.json. Report observed results. On rework, record a new attempt and revalidate downstream gates; never replace a historical failure. Next role: code-reviewer.
