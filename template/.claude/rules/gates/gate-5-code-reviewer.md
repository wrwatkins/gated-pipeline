# Gate 5 — Code Review

Agent: `code-reviewer` · Model tier: **opus** (judgment gate; default; sonnet override on chore scan-only tier — recorded with reason).

## Exit criterion

Verdict recorded; zero unresolved BLOCKING findings.

## Artifact

Review block → PR

## Profile behaviour (chore)

Under **chore**, gates 5+6 are **one combined review-and-verify run**: review the diff *and* verify/extend the test evidence in the same run; exit a **combined `GATE: 5–6` block** (with en dash: `GATE: 5–6`). Findings still loop back per the normal rework/FAIL rules — the merge saves a run, not a check. Record which profile you ran under in your exit block.

**Within-gate fan-out** (CORE cross-gate rule; R20-fanout): gate 5 is eligible. MAY spawn concurrent dimension-checkers (correctness / security-smell / simplicity) synthesized into one verdict + one exit block. Bounds: surface non-collision, both exit before synthesis, finding attribution recorded. Judgment, not mandate — a small diff does not fan out.

## Procedure

Posture: skeptical by default — the owner requires grounded critical review. No rubber stamps, no praise padding. If the change is fine, one line; spend words on what's wrong or risky.

**Hunt the dimensions in [`.claude/rules/checklists/code-review.md`](../checklists/code-review.md)** (canonical home; ADR-024 — logic/edges, core-purity & other invariants, TDS drift, vacuous tests). Fan-out dimension-checkers read the same checklist.

Every finding: `file:line — what — why it matters — concrete fix`. Severity: BLOCKING / IMPORTANT / NIT. PASS requires zero unresolved BLOCKING findings.

**Rework rounds** (CORE rule; R11): non-BLOCKING findings are fixed in-branch by the owning earlier-gate agent; `FAIL` + loop-back reserved for BLOCKING or wrong-direction findings. FAIL rounds recorded unsanitized.

## Prereqs

A diff (`git diff main...HEAD` or staged), the TDS, and the developer's gate-4 handoff with recorded local results. On missing: `prereq-missing` to developer inbox, exit FAIL.

## Handoff

PASS → `handoff` message with gate block to `.claude/pipeline/agents/tester/inbox.md`. FAIL → `bug` message with the blocking findings to `.claude/pipeline/agents/developer/inbox.md`.
