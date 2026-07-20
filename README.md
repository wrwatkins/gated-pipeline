# gated-pipeline

A gated, agent-driven SDLC pipeline for **Claude Code** — the methodology and file layout that turn a coding agent into a disciplined delivery team. Extracted from a real production project and generalized. Scaffolds into any repo with one command.

Think of it as an opinionated, Claude-Code-native alternative to BMAD: a fixed sequence of review gates with real teeth (tests, SAST, evidence), agents that pass typed handoffs and keep file-based memory, and a periodic review suite — all as plain Markdown the harness loads deterministically. No runtime, no service, no dependency.

## Install

```
npx gated-pipeline
```

Run it in the root of a Git repo. It prompts for your project name/slug/domain and a commit co-author trailer, then scaffolds `.claude/` and a `docs/` skeleton, substituting those values. It never overwrites existing files.

Non-interactive (CI / scripted):

```
npx gated-pipeline --slug=my-app --name="My App" --domain=my.app --coauthor="Claude <noreply@anthropic.com>" [target-dir]
```

Add `--dry-run` to preview, or `--yes` to accept defaults for anything unspecified.

## Staying up to date (use it across projects)

Install once, then pull framework improvements without losing your customizations:

```
pnpm add -D github:wrwatkins/gated-pipeline   # or a published npm version
pnpm gated-pipeline sync                       # update framework files in place
```

`sync` **overwrites the framework files** (agents, gate cards, checklists, PROCESS, handoff-schema, hooks, workflow — re-applying your tokens) and **never touches your project-owned files** (`STACK.md`, your docs/BRs/ADRs, `REGISTRY.json`, the stack-specific rules). The split is declared in [`framework-manifest.json`](framework-manifest.json); a project can protect *additional* paths by adding them to `protect` in its generated `.gated-pipeline.json`. Review the `git diff` and commit — nothing is hidden (unlike a submodule).

This is the model for **multiple projects sharing one pipeline**: each repo deps the package and syncs; a fix to a gate card lands everywhere on the next sync. Your project-specifics live in `STACK.md` and your own docs, so they survive every update.

## What you get

**A nine-gate delivery pipeline** — every unit of work passes, in order:

1. Business requirements → 2. Architecture → 3. Technical design → 4. Develop → 5. Code review → 6. Test → 7. Security → 8. Ops → 9. PR approval

Each gate is a persona (`.claude/agents/`) driven by a **gate card** (`.claude/rules/gates/`) and exits an explicit `GATE / RESULT / ARTIFACT / SUMMARY / HANDOFF` block. Gates 1–3 may exit `N/A` for mechanical changes; gates 4–9 never skip.

**An optional Phase 0 — Discovery** ahead of gate 1: a divergent front-end (brainstorm, field-scan, argue the do-not-build case) that *feeds* requirements, run only for genuinely new/ambiguous features.

**A cadence review suite** — periodic, report-only reviews that catch what per-PR gates miss: tech-debt + SEO + performance + dependency-currency (every 10 merged PRs) and accessibility (every 5). Findings graduate back through the gates.

**The mechanisms that make it work:**

- **Gate profiles** (full / docs / chore) — scale ceremony to change risk.
- **Model tiers** — judgment gates get the strong model, verification gates a cheaper one.
- **File-based agent memory + messaging** (AIPass-inspired) — each agent has an append-only `inbox.md` and a persistent `memory.md`; no runtime, all committed and greppable.
- **Typed handoffs** — a machine-readable JSON mirror of each exit block (`.claude/rules/handoff-schema.md`).
- **Deterministic rule loading** — unconditional rules load every session; path-scoped rules load when matching files are worked; gate cards load by manifest. The harness loads them, not an obedience ritual.
- **A verification-fan-out Workflow** (`.claude/workflows/`) — optional, opt-in parallel review of the mechanical gates.
- **A `block-push-to-main` hook** — enforces the PR-only workflow.

## Concepts, in one place

`docs/PROCESS.md` is the normative CORE — read it first. The decision record for *why* the pipeline is shaped this way lives in the source project's ADRs (the methodology set: gated SDLC, gate profiles, model tiers, deterministic loading, gate cards, discovery phase, checklist primitives, typed handoffs, workflow fan-out, cadence suite).

## Status & generalization

This is **v0.2**. The method is stack-agnostic; the gate cards ship as a **worked example** in one stack (TypeScript / Next.js / Drizzle / pnpm). Project *identity* is stripped to installer placeholders, and the two most-read review checklists (`code-review`, `security-review`) are now **generic**. The remaining stack/domain wording in the gate cards is intentionally left as a filled-in example — you adapt it via one file: **[`STACK.md`](template/STACK.md)** (scaffolded into your repo), which the reviewers read for your invariants, guardrails, sensitive fields, commands, and governance. See **[GENERALIZATION-NOTES.md](GENERALIZATION-NOTES.md)** for the full adaptation map.

## License

MIT — see [LICENSE](LICENSE).
