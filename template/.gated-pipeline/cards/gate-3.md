# Gate 3 — Technical design

Role: tech-design. Read docs/PROCESS.md, pipeline.config.json, STACK.md and the applicable upstream artifacts.

Write a buildable design in docs/design/ with implementation placement, named tests for each acceptance criterion at each applicable tier, relevant security checks, operations implications, and alternatives. Each named test must be specific enough to be written red from the design alone: the developer writes the unit-tier cases before any code and the tester writes the browser-tier or integration specs concurrently (PROCESS, Test-first). Use project commands and invariants. Preserve the architecture constraints; send unbuildable requirements back with specifics.

For docs/chore work with no decision for this gate, record PASS_NA with a concrete reason. Do not demand an upstream artifact that was explicitly inapplicable.

Write an attributed attempt using .gated-pipeline/schemas/evidence.schema.json. Report observed results. On rework, record a new attempt and revalidate downstream gates; never replace a historical failure. Next role: developer, and hand the same design to tester for the concurrent red pass.
