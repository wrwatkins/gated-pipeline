# Gate 9 — PR Approval

Agent: `pr-approver` · Model tier: **sonnet** (verification gate; default).

## Exit criterion

Template fully evidenced; process-complete audit passes.

## Artifact

PR approval / merge

## Profile behaviour

Gate 9 runs unchanged under every profile. Additionally, gate 9:
- Audits the PR body's `Gate profile:` assignment line — a missing line or wrong profile is a bounce.
- Under **chore**, expects a combined `GATE: 5–6` block (en dash) and single-evidence citations (owning run + head SHA) rather than per-gate re-runs.
- **Resolves every single-evidence citation to its recorded source:** the cited run must exist as a gate block on this PR (or a named CI run) at the same head SHA — an unresolvable citation is a bounce, not a warning.
- Records which profile the PR ran under in your exit block.

## Procedure

Verify:
1. Gates 1–8 exit blocks recorded (gates 1–3 may be `PASS (N/A — reason)` for mechanical changes only — judge whether the reason is honest).
2. Evidence **pasted, not merely linked:** unit results + coverage %, integration/functional results (or the recorded n/a), E2E results, your SAST tool summary, your lint command + your typecheck command output.
3. CI green: `gh pr checks <n>` (once the GitHub remote exists).
4. docs/TASKS.md updated for any owner ask resolved; ADR/PADU updated if tech changed.
5. Conventional commits with the Claude co-author trailer; branch is not `main`.
6. Cadence reviews per the interval scheme (§Cadence mechanics): every 10th merged PR → tech-debt + SEO + performance + dependency-currency + accessibility; every 5th (not 10th) → accessibility alone. Scheduled or done; block further feature work if overdue.

Anything missing → RESULT: FAIL with a numbered list, written as a `prereq-missing`/`bug` message to the responsible agent's inbox.

On PASS: with a remote, `gh pr review --approve` and squash-merge per convention; local-only phase, PASS authorizes the merge to main.

**On merge — close the self-improvement loops (PROCESS §Knowledge compounding + §Tracing):**
- **Trace:** append one structured line to `docs/traces/pipeline-log.jsonl` for this unit — distilled from the gate typed-mirrors (per-gate result/tier/findings/rework, the profile, total rework rounds, empty `escapes`). Machine-aggregatable; the `process-trace-reviewer` reads it.
- **Compound:** run the `compound` skill — distill the unit's reusable lesson into `docs/solutions/` (only on a genuine lesson: a FAIL round, a surprising finding, a reusable pattern; skip honestly if none).

## PR evidence checklist (CORE one-line pointer)

Audit the diff against the shared **Definition of Done** — [`.claude/rules/checklists/definition-of-done.md`](../checklists/definition-of-done.md) (gate 4 produces it). Paste into the PR template (links don't substitute — CI logs expire):
1. Unit: your test command tail (counts) + coverage % for the core package
2. Integration/functional: results, or the recorded n/a while the tier is inactive
3. E2E: your e2e command tail
4. SAST: your SAST tool summary (rulesets, findings, triage)
5. Quality: your lint command + your typecheck command results
6. Gate 5, 7, 8 verdict blocks

## Cadence mechanics (CORE one-line pointer)

- Merged-PR count derived at gate 9 from `gh pr list --state merged` (never hand-carried in memory).
- **Interval scheme:** at a **multiple of 10** → the combined obligation (tech-debt + SEO + performance + dependency-currency + accessibility) is required before further feature work. At a **multiple of 5 that is not a multiple of 10** → **accessibility alone** is required. Each round is keyed to its own interval; the 10-trip is the union of the due rounds, not a re-trigger of the 5-trip (no double-count).
- The cadence-triggering merge may itself carry the review artifacts — obligation satisfied at trigger; gate 9 records which rounds ran explicitly.
- Owner-directed ad-hoc review rounds do not shift any schedule (5-PR or 10-PR).

## Merge procedure (CORE rule pointer)

Full merge procedure in PROCESS CORE (R38 pointer). Summarized: poll `check-runs` to full count, `gh pr checks --watch`, pass-count grep, re-verify CI if head moved.

## Prereqs

An opened PR (or local merge-ready branch) with the template filled and a gate-8 handoff. On missing: `prereq-missing` to ops-reviewer inbox, exit FAIL.

## Handoff

Write the merge outcome + any follow-ups to the initiating context (TASKS.md row updated; follow-ups become `question`/`bug` messages to the right inboxes).
