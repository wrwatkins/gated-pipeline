# Cost governance

`cost-policy.json` is project-owned. Its routine/standard/sensitive routes can name a provider, model and effort; null uses the current harness configuration and explicitly records an unconfigured choice. The CLI does not select or launch a model. Use native provider settings; do not translate another tool's model aliases or assume equal effort semantics.

Keep AI execution in the local agent workflow. GitHub checks and approval publication remain deterministic; do not add model API calls or paid review services to CI. Existing CI compute is a separate budget from agent-plan usage.

Choose the least expensive route that meets demonstrated quality needs: routine for bounded mechanical work, standard for everyday implementation and planning, sensitive for security/privacy, difficult architecture or repeated unresolved failures. Escalate when evidence warrants it; compare cost per accepted result including review/rework. Return to the normal route when the exceptional work ends. Verify current model capabilities/prices when making purchasing or model-selection decisions.

Set per-delivery-unit ceilings for inputTokens, outputTokens, totalTokens, costUsd and peakAgents. Null means unconfigured, never unlimited approval or zero use. The starting concurrency limit is one; authorize and budget independent parallel work when it is useful. Preserve real model context capacity; reduce irrelevant input instead of lowering reported context capacity or dropping instructions. Set actual pre-run caps in the harness/provider where supported, and check remaining budget at handoffs.

```sh
gated-pipeline cost-check usage.json --json
```

A project-relative usage file follows `.gated-pipeline/schemas/usage.schema.json`: schemaVersion 1, safe source/reference, inputTokens, outputTokens, cachedInputTokens, costUsd and peakAgents, with explicit null for unavailable counters. Use actual provider/harness receipts. Cached tokens are a subset of input, so totalTokens = inputTokens + outputTokens; do not subtract cache twice. Use consistent units and the same unit of work as the policy. API dollar estimates do not measure subscription-plan deductions.

The command reports each configured limit, measured value and within_budget/exceeded/unknown status. Exceeded or missing measurements for a configured limit exit nonzero; no configured limits also returns unknown. Unconfigured dimensions are listed and are outside the verdict. The result is a check on declared, already-recorded usage; it cannot stop a running agent, validate a receipt's truth, aggregate concurrent workers automatically or guarantee future spending. A runner must provide complete unit-level totals and wire the check into its handoff/CI flow to make it a gate.

[Execution guidance](../../.gated-pipeline/guides/execution-cost.md) covers progressive context disclosure, bounded reviewer packets, evidence reuse and escalation. Save compact handoffs before context loss. Measure actual usage before claiming savings from shorter files.
