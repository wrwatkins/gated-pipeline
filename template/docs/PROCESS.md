# PROCESS — Gated Delivery Pipeline (CORE)

**Normative.** Every unit of work — feature, fix, infra change, non-trivial doc — passes gates 1→9 **in order, no skipping**, under an assigned **gate profile** (§Gate profiles: full / docs / chore, recorded in the PR body). A gate must exit with the block below before the next begins — the only licensed exception is the bounded gates-6∥7 parallel rule (§Parallel rule). All artifacts live in this repo.

This file is the **lean shared CORE** — rules every gate reads every run. Detailed procedure for each gate lives in that gate's card at `.claude/rules/gates/gate-<N>-<name>.md`, loaded by explicit Read only (never auto-discovered). The card index is §Gates below.

---

## Gate exit block (required format)

```
GATE: <n> — <name>
RESULT: PASS | FAIL | PASS (N/A — <reason>)
ARTIFACT: <repo path(s) or PR link>
SUMMARY: <≤5 bullets: what was checked / decided / found>
HANDOFF: <what the next gate must know>
```

- `FAIL` loops back to the responsible earlier gate via its inbox, with specifics. FAIL rounds stay in the PR record unsanitized.
- `PASS (N/A — …)` is allowed **only for gates 1–3**, for (a) mechanical changes (typo, dependency bump, comment) or (b) units where the gate has no object — §Gate profiles ([ADR-011](decisions/ADR-011-docs-pr-gate-profile.md), [ADR-013](decisions/ADR-013-risk-tiered-gate-profiles.md)). The recorded reason is itself the evidence, and gate 9 audits it.
- **Typed mirror ([ADR-025](decisions/ADR-025-typed-gate-handoff-envelope.md)):** append a machine-readable JSON mirror of the block per **[`.claude/rules/handoff-schema.md`](../.claude/rules/handoff-schema.md)** — required on every gate exit block. The prose above stays human-canonical; the mirror is the parseable contract (so a hook or a Workflow orchestrator can route/audit deterministically). On divergence the prose wins and the mirror is the bug.

---

## Phase 0 — Discovery (OPTIONAL, not a gate; [ADR-023](decisions/ADR-023-optional-discovery-phase.md))

Ahead of gate 1 sits an **optional** divergent front-end run by `analyst` (opus). It does **not** block, it is opt-in, and **most units skip it** — a well-specified ask goes straight to gate 1, exactly as before. Run it only for a genuinely new/ambiguous product feature, a vague/open-ended owner ask, or an owner-requested reframing; never for fixes, chores, docs units, or already-specified asks.

Phase 0 **diverges** (reframe the problem, brainstorm ≥3 distinct approaches, scan the field, argue the do-not-build case, recommend a requirement shape); gate 1 **converges** (commit testable ACs and challenge them). The output is a discovery brief at `docs/discovery/DISCOVERY-###-<slug>.md` that is an **input to** gate 1, never a substitute — gate 1 still challenges and can FAIL. The analyst writes no ACs (gate 1) and no architecture (gate 2), and MAY decline (`RESULT: SKIP`) when the ask has no discovery object. It emits a `PHASE: 0 — discovery` block (not `GATE: N`) to the business-requirements inbox. Card: [phase-0-discovery](../.claude/rules/gates/phase-0-discovery.md).

## Gates

