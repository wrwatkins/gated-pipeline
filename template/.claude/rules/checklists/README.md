# Checklists — shared review/verify primitives

Project rule primitive.

A **checklist** is the single canonical home for a cross-cutting item-list — a set of review or completion dimensions that more than one gate (or a fan-out dimension-checker) reads. Gate cards **reference** a checklist; they do not restate it. This is "one rule, one home" applied to procedure: the items live in exactly one file.

## What belongs here

- Cross-cutting **item-lists**: review dimensions, completion bars, verify dimensions — read by ≥2 cards or by fan-out checkers.

## What does NOT belong here

- Gate-specific severity ladders, scan commands, model tiers, profile behaviour, handoff routing — these stay in the gate card.
- A list only one card ever reads — that is just that card's procedure; keep it inline until a second reader appears.
- Executable multi-step procedures / task-runners — out of scope by (we adopt the declarative checklist half of BMAD's `tasks/`+`checklists/`, not a task engine).

## Loading

Ordinary Markdown, loaded by explicit Read from the referencing card only — no `paths:` frontmatter, no auto-discovery (a checklist must not inflate every session's startup context).

## Current set

- [`definition-of-done.md`](definition-of-done.md) — pre-PR completion bar (referenced by gate-4, gate-9, `engineering.md`).
- [`code-review.md`](code-review.md) — gate-5 review dimensions.
- [`security-review.md`](security-review.md) — gate-7 diff-review dimensions.
