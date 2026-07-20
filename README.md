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

This is **v0.1**. The framework files are fully functional but still carry **example stack and domain wording** from the project they were extracted from (a Next.js / Drizzle / pnpm web app). Project *identity* has been stripped to placeholders; the *stack/domain examples* (e.g. specific test tiers, a data-purity rule, a redirect-route example) are still concrete. See **[GENERALIZATION-NOTES.md](GENERALIZATION-NOTES.md)** for exactly what to adapt to your stack — most of it is find-and-replace in the gate cards, and much of it is useful as-is as a worked example.

## License

MIT — see [LICENSE](LICENSE).