| # | Gate | Agent | Exit criteria | Artifact | Card |
|---|---|---|---|---|---|
| 1 | Business requirements | `business-requirements` | BR with **numbered Given/When/Then ACs (mandatory — gate 2 bounces BRs without them)**, out-of-scope, KPI impact; consistent with BUSINESS-PLAN + trust guardrails | `docs/requirements/BR-###.md` | [gate-1](../.claude/rules/gates/gate-1-business-requirements.md) |
| 2 | Architecture | `architect` | Fit verdict after reviewing prior architecture/designs/PADU; DESIGN.md/ADR deltas for boundary, data-model, integration, or infra changes; may revise prior decisions with documented reasoning (superseding ADR); PADU classification of new tech; explicit constraints for tech-design | DESIGN.md deltas + ADRs, or "fits — constraints: …" | [gate-2](../.claude/rules/gates/gate-2-architecture.md) |
| 3 | Technical design | `tech-design` | TDS: approach + alternatives, schema/API deltas, placement, per-tier test plan with named cases, security + ops notes, PADU check | `docs/design/TDS-###.md` (+ ADRs) | [gate-3](../.claude/rules/gates/gate-3-tech-design.md) |
| 4 | Develop | `developer` | Implementation + tests; `lint`/`typecheck`/`test` green locally (recorded verbatim); docs updated | Feature branch / diff | [gate-4](../.claude/rules/gates/gate-4-developer.md) |
| 5 | Code review | `code-reviewer` | Verdict recorded; zero unresolved BLOCKING findings | Review block → PR | [gate-5](../.claude/rules/gates/gate-5-code-reviewer.md) |
| 6 | Test | `tester` | Every AC traced to an automated test; all tiers green; core coverage ≥90% lines | Evidence block → PR | [gate-6](../.claude/rules/gates/gate-6-tester.md) |
| 7 | Security | `security-reviewer` | Semgrep clean (no unresolved high/critical), `pnpm audit --prod` clean at high, checklist reviewed | Evidence block → PR | [gate-7](../.claude/rules/gates/gate-7-security-reviewer.md) |
| 8 | Ops | `ops-reviewer` | CI green; new paths instrumented; alerting story; rollback stated; migrations backward-compatible | Evidence block → PR | [gate-8](../.claude/rules/gates/gate-8-ops-reviewer.md) |
| 9 | PR approval | `pr-approver` | Template fully evidenced; process-complete audit passes | PR approval / merge | [gate-9](../.claude/rules/gates/gate-9-pr-approver.md) |

The table above defines the **full** profile. §Gate profiles assigns reduced profiles (docs / chore) by diff class; every gate still runs and exits under every profile. Each gate card (column "Card") carries its detailed procedure, profile-specific behaviour, fan-out eligibility, and perf-budget pointer.

---

## Gate profiles ([ADR-011](decisions/ADR-011-docs-pr-gate-profile.md) + [ADR-013](decisions/ADR-013-risk-tiered-gate-profiles.md), amend ADR-004)

### Assignment

- Every PR body records **`Gate profile: <full | docs | chore> — <one-line eligibility reasoning>`**. Gate 9 audits the assignment; a wrong profile is a bounce.
- **full** (default) — mandatory for any diff with **prod-runtime surface**: prod dependencies, schema/migrations, routes/handlers/UI, auth/token/email surfaces, seed data affecting fitment verification, infra/IaC. When in doubt, full.
- **docs** — units whose deliverable *is* a docs artifact (cadence/review reports, BR/ADR/TDS-only units, requirements PRs, regulatory/reference captures with no loader changes).
- **chore** — zero-prod-runtime-surface diffs: devDep/test-tier version bumps, docs batches riding tooling edits, CI pins/workflow hygiene, reference/data files that don't feed fitment verification.
- **Upgrades are one-way and recorded:** ambiguity resolves upward; if mid-flight the diff is found to touch an excluded surface, all remaining gates run full and the PR body records the upgrade. Until the #30 trial evaluation (below), the excluded-surface list may only grow.

Profile detail per gate (what full/docs/chore means for *that* gate — chore depth, disposition form, scan tier, CI-only) lives in each gate's card. Items 1–4 and 6 of the docs profile also apply *within* any profile whenever a gate lacks an object:

