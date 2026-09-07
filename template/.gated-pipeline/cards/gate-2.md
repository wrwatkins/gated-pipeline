# Gate 2 — Architecture

Role: architect. Read docs/PROCESS.md, pipeline.config.json, STACK.md and the applicable upstream artifacts.

Review the accepted requirements against the architecture documents configured in pipeline.config.json. Record boundaries, data and integration impacts, alternatives, and constraints. Write an ADR for a material decision. Use the project technology policy if one is configured; do not invent a required governance document.

For docs/chore work with no decision for this gate, record PASS_NA with a concrete reason. Do not demand an upstream artifact that was explicitly inapplicable.

Write an attributed attempt using .gated-pipeline/schemas/evidence.schema.json. Report observed results. On rework, record a new attempt and revalidate downstream gates; never replace a historical failure. Next role: tech-design.
