# Security conduct

Project rule file (ADR-014; the conduct subset of former `docs/AI-INSTRUCTIONS.md` §Security & deploy — these bind every session, not just IaC diffs; BR-008 D6). Unconditional — loads every session. IaC/deploy rules live in `.claude/rules/security-deploy.md` (path-scoped).

- **Never echo secrets** into chat or tool output — mask before display. The transcript is durable storage; a leaked secret must be rotated, not deleted.
- **Structured logs are single-line JSON with ids only — no emails, VINs, or zips.** (One home, here; the API-route rule file restates by pointer.)
- **No "barely-covers" work.** Ship the real fix, not the check-mark workaround: no `unsafe-inline`, `report-only`, `--insecure-skip`, or broad allowlists as the final state without the owner's written acceptance. If the real fix blows the budget, surface the gap + residual risk and let the owner choose.
