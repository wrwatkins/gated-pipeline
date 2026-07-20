# Gate 7 — Security Review

Agent: `security-reviewer` · Model tier: **opus** (judgment gate; default; sonnet override on chore scan-only tier — recorded with reason).

## Exit criterion

Semgrep clean (no unresolved high/critical), `pnpm audit --prod` clean at high, checklist reviewed.

## Artifact

Evidence block → PR

## Profile behaviour (chore)

Under **chore**, gate 7 = **scans + diff-hygiene only**, UNLESS the diff touches dependencies — then the **full supply-chain review stands** (quarantine windows, registry publish dates, provenance, exclude-list interactions) — or any security surface, which is an auto-upgrade to full (recorded in the PR body). Record which profile you ran under in your exit block.

**Within-gate fan-out** (CORE cross-gate rule): gate 7 is eligible. MAY spawn concurrent dimension-checkers (SAST / supply-chain / authz/token review / PII review) synthesized into one verdict + one exit block.

## Procedure

Run and record (state which runner):
- `uvx semgrep scan --config p/default --config p/typescript --config p/owasp-top-ten --error` — or the Docker container equivalent, or cite CI job if local unavailable.
- `pnpm audit --prod --audit-level high`

**Review the diff against [`.claude/rules/checklists/security-review.md`](../checklists/security-review.md)** (canonical home; ADR-024 — injection, authz, token hygiene, secrets, PII, redirect abuse, token-namespace). Fan-out dimension-checkers (SAST / supply-chain / authz-token / PII) read the same checklist.

Severity: CRITICAL/HIGH block; MEDIUM fix-or-justify in PR; LOW note. Suppressed rules require written triage. PASS only with no unresolved CRITICAL/HIGH.

## Scans detail (CORE one-line pointer; R30)

- **SAST** — Semgrep rulesets `p/default`, `p/typescript`, `p/owasp-top-ten`; CI runs the `semgrep/semgrep` container.
- **Code quality** — ESLint (`next/core-web-vitals` + `next/typescript`) and `tsc --noEmit` strict. Both blocking.
- **Dependencies** — `pnpm audit --prod --audit-level high`, blocking. False positives triaged in PR with justification, not silenced.

## Cadence duties (CORE one-line pointer; R31)

At each cadence trip, gate 7:
- **Pin-freshness sweep:** re-dereference CI action SHAs against live release tags; refresh CI image digests (mailpit / semgrep / postgres); run `pnpm outdated` on prod deps. Interim until Renovate.
- **Release-age exemption runbook:** if `minimumReleaseAge` blocks an urgent security bump, or landing a threshold ratchet whose retro-validation rejects already-merged young entries, the exemption is `minimumReleaseAgeExclude: [<pkg>]` in `pnpm-workspace.yaml` + inline justification + TASKS row to remove it. Never lower the global threshold.
- **Shared-source security re-diff** (ADR-007 consequence; homes re-pointed by ADR-014): re-diff any upstream shared-rules source (if the project syncs from one) against `.claude/rules/security-conduct.md` + `.claude/rules/security-deploy.md` — improvements ported consciously, never inherited.

## Prereqs

A gate-6 PASS handoff with test evidence, OR a recorded parallel-run authorization (the orchestrator's handoff explicitly states gates 6∥7 run concurrently on this PR and why surfaces don't overlap — gate 8 still requires BOTH exits). On missing both: `prereq-missing` to tester inbox, exit FAIL.

## Handoff

PASS → `handoff` with gate block to `.claude/pipeline/agents/ops-reviewer/inbox.md`. Vulnerabilities in existing code (not this diff) → `bug` to developer inbox + a TASKS.md row.
