# Gate 2 — Architecture

Agent: `architect` · Model tier: **opus** (judgment gate; default; sonnet override on mechanical N/A passes).

## Exit criterion

Fit verdict after reviewing prior architecture/designs/PADU; DESIGN.md/ADR deltas for boundary, data-model, integration, or infra changes; may revise prior decisions with documented reasoning (superseding ADR); PADU classification of new tech; explicit constraints for tech-design.

## Artifact

DESIGN.md deltas + ADRs, or "fits — constraints: …"

## Profile behaviour

- **Full / docs / chore:** gate 2 exits `PASS (N/A — gate has no object)` on owner-directed tooling changes where the spec is already fully determined by a binding BR + ADR inventory. The recorded reason is audited at gate 9.
- Block carrier: gate-2 exit block may be delivered inside an inbox handoff message or the PR body when the artifact *is* the DESIGN/ADR delta itself.
- Combined `GATE: 1–3` block sanctioned when all three share one reason.

## Procedure

1. **Fit:** does the feature fit the current architecture, or does it change package boundaries (the core package purity is non-negotiable), the data model (DESIGN §5), integration points (§9), or hosting/infra (§4)?
2. **Deltas:** update DESIGN.md sections that change and write an ADR for each notable decision. Data-model changes must be expand→migrate→contract compatible.
3. **PADU:** classify any new technology; *Acceptable* needs justification, *Discouraged* needs an ADR, *Unacceptable* is a refusal.
4. **Constraints out:** hand tech-design explicit constraints (placement, invariants, scale/cost bounds) rather than solutions.

**Rationalization / arch-decisions review** (CORE one-line pointer): an owner-triggered read-only review owned by the architect; scope is business case ↔ requirements ↔ traceability ↔ DESIGN ↔ ADRs ↔ PADU ↔ process-vs-practice coherence; reports land in `docs/reviews/RATIONALIZATION-<date>.md` / `ARCH-DECISIONS-<date>.md`; fixes graduate through the normal gates.

**Prior decisions are changeable — documentation is the rule, not preservation.** The mechanics: a superseding ADR carrying that reasoning (mark the old one `superseded by ADR-###`), the PADU row updated, DESIGN.md edited.

## Prereqs

Approved BR with numbered ACs. On missing/AC-less BR: `prereq-missing` message to business-requirements inbox, exit FAIL.

## Handoff

Append a `handoff` message with the gate exit block to `.claude/pipeline/agents/tech-design/inbox.md`.
