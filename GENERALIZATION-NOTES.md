# Generalization notes (v0.2)

Honest scope of the extraction, so you know exactly what's done and what to tailor before this reads as a truly project-agnostic framework.

## New in v0.2

- **`template/STACK.md`** — a single "edit this first" adaptation surface: commands, test tiers, core invariant(s), business guardrails, sensitive fields, tech-governance, perf budgets, platform. The review checklists point here for project specifics.
- **The `code-review` and `security-review` checklists are now generic** — universal categories, no vehicle-domain examples; project-specific edges are declared in STACK.md.

## Done

- **Project identity stripped to placeholders** — every reference to the source project's name/slug/domain and its commit co-author trailer is now `{{PROJECT_SLUG}}` / `{{PROJECT_NAME}}` / `{{PROJECT_DOMAIN}}` / `{{AI_COAUTHOR}}`, filled by the installer. Zero references to the source project or any other repo remain (verified by grep).
- **Packaging** — `npx gated-pipeline` scaffolds `template/` into a target repo with token substitution, never overwriting existing files.
- **The methodology is intact and generic** — the nine gates, phase 0, gate profiles, model tiers, messaging/memory, typed handoffs, deterministic loading, the workflow fan-out, and the cadence suite are all domain-neutral in shape.

## To tailor (the framework still speaks one stack/domain by example)

The gate cards and agents were written for a **Next.js / Drizzle / pnpm** web app in a **vehicle-maintenance** domain. That concreteness is deliberately preserved as a *worked example* — but you'll want to adapt these to your stack. None of it is hidden; it's all plain Markdown find-and-replace.

| Area | Where | What to change |
|---|---|---|
| **Stack commands** | `docs/PROCESS.md`, gate-4/6/7 cards, `checklists/definition-of-done.md` | `pnpm lint/typecheck/test`, Vitest, Playwright, PGlite → your build/test tooling. |
| **Test-tier detail** | gate-3/6 cards, `.claude/rules/api-routes.md` | The unit/integration/E2E tier definitions are stack-specific; keep the shape, swap the tools. |
| **Technology governance** | ~27 files reference **PADU** (a Preferred/Acceptable/Discouraged/Unacceptable tech-governance framework) | PADU is a portable idea — keep it, or replace with your own governance gate. The *rows* it references are project-specific; genericize or drop. |
| **Pure-core rule** | `.claude/rules/engineering.md`, gate-2/5 cards | "`packages/core` purity / no I/O / UTC-midnight date math" is a specific architectural invariant — replace with your own core invariants (or delete). |
| **Domain examples** | gate-5/7 cards, checklists, the workflow | VIN / fitment / PostHog / `/go` redirect / "wrong-part <1%" are domain examples in the review checklists. Replace with your domain's edge cases and invariants. |
| **Perf budgets** | `.claude/rules/perf-budgets.md` | The KB ceilings and Core Web Vitals are web-app specific; set your own. |
| **Security/deploy** | `.claude/rules/security-deploy.md`, gate-7 card | AWS/Terraform/Semgrep specifics — swap for your platform. |
| **CI job names** | gate-8/9 cards | "Quality / Unit / Build / E2E / SAST / Dependency audit" match one CI setup; align to yours. |

## Suggested path to a domain-agnostic v1

1. Introduce more placeholders (`{{TEST_CMD}}`, `{{LINT_CMD}}`, `{{CORE_INVARIANT}}`, `{{GOVERNANCE_FRAMEWORK}}`) and have the installer prompt for them — this is the BMAD "expansion pack" idea: a generic core plus a stack profile.
2. Split each gate card into a **generic procedure** + a **project-example appendix**, so the example is visibly separable from the method.
3. Keep the vehicle-domain version as an `examples/` reference — a filled-in instance is worth more than an empty template for learning the method.

Nothing above blocks using the pipeline today; it all works as-is with the example wording. These notes are the difference between "extracted and runnable" (now) and "reads like it was born generic" (v1).
