# Pipeline events and review metrics

Use append-only `docs/traces/events.jsonl`. Do not rewrite historical merge records to add later observations. Existing `pipeline-log.jsonl` files remain historical evidence; do not fabricate events from incomplete rows.

Each event has a unique `id` and a `type`. Minimal examples:

```json
{"id":"merge-42","type":"merge","pr":42,"headSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","profile":"full","evidence":"<durable gate evidence reference>"}
{"id":"escape-42-F1","type":"escape_found","originPr":42,"foundPr":51,"what":"<observed defect and source attribution>","evidence":"<reproduction>"}
{"id":"cadence-trace-50","type":"cadence_completed","role":"process-trace-reviewer","boundary":50,"report":"docs/reviews/TRACE-50.md"}
```

Merge IDs/PRs must be unique; PR numbers are actual identifiers, not the total merged count. A cadence boundary is the total merged count. Roles and intervals come from `.gated-pipeline/REGISTRY.json`. `gated-pipeline cadence` reports due intervals and rejects malformed/duplicate event identities and missing cadence reports.

At review, compare the authoritative merged-PR list with recorded PRs before calculating metrics. Report missing unit records as unknown. Attribute escapes to the demonstrated originating change, not to the most recent security PR. Include findings, actual tool/model, rework, costs and test limitations only when recorded in the unit evidence; unknown values stay unknown. No tier change is justified solely by speculation that a different model would have caught a defect.

Post-merge records ride the next normal PR. They do not authorize direct protected-branch commits or new external messages. Keep pending record obligations visible in docs/TASKS.md. Model cost and runtime are optional observations, not fabricated estimates.
