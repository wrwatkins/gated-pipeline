# Contributor task ledger

Updated: 2026-09-11. This ledger tracks work on gated-pipeline itself.
The installed-project template remains at `template/docs/TASKS.md`.

| Request | Status | Owner / evidence / next action |
|---|---|---|
| Document synthetic PII policy, generation and scale plan in this repository | Completed: plan written; implementation is separate | Codex planning task 01a0904b-9ab3-73c3-a3e0-cfaf7acb4441; [GP-SYNTH-20260911](plans/synthetic-data-policy-2026-09-11.md) |
| Implement synthetic non-production data contract, enforcement and examples | In independent review: draft PR #10 | Restrictive policy/receipt validation, bounded readers and misuse tests are implemented on `feat/synthetic-test-data-contract-20260912`; coordinator controls final Gate 9 and merge |
| Adopt shared contract and implement large synthetic application datasets in Woods | Queued behind Woods plan integration | Woods plan WIR-SYNTH-20260911 at `docs/plans/synthetic-data-and-scale-testing-2026-09-11.md`; the claimed generator work begins only after its plan PR integrates |
| Collect cost-calibration evidence from 3–5 normal units | Deferred follow-up retained | Existing memory.md checkpoint; no collection or savings claim made by this plan |

Implementation completion requires actual review, tests/CI and adoption evidence
specified by the plan. Documentation alone does not enable the policy or close
the implementation requests.
