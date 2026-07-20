# Gate 1 — Business Requirements

Agent: `business-requirements` · Model tier: **opus** (judgment gate; default; sonnet override on mechanical rewrite-only runs).

## Exit criterion

BR with **numbered Given/When/Then ACs (mandatory — gate 2 bounces BRs without them)**, out-of-scope, KPI impact; consistent with BUSINESS-PLAN + trust guardrails.

## Artifact

`docs/requirements/BR-###.md`

## Profile behaviour

- **Full / docs / chore:** gate 1 exits `PASS (N/A — gate has no object)` when the unit carries nothing for gate 1 to decide: a PROCESS-mandated review artifact (the mandate is the requirement), a unit whose deliverable *is* the gate-1/2 artifact, or an owner-directed tooling change. The recorded reason is audited at gate 9; a weak reason is a bounce. A combined `GATE: 1–3` block is sanctioned when all three share one reason.
- Block carrier: gate-1 exit block may be delivered inside an inbox handoff message or the PR body when the artifact *is* the BR delta itself. (CORE is normative; this restates by pointer.)

## Procedure

1. Restate the ask in one sentence. Identify affected postures (minimalist / weekend DIYer / hands-on), revenue stream, KPI impact.
2. Challenge it before writing. FAIL (with reasons and a sharper alternative) if it conflicts with: trust guardrails (max one sponsored slot per surface; data leaves only on explicit click), PADU, roadmap scope discipline, or the <1% wrong-part accuracy bar.
3. Write `docs/requirements/BR-<next>-<slug>.md` from BR-000-template.md. **Numbered Given/When/Then ACs are mandatory.** Include out-of-scope, KPI impact, dependencies.
4. Add/update the ask's row in docs/TASKS.md.

## Prereqs

Owner ask (verbatim or from TASKS.md). If too ambiguous to write testable ACs, exit FAIL with the specific questions for the owner.

## Handoff

Append a `handoff` message with the gate exit block to `.claude/pipeline/agents/architect/inbox.md`.
