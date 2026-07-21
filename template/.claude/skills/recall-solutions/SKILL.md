---
name: recall-solutions
description: Before scoping or planning new work, surface prior distilled lessons from docs/solutions/ that apply, so you reuse what was learned instead of re-solving it. Use at the start of a unit — during discovery (Phase 0) or requirements (gate 1), when the user describes a new feature/fix, or whenever you're about to plan something that resembles past work. This is the read-half of the knowledge-compounding loop (its write-half is the `compound` skill).
---

# Recall solutions — reuse what was already learned

The compounding loop only pays off if past lessons actually reach the planning of new work. This is that step: at the **front** of a unit, check whether a prior unit already learned something relevant.

## Procedure

1. **Read the index** `docs/solutions/README.md` first — each entry carries an "applies when" trigger, so you can scan without opening every file.
2. **Match against the work being scoped** — the feature/fix/surface, the packages touched, the class of problem. Open the full `SOLUTION-<slug>.md` for any that plausibly apply.
3. **Fold the lesson into the plan** — cite the relevant solution(s) in the discovery brief / BR / TDS: the gotcha to avoid, the pattern to reuse, the constraint to respect. A recalled lesson that changes the plan is the whole point.
4. If nothing applies, say so in one line — don't force a match.

## Why this exists

Without it, `docs/solutions/` becomes a write-only graveyard and the pipeline stays rigorous-but-not-smarter. Recalling at planning time is what makes each unit easier than the last.
