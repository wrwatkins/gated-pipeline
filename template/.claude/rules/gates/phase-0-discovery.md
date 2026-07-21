# Phase 0 — Discovery (OPTIONAL — not a gate)

Agent: `analyst` · Model tier: **opus** (judgment; divergent framing) · [ADR-023](../../../docs/decisions/ADR-023-optional-discovery-phase.md)

**This is not one of the nine gates.** It does not block, it is opt-in, and most units skip it. Its output is an *input* to gate 1, never a substitute — gate 1 still challenges and can FAIL. Phase 0 **diverges** (widen the option space); gate 1 **converges** (commit testable ACs).

## When to run (narrow, opt-in)

Run ONLY for: a genuinely new/ambiguous product feature · a vague or open-ended owner ask · an owner-requested reframing.
**Never** for: bug fixes · mechanical/chore changes · docs units · asks already specified tightly enough for testable ACs.

The owner or orchestrator opts in. The analyst MAY decline (`RESULT: SKIP`) when the ask has no discovery object — a decline is recorded and the ask goes straight to gate 1.

## Exit criterion

A discovery brief that reframes the problem, lays out ≥3 distinct approaches, scans the field, argues the do-not-build/cheaper-alternative case, and recommends a requirement shape for gate 1. **Or** a recorded SKIP.

## Artifact

`docs/discovery/DISCOVERY-###-<slug>.md` (template `DISCOVERY-000-template.md`), or none on SKIP.

## Procedure

0. **Recall** — run the `recall-solutions` skill first: surface prior `docs/solutions/` lessons that apply, so discovery reuses what was learned (PROCESS §Knowledge compounding).
1. **Reframe** the underlying problem in one paragraph — the problem, not the owner's proposed solution. Postures + KPI/stream in play.
2. **Diverge:** ≥3 distinct approaches (not variations of one) — each with who it serves, rough effort, key risk. Breadth first; no premature pruning.
3. **Field scan:** proportionate competitor/market check (WebSearch/WebFetch, cite sources) — table-stakes vs differentiator vs anti-pattern.
4. **Reasons NOT to build (mandatory):** cheaper alternatives, do-nothing, and why this might be a poor use of a solo founder's time. Owner no-flattery rule — discovery widens options, it does not sell.
5. **Recommend** the requirement shape to carry into gate 1 and why the losers lose (grounded). A recommendation, not a decision.

Stay in lane: no numbered ACs (gate 1's job), no architecture/placement/data-model (gate 2's job).

## Prereqs

An owner ask. If it is a fix/chore/docs unit or already tightly specified, `RESULT: SKIP (<reason>)` and hand to gate 1 — do not manufacture discovery.

## Handoff

Append a `handoff` message with the phase block to `.claude/pipeline/agents/business-requirements/inbox.md`. Exit block uses `PHASE: 0 — discovery` (not `GATE: N`).