1. **Gates 1–3 `PASS (N/A — gate has no object)`** — allowed when the unit carries nothing for that gate to decide: gate 1 on a PROCESS-mandated review artifact, gate 1/3 on a unit whose deliverable *is* the gate-1/2 artifact, gates 1–3 on owner-directed tooling changes. The recorded reason is audited at gate 9. A combined `GATE: 1–3` block is sanctioned when all three share one reason.
2. **Block carriers** — gates 1–3 exit blocks may be delivered inside inbox handoff messages or the PR body when that gate's artifact *is* the BR/DESIGN/TDS delta itself. Gates 4–9 blocks are always literal in the PR body.
3. **Gate-4 disposition form** — on artifact-is-the-deliverable PRs, gate 4 still exits with a discrete literal `GATE: 4` block. (Detail in [gate-4 card](../.claude/rules/gates/gate-4-developer.md).)
4. **Handoff-in-lieu** — when a gate has no upstream artifact author, the orchestrator writes the handoff. **Precedence: durable constraints additionally land in the owning document (DESIGN/BR/TDS/PROCESS) — never inbox-only.** Inboxes resolve and scroll away; owning docs are re-read fresh every run.
5. **Rework rounds** — non-BLOCKING findings from gates 5–8 are fixed in-branch by the owning earlier-gate agent; `FAIL` + loop-back is reserved for BLOCKING or wrong-direction findings. **FAIL rounds are recorded unsanitized.**
6. **Gates 4–9 never exit N/A.** On docs-only diffs, their checks record per-item n/a-with-evidence — a PASS with reasoning, not a skip.

