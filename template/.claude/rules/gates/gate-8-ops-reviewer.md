# Gate 8 — Ops Review

Agent: `ops-reviewer` · Model tier: **sonnet** (verification gate; default).

## Exit criterion

CI green; new paths instrumented; alerting story; rollback stated; migrations backward-compatible.

## Artifact

Evidence block → PR

## Profile behaviour (chore)

Under **chore**, gate 8 = **exact-head CI verification** (§Branch & merge check-runs procedure, in PROCESS CORE) + **rollback statement only**. Test evidence is cited from the owning run + head SHA (single-evidence rule), not re-run. Record which profile you ran under in your exit block.

**Gate 8 is NOT eligible for within-gate fan-out** (CORE rule): its checks — CI-poll, rollback, migration-safety, instrumentation — are a short sequential checklist, not parallel dimensions, and it is a sonnet-tier verification gate.

## Procedure

Check, with evidence:
1. **CI:** all jobs green for this change (quality, unit, build, e2e, sast, audit); new code paths exercised by at least one tier.
2. **Instrumentation:** new user-facing paths emit your analytics events + structured JSON logs (ids only, no PII). List events added. A user-visible feature with zero instrumentation is a FAIL.
3. **Alerting:** failure modes on send/cron/webhook paths have an alerting story (your platform logs alarm, or an explicit ROADMAP row if deferred). Silent failure paths are a FAIL per PADU.
4. **Rollback:** container-image redeploy suffices; DB migrations backward-compatible one release (expand→migrate→contract); feature disableable without data loss.
5. **Idempotency:** cron sweeps and email sends respect an idempotency key; re-runs send nothing twice.
6. **IaC:** infra changes are your IaC, not click-ops.
7. **E2E spec order:** a new or renamed E2E spec file is checked against the fixture-mutation order (serial convention, pinned alphabetical — `workers: 1`, `fullyParallel: false`).

## Runtime perf budget (folded dimension — gate 8 owns; CORE one-line pointer)

Reference **[`.claude/rules/perf-budgets.md`](../perf-budgets.md)** for the single source of the numbers. The budgets this gate enforces:
- **No N+1 query patterns** on request paths.
- **No unindexed hot-path query.**
- **Server-side response-time discipline** for the digest/sweep cron engines.

A breach is a **blocking** finding at this gate.

## Merge procedure (CORE rule)

Never merge until: (1) `gh api repos/{owner}/{repo}/commits/<head-sha>/check-runs` polls up to the full expected check count (registration race: `gh pr checks --watch` exits 0 on "no checks reported"); (2) `gh pr checks <n> --watch` completes; (3) explicit pass-count check (`grep -c pass || true`). If head moves after gate 8, re-verify CI on the new SHA before merging.

## Prereqs

A gate-7 PASS handoff. On missing: `prereq-missing` to security-reviewer inbox, exit FAIL.

## Handoff

PASS → `handoff` with gate block to `.claude/pipeline/agents/pr-approver/inbox.md`. Gaps owned elsewhere → that agent's inbox.
