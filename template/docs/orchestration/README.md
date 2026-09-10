# Card to deployed change

The existing nine gates are the default delivery state machine. Projects may opt ordinary prose into the two-record [docs-lite profile](../../.gated-pipeline/guides/docs-lite.md). This map connects product work to them without adding another competing pipeline.

| Work stage | Gates and artifact | Exit evidence |
| --- | --- | --- |
| Card | 1 requirements | Task/BR, user outcome, acceptance criteria, risk and scope |
| Spec | 2 architecture, 3 technical design | Boundaries, decisions, affected paths and meaningful verification plan |
| Code | 4 develop | Implementation, actual checks and attributed handoff |
| Test/review | 5 code review, 6 test, 7 security | Independent review where required, test and security evidence at the reviewed revision |
| Release readiness | 8 operations, 9 approval | CI, rollback, required authority and final evidence |
| Deploy | Authorized project release workflow | Released revision, environment, health/rollback checks and deployment receipt |

Use the current card in `.gated-pipeline/cards/` and the corresponding role. All gates remain represented for full/docs/chore profiles; record why work is inapplicable. Gate 9 verifies readiness and existing authority; it does not grant deployment permission. User authorization within the current scope persists; do not ask again merely because the agent or gate changed.

Run agent review sessions from the local Codex/Claude workflow under the user's configured plan. Keep GitHub automation deterministic; do not add a hosted AI reviewer or separate API billing without explicit authorization. Local orchestration does not imply model inference runs on this computer. A bot account publishes attributed review results; its account identity does not establish independent review.

Default to one worker for sequential work. Delegate only a concrete independent task within existing authorization. Give reviewers a bounded packet: requirement/spec links, base/head SHA, diff, test receipts, unresolved findings and applicable policy links. A fresh reviewer must acquire those instructions; a small model context is no excuse to omit security constraints. A changed implementation invalidates dependent evidence until rechecked.

Persist each actual gate attempt through the evidence contract, including failures. Advance only on satisfied prerequisites. Merge/deploy tools and CI must bind actions to the reviewed revision and enforce real permissions; these documents do not execute that enforcement. Stop on genuine missing authority, failed prerequisites or exhausted configured budgets and record the needed action without fabricating a pass.
