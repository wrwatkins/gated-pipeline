# Workflows

Optional, opt-in Claude Code **Workflow** scripts.

A Workflow is a deterministic JavaScript orchestration script the Claude Code **Workflow** tool runs, spawning subagents in the background under the existing subscription (nothing deployed). Scope here is **verification fan-out only** — the mechanical review gates (5 code-review, 6 client-perf, 7 security, 8 runtime/ops). The judgment / human-in-the-loop gates (1, 2, 9) are never Workflow-driven. Billed; run on request or when clearly warranted, not on every unit.

**Runtime note:** scripts run inside the Workflow tool's async context — top-level `await` and a top-level `return` (the script's result) are valid there; `node --check` as a standalone module will reject the `return`, which is expected.

## Scripts

- **`gate-review-fanout.mjs`** — fans out four reviewers (one per verification gate) over a target in parallel, each returning a validated findings object, synthesized into one verdict + typed handoff blocks.
  - Run: `Workflow({ scriptPath: ".claude/workflows/gate-review-fanout.mjs", args: { target: "<file path or diff ref>", profile: "full|docs|chore" } })`
  - `args.target` defaults to the affiliate redirect route for a self-contained demo.
