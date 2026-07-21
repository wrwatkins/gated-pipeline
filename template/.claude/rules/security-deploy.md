---
paths: ["**/*.tf", "**/*.tfvars", ".github/workflows/**", "infra/**", "**/Dockerfile*"]
---

# Security & deploy (S6 AWS path, per PADU)

Project rule file (the IaC/deploy subset of former `the project's earlier instructions file` §Security & deploy D6 split). Loads when IaC/workflow/container files are worked on. Session-wide conduct rules (secrets, logs, no-"barely-covers") live in `.claude/rules/security-conduct.md` (unconditional).

- Secrets pattern: **SSM Parameter Store** (runtime) + **gitignored `*.tfvars`** (your IaC-time). Nothing else without the owner's written acceptance.
- Every AWS IaC resource carries a `Project` tag via module-level `default_tags`. Untagged resources block the PR.
- Encryption at rest and in transit is mandatory on every applicable resource — the concrete resource checklist lives in `.claude/skills/pr-review/SKILL.md` §Universal infrastructure checklist (your IaC / IaC).
- Every prod deploy states a rollback path in the PR body: the one-line revert/toggle, time to apply (<5 min), and the signal that triggers it. No stated rollback → don't ship.
- Once `docs/security/` exists, re-walk OWASP ASVS L1 before every prod deploy (asvs-l1-auditor user-level agent); a net-new Fail blocks the deploy.
