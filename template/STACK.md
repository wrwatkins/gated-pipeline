# STACK.md — adapt the pipeline to your project (edit this first)

The gate cards and rules are **stack-agnostic**: they say "your test command", "the core package", "your date-handling invariant" and defer the specifics to this file. **`STACK.md` is the single place to declare them** — the commands, tools, paths, invariants, guardrails, sensitive fields, and governance your project uses. Reviewers and gate agents read it. Fill it in once; the pipeline reads generically forever.

Fill it in, then skim the gate cards (`.claude/rules/gates/*.md`) once and swap the example commands/paths for yours — most of it is find-and-replace.

## Commands

| Role | Example (swap for yours) |
|---|---|
| Install | `pnpm install` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Unit/all tests | `pnpm test` |
| E2E | `pnpm test:e2e` |
| Build | `pnpm build` |
| Dependency audit | `pnpm audit --prod --audit-level high` |
| SAST | `semgrep --config p/default --config p/owasp-top-ten` |

## Test tiers

Describe your tiers (the example uses unit = Vitest colocated, integration = route handlers against an in-memory DB, e2e = Playwright serial). Set your core-coverage floor (example: ≥90% lines on the pure-logic package).

## Core invariant(s)

The example enforces "the `core` package stays pure — no I/O — and does UTC-midnight date math only." Replace with your project's non-negotiable architectural invariants (or delete if none).

## Structural lint (architectural boundaries)

The tool + command + rules that enforce your architecture as a **blocking** check (PROCESS §Structural lint) — distinct from ESLint (style) and tsc (types). Pick a tool (dependency-cruiser, eslint-plugin-boundaries, Nx boundaries, ts-arch) and declare:

- **Command:** e.g. `pnpm structure` (`depcruise...`).
- **Rules:** the boundaries that must hold, e.g. "the pure-core package imports no I/O (`node:fs/http/net`, db, network); no package depends on the app layer; no dependency cycles."

The example project enforces `packages/core` purity + monorepo package boundaries via dependency-cruiser. Delete this section if you don't gate on structure.

## Product / business guardrails

The trust rules the pipeline must never violate (the example: "at most one sponsored slot per surface; user data leaves only on explicit user action"). List yours — the gate-1 and gate-5 checks read them here.

## Sensitive fields (for the security review)

The fields that are PII / quasi-PII and must never be logged or sent to third parties (the example: email, VIN, zip). List yours.

## Technology governance

The example uses **PADU** (Preferred / Acceptable / Discouraged / Unacceptable) to classify any new dependency, with a `docs/PADU.md` register. Keep PADU (it's a portable, useful pattern) or replace with your own governance gate — the architect (gate 2) and tech-design (gate 3) reference it.

## Performance budgets

`.claude/rules/perf-budgets.md` holds web-app numbers (first-load-JS ceilings, Core Web Vitals). Replace with your budgets, or delete the file and the gate-6/8 pointers if performance isn't a gated dimension for you.

## Platform / deploy & CI

`.claude/rules/security-deploy.md` and the gate-8 card assume a specific host/IaC (AWS/Terraform) and CI job names (Quality / Unit / Build / E2E / SAST / Dependency audit). Swap for your platform and pipeline.

## Docs your project keeps

The pipeline references `docs/DESIGN.md`, `docs/BUSINESS-PLAN.md`, `docs/PADU.md`, `docs/ROADMAP.md`, `docs/TASKS.md`. Create the ones you want (templates for BR/TDS/ADR/DISCOVERY/SPIKE are under `docs/*/`); trim gate-card references to docs you won't keep.
