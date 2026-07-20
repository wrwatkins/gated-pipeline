# PR workflow

Project rule file (ADR-014; formerly `docs/AI-INSTRUCTIONS.md` §PR workflow). Unconditional — loads every session.

- Every branch gets a PR; never push to `main` — the `block-push-to-main` hook enforces this (CLAUDE.md §Never push to main is the normative home).
- PR review is performed by a separate agent via `.claude/skills/pr-review/SKILL.md` (explicit path — a user-level skill shadows the bare name; ADR-014 §8, TASKS row 67).
- Approvals use the ww-GH-PR-bot flow (`gh workflow run bot-approve.yml -f pr=<n> -f body="..."`) — gh-bot user-level skill; GH_BOT_TOKEN setup pending (TASKS open items).
- **No CI-billed AI review.** The local agent already reviews PRs under the user's subscription; in-CI AI review bills the same work twice. CI stays deterministic gates only (tests, lint, Playwright, build, security scans). If asked to "automate the PR review," push back with this double-billing reasoning first.
- **README-drift hard gate:** every PR body carries a literal `README updated: yes` or `README updated: no — <one-sentence justification>` line. "No update" is defensible only when the PR adds zero contributor-visible surface. Triggers that make "no" indefensible: new top-level directory or package, new env var, new command in the dev/test loop, new user-facing URL surface, new dev-time prerequisite, new run command/port/service entry point, Node/framework version change, new dependency needing OS-level setup.
- Address every 🟡 `[important]` review finding before a PR is "done": same-day fixes + re-request review, or merge and open a tracked follow-up. Never merge and silently move on.
- Triage the open-PR queue at session start: `gh pr list --state open --draft=false --json number,title,reviewDecision,author,createdAt,headRefName --limit 50`; watch for dependabot PRs you didn't open.
- **Dependabot SLA:** patch + minor bumps triaged same-day (approve+merge via the bot after confirming the diff doesn't touch runtime); major bumps explicitly deferred with a dated comment. Same 24h SLA for security-advisory PRs.
- **Diagnose stuck PRs cheap-first:** `gh pr view <n> --json reviewDecision,mergeStateStatus,statusCheckRollup`, read in order: (1) `reviewDecision == ""` → not reviewed; (2) failed check → fix the job; (3) `BLOCKED` → policy gate, read the UI reason; (4) `UNKNOWN` → transient, retry in 30s.