Chore profile per-gate depth summary (detail in each gate's card):
- **Gates 1–3** — per the docs-profile rules above.
- **Gate 4** — unchanged (disposition form applies on artifact-is-the-deliverable diffs). (Detail in [gate-4 card](../.claude/rules/gates/gate-4-developer.md).)
- **Gates 5+6** — **one review-and-verify agent run**; exits a combined `GATE: 5–6` block. Findings still loop back. (Detail in [gate-5](../.claude/rules/gates/gate-5-code-reviewer.md) and [gate-6](../.claude/rules/gates/gate-6-tester.md) cards.)
- **Gate 7** — scans + diff-hygiene only UNLESS deps or security surface. (Detail in [gate-7 card](../.claude/rules/gates/gate-7-security-reviewer.md).)
- **Gate 8** — exact-head CI verification + rollback statement only. (Detail in [gate-8 card](../.claude/rules/gates/gate-8-ops-reviewer.md).)
- **Gate 9** — unchanged; additionally audits the profile assignment. (Detail in [gate-9 card](../.claude/rules/gates/gate-9-pr-approver.md).)

### Single-evidence rule (all profiles)

The test pyramid runs **at most once per head SHA locally**. Whichever gate runs it first owns the evidence; later gates cite the owning run + head SHA instead of re-running. CI on the final head is the final proof. Force-fresh re-runs happen only on suspicion (staleness, tampering, a surprising diff), and the re-run + reason is recorded in that gate's block.

### Parallel rule (gates 6 ∥ 7)

Gates 6 and 7 (in the chore profile: the combined 5–6 run and gate 7) MAY run concurrently when the diff has **no overlap between test-evidence surfaces and security surfaces**. Both must exit before gate 8 starts; the order of record in the PR body stays 6-then-7. If both runs write pipeline files (inboxes/memories), use worktree isolation (`.claude/rules/working-discipline.md` — [ADR-014](decisions/ADR-014-deterministic-ai-instruction-loading.md)) or sequence the commits.

### Within-gate fan-out (bounded, per-unit judgment, never mandatory)

A review gate MAY spawn concurrent dimension-checkers (e.g. correctness / security-smell / performance) whose outputs are synthesized by the gate agent into **one** verdict and **one** exit block. Bounds: (a) **eligible gates are 5 (code-review), 6 (tester), and 7 (security)** — the gates whose work is decomposable into independent read-only dimensions; **gate 8 (ops) is NOT eligible** (its checks are a short sequential checklist, not parallel dimensions, and it is sonnet-tier verification where fan-out buys nothing); gates 1–4/9 are single-author by nature. (b) **Surface non-collision**: dimension-checkers must not write overlapping files; if any writes pipeline files, use worktree isolation or sequence the commits. (c) **Both/all exit before synthesis**: a dimension FAIL is a gate FAIL. (d) **Finding attribution recorded**: the synthesized block notes which dimension raised each material finding. (e) **Judgment, not mandate**: a small diff does not fan out; fan-out is an internal implementation detail of one gate's run and never changes the single-exit-block format.

### Trial status (owner decision 2026-07-09)

The profile system is a trial — "we will see how that goes." The **#30 cadence trip** evaluates catch-rate per profile (defects caught at each gate vs escaped to later gates / CI / post-merge, chore vs full) and recommends **keep / adjust / revert**; revert is a named outcome (TASKS row 63, ADR-013 §Trial clause).

### Model tiers ([ADR-015](decisions/ADR-015-model-tiered-pipeline.md), amends ADR-004/ADR-013)

Gates are tiered by the work they do, not their position. Judgment gates (1 business-requirements, 2 architect, 5 code-review, 7 security) default **opus**; verification gates (3 tech-design, 4 developer, 6 tester, 8 ops, 9 pr-approver) default **sonnet**. The default lives in each agent's `.claude/agents/<name>.md` frontmatter `model:` field; the Agent/Workflow `model` parameter overrides per run. **Recorded overrides:** developer → opus for feature sprints; security → sonnet for the chore scan tier; any gate → opus on a FAIL round needing re-reasoning. Each gate block records its tier + any override with reason. Ad-hoc research/Explore agents default sonnet unless the task is synthesis (orchestrator sets model at call time). This is the "model-tier only" tuning — it changes what resources each gate uses, not which gates run (ADR-015 §Decision; the #30 trip also reviews sonnet-gate escapes).

---

## Messaging & memory (AIPass-inspired)

Concepts adapted from [AIPass](https://github.com/AIOSAI/AIPass): per-agent homes bundling identity + memory + mailbox, @-addressed subject/body messages, read-memory-on-startup, tiered archiving, and a project registry — implemented here as plain committed files (no runtime dependency).

**Layout** (roster: `.claude/pipeline/REGISTRY.json`):

```
.claude/pipeline/agents/<name>/
├── inbox.md            # mailbox — append-only; resolve by editing STATUS, never delete
├── inbox-archive.md    # archive tier — resolved threads older than 3 merged PRs MOVE here (ADR-013)
├── memory.md           # identity + working state + lessons (newest first)
└── memory-archive.md   # archive tier — overflow Lessons + superseded working state MOVE here at >25 KB (ADR-013)
```

**Archive tier (ENACTED — owner decision 2026-07-09; [ADR-013](decisions/ADR-013-risk-tiered-gate-profiles.md); lineage: TASKS #43 never-delete mandate, DEBT D4/N2, ARCH AD-21):**

- **Inbox:** a resolved thread whose last `STATUS` edit predates the **3 most recent merged PRs** (gate-9-derived count) moves — the whole message, envelope intact — to `inbox-archive.md` in the same agent home.
- **Memory:** the trigger is **byte-based** — when `memory.md` exceeds **25 KB**, Lessons beyond the newest ~10 and superseded working-state paragraphs move to `memory-archive.md`.
- **Move mechanics (the security condition on the never-delete mandate):** archival is **MOVE-never-delete, byte-verified** — hash the extracted text (`shasum -a 256`), append it to the archive, verify the archived copy hashes identical, and only then edit the source; source edit + archive append land in the **same commit**. An archival that alters bytes is a deletion and violates the 2026-07-04 mandate.
- **Read discipline:** agents do NOT read archives on startup; an archive is read only when a live thread or memory entry references it. Archival is performed as an explicit recorded step on a pipeline-touching PR (ride-along class), never a silent side edit.

**Durable homes (ADR-011 item 4; DEBT D3 class):** binding acceptance conditions, procedures, standing rules, and deferrals live in durable documents — PROCESS, DESIGN, ADRs, BRs/TDSs, TASKS, README — never only in an agent's memory or inbox. Memory carries work-in-flight between runs; it is not a rule's home.

**Every agent, every run:**
1. **Fresh context first:** re-read the docs named in **your scoped read-manifest** (PADU, DESIGN named §numbers, the BR/TDS, the PROCESS CORE, your gate card, inbox, memory) — every time, no exceptions, no working from stale memory.
2. **Read your `memory.md`** — pick up where you left off (working state, lessons).
3. **Read your `inbox.md` before starting.** Open messages are handled before new work; mark them `STATUS: resolved — <note>`.
4. **Prereq check:** each agent's prereqs are in its agent file and gate card. Missing prereqs ⇒ **do not start**: write a `prereq-missing` message to the responsible agent's inbox and exit `RESULT: FAIL` naming what's missing.
5. **On completion:** append a `handoff` message (containing your gate exit block) to the **next** agent's inbox, and update your `memory.md` (working state + prepend lessons).
6. **Any agent → any agent:** found a bug, an unresolved question, or incomplete prereqs in someone else's territory? Write a `bug` / `question` / `prereq-missing` message to that agent's inbox — regardless of pipeline position.

**Message envelope (append to the target inbox):**

```
## MSG <yyyy-mm-dd> @<sender> → @<recipient>
TYPE: handoff | prereq-missing | bug | question
SUBJECT: <one line>
RE: <BR-### or topic>
BODY: <what the receiver needs to know/do>
STATUS: open
```

Receiver resolves by editing to `STATUS: resolved — <by, one-line note>`.

**Typed mirror ([ADR-025](decisions/ADR-025-typed-gate-handoff-envelope.md)):** a `handoff`-type message appends the machine-readable JSON mirror below the envelope, per [`.claude/rules/handoff-schema.md`](../.claude/rules/handoff-schema.md). `question`/`bug`/`nit` notes need not. The mirror records the handoff as sent; resolving the thread edits only the prose `STATUS:` line.

---

## Test tiers (all required) — one-line pointer

Detail in [gate-3 card](../.claude/rules/gates/gate-3-tech-design.md) (which the developer reads) and [gate-6 card](../.claude/rules/gates/gate-6-tester.md). Summary: **Unit** (Vitest, colocated, ≥90% core lines) · **Integration** (Vitest + actual Next route handlers + PGlite, active S1+) · **E2E** (Playwright, serial, pinned alphabetical spec order, `apps/web/e2e/`).

## Scans (all required, blocking) — one-line pointer

Detail in [gate-7 card](../.claude/rules/gates/gate-7-security-reviewer.md). Summary: **SAST** Semgrep `p/default`+`p/typescript`+`p/owasp-top-ten` · **Code quality** ESLint+tsc · **Structural** architectural-boundary lint (§Structural lint) · **Dependencies** `pnpm audit --prod --audit-level high`.

## Structural lint (blocking) — one-line pointer

A distinct dimension from style (ESLint) and types (tsc): **architectural boundaries** — a project's layer/purity/import invariants enforced by a structural linter (e.g. dependency-cruiser, eslint-plugin-boundaries, Nx boundaries). Declare the rules + tool + command in `STACK.md` (e.g. "the pure-core package must not import I/O; no cross-layer imports; no cycles"). Green before any PR; a boundary violation is **blocking** (gate 4 keeps it green, gate 5 reviews structure, DoD lists it). This automates the architectural invariants that gate 5 otherwise only human-reviews.

## Knowledge compounding — one-line pointer

The forward self-improvement loop: each unit distills its **reusable lesson** into `docs/solutions/` so the next unit is easier. **Written** at merge by the `compound` skill (gate 9 invokes it — only on a genuine lesson, never filler); **read** at planning by the `recall-solutions` skill (Phase 0 / gate 1). Distinct from ADRs (decisions), memory (agent state), and reviews (periodic). Index: `docs/solutions/README.md`.

## Tracing & process-trace review — one-line pointer

The backward self-improvement loop. Gate 9 appends one structured line per merged unit to **`docs/traces/pipeline-log.jsonl`** (distilled from the typed gate mirrors: result/tier/findings/rework per gate + escapes). The `process-trace-reviewer` cadence agent (every 10 PRs) computes metrics — catch distribution, rework rate, **escape rate**, profile/tier calibration, cost — and recommends evidence-based pipeline changes (graduated as ADRs). Spec + metric definitions: `docs/traces/README.md`. This is the pipeline improving itself with data, and the standing form of the profile/tier trial.

## Cadence reviews — one-line pointer

Detail in [gate-9 card](../.claude/rules/gates/gate-9-pr-approver.md) (enforces trigger) and [gate-7 card](../.claude/rules/gates/gate-7-security-reviewer.md) (owns security re-diff + pin-freshness). Count derived at gate 9 from `gh pr list --state merged`. All report-only — findings graduate into BRs through gate 1; reviews identify and prioritize, they don't auto-fix. Interval scheme + precedence: [ADR-027](decisions/ADR-027-cadence-review-suite-expansion.md).

- **Every 10 merged PRs** (combined obligation): **tech-debt** (three pillars → `docs/reviews/DEBT-<date>.md`) · **SEO** (`SEO-<date>.md`) · **performance** ([BR-018](requirements/BR-018-performance-cadence-review.md); trend deep-dive, not a per-PR budget re-run → `PERF-<date>.md`) · **dependency-currency/CVE** ([BR-019](requirements/BR-019-dependency-currency-cadence-review.md); dependabot backlog + advisory triage → `DEPS-<date>.md`) · **process-trace** (`process-trace-reviewer`; pipeline metrics from `docs/traces/` → `TRACE-<date>.md`; §Tracing).
- **Every 5 merged PRs**: **accessibility** ([BR-016](requirements/BR-016-accessibility-cadence-review.md); WCAG-2.2-AA classes the per-PR axe misses → `A11Y-<date>.md`). Runs **alone** at a multiple-of-5-not-10 trip; **joins** the 10-PR set at multiples of 10 (one combined obligation, no double-count — ADR-027). Lean at 5-only trips (axe-with-excluded-regions + changed-surface manual audit), full-surface sweep at the 10-coincidence or first round.

**Rationalization / arch-decisions review** (detail in [gate-2 card](../.claude/rules/gates/gate-2-architecture.md)) — a third review type, owner-triggered, owned by @architect.

## PR evidence (required on every PR) — one-line pointer

Detail in [gate-9 card](../.claude/rules/gates/gate-9-pr-approver.md). Paste (links don't substitute): (1) unit tail + core coverage % · (2) integration/functional results or recorded n/a · (3) E2E tail · (4) Semgrep summary · (5) lint + typecheck · (6) gate 5, 7, 8 blocks.

---

## Docs format

Plain Markdown — the standard for agentic engineering ([ADR-006](decisions/ADR-006-markdown-source-html-rendered-docs.md), HTML pipeline withdrawn 2026-07-03). Mermaid fences are fine; GitHub renders them natively.

---

## Branch & merge

- **No server-side branch protection — owner decision 2026-07-03: staying on GitHub Free.** Enforcement is local, per `.claude/rules/pr-workflow.md` ([ADR-014](decisions/ADR-014-deterministic-ai-instruction-loading.md)): the `block-push-to-main` PreToolUse hook at `.claude/hooks/` (blocks any push resolving to `main` and `gh pr merge --admin`), PR review by a separate agent via `.claude/skills/pr-review/`, approvals via a bot-approval flow (if configured), and gate 9. All work on `feat/…`, `fix/…`, `chore/…`, `docs/…` branches; squash merge; every PR body carries `README updated: yes|no — <justification>`.
- Conventional commits ending `Co-Authored-By: {{AI_COAUTHOR}}`.
- **Merge procedure** (detail in [gate-9 card](../.claude/rules/gates/gate-9-pr-approver.md)): never merge until `check-runs` polls to full count; `gh pr checks <n> --watch` completes; explicit pass-count check. Re-verify if head moved after gate 8.
- **Ride-along convention:** bookkeeping that goes stale *at* merge (TASKS row pending-merge → merged flip; a prior run's merge confirmation in agent memory) rides the next PR's touch of that file as an explicit recorded obligation — never a direct commit to `main`.
- **Parallel PRs:** when two units are in flight, work in git worktrees (normative rule: `.claude/rules/working-discipline.md` — [ADR-014](decisions/ADR-014-deterministic-ai-instruction-loading.md)); local E2E runs parameterize the port via `E2E_PORT` to avoid collisions.

---

## Honest-status rule

Gate results are reported as observed: failing is FAIL, skipped is recorded as skipped, nothing is marked green to keep momentum. (Owner requirement: critical, grounded review — no rubber stamps.)
