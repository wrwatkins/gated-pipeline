---
name: compound
description: Distill the reusable lesson from a just-completed (or in-flight) unit of work into docs/solutions/ so the NEXT unit is easier. Use when a unit is merging/concluding, when something was non-obvious to solve, when a FAIL round or a review finding revealed a gotcha, when you notice you're re-solving something, or when the user says "capture this" / "compound" / "write it down for next time". Gate 9 invokes this on merge; it can also run on demand. This is the write-half of the knowledge-compounding loop (its read-half is the `recall-solutions` skill).
---

# Compound — capture the reusable lesson

The pipeline is rigorous but it does not automatically get *smarter*. This closes that loop: after a unit ships, distill what would make the **next** unit easier into a durable, planning-facing note. Not a changelog, not a decision record (that's an ADR), not agent working-state (that's memory) — a **reusable lesson**: the gotcha, the pattern, the non-obvious constraint, the thing you'd tell yourself before starting similar work.

## When to write one (and when NOT to)

Write a solution entry only when there is a **genuine, reusable lesson**. Signals: a FAIL round or blocking review finding that a future unit could repeat; a non-obvious root cause; a constraint the code/docs didn't make visible; a pattern worth reusing; "I wish I'd known this before I started." 

Do **not** write one for routine units with no surprise — that just adds noise. One honest "no lesson this unit" beats a shelf of filler. Prefer **updating an existing** solution over creating a near-duplicate.

## Procedure

1. **Source the lesson** from the unit's real record: the gate exit blocks, any FAIL/rework rounds (recorded unsanitized), the code-review/security/ops findings, and anything that was surprising. The best lessons come from where the pipeline pushed back.
2. **Distill to reusable form** — strip the project-incident specifics down to the transferable rule: *"When X, watch for Y, because Z; do W instead."* Include a concrete trigger ("applies when…") so `recall-solutions` can surface it at the right moment.
3. **Write or update** `docs/solutions/SOLUTION-<slug>.md` from `SOLUTION-000-template.md`. Link the originating BR/ADR/PR. Keep it short — a lesson, not an essay.
4. **Update `docs/solutions/README.md`** — one-line index entry (title + the "applies when" trigger) so it's discoverable without reading every file.

## On completion

State plainly whether a solution was written/updated or honestly skipped (with the one-line reason). If invoked from gate 9, this is part of the merge record.
