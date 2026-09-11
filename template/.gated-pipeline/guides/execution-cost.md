# Model and context cost controls

Keep the quality contract fixed while reducing work that contributes no evidence.
This guidance selects work by difficulty; it does not change personal defaults,
call an API, launch agents, or override a user-selected model.

## Model and effort selection

| Work | Starting point | Escalate when |
|---|---|---|
| File inventories, log extraction, formatting, status checks | Deterministic CLI first; small model only when interpretation is needed | Output is ambiguous or needs a design decision |
| Bounded implementation with clear tests, routine design, documentation | General coding model with medium effort | A failed approach reveals a cross-cutting problem or missing invariant |
| Auth, money, privacy, destructive operations, unfamiliar architecture, difficult independent review | Strong reasoning model with high effort | The failure needs deeper reasoning; record the reason for an exceptional maximum setting |

Choose actual models offered by the current provider/harness. For Codex, Sol
is an everyday coding candidate, Terra a lower-cost candidate to evaluate,
and Astra a candidate for demanding work. For Claude Code, select its available
general or stronger model using its native configuration. Provider names and
effort levels are not interchangeable. Existing project risk-specific model
requirements take precedence. Do not downgrade a security review because the
remaining plan balance is low.

Evaluate a cheaper choice on representative completed tasks with meaningful
negative controls. Record completion, review findings, repair rounds, elapsed
time, actual model/effort and observed usage when exposed. Compare total cost
through acceptance, including retries and reviewer work. Unknown usage stays
unknown; file size and API prices cannot predict subscription deductions.

## Progressive context disclosure

1. Keep root instructions short: invariant rules and links to applicable detail.
   Store full procedures outside native automatic rule-discovery directories.
2. Use `gated-pipeline context --gate=N` to index shared/current-role files. Its
   project-owned `.gated-pipeline/context.json` is a reading aid, not an authority
   allowlist. Add task BR/TDS, applicable nested instructions, source and tests.
3. Reuse instructions already read and still available in this conversation when
   their bytes are unchanged. A fresh agent, resumed session or compaction must
   reacquire needed instructions. `--previous=snapshot.json` compares disk hashes;
   it cannot measure the model's memory or certify that a file was read.
4. Keep current status, blockers and evidence links at the top of memory. Archive
   resolved history with verified byte preservation; read it only when relevant.
5. Read targeted ranges and structured summaries. Keep full logs as artifacts;
   print command, exit status, test totals, skips and failure excerpts. Do not
   drop findings, hide errors or replace evidence with a model-written summary.

`--budget-bytes=N` is an advisory threshold. Over-budget output keeps every
required path. It calls for narrower task context or smaller durable documents,
not silently discarding constraints. The default 64KiB is a document-size warning,
not a model context limit, token cap, currency budget or measured cache saving.
Keep the model's context capacity accurate. Reducing `model_context_window` or
an instruction-size cap can force earlier compaction or truncate requirements;
use selective loading to reduce input and measure the result before changing
provider limits. Cached tokens and compacted history still have provider-specific
costs. A smaller visible conversation is not proof of lower total usage.

## Avoid repeated work

Use an independent reviewer where required. Give that reviewer a bounded packet:
scope, current full SHA, diff/base, BR/TDS, applicable rules, test evidence and
known failures. It must inspect source and may request more context. Avoid full
conversation forks and default multi-dimension fan-out for small changes.
Delegation can cost more total tokens even if the parent context is smaller.

Run a test suite once per relevant source/environment/configuration revision,
then cite the actual run in later gates. Freshness and meaningful negative
controls still apply. Poll CI with bounded waits and concise state changes;
there is no reason to pay a model to repeatedly reread an unchanged success log.
Never put paid model reviews in CI when deterministic checks suffice.

## Provider controls and limits

Official references checked September9,2026:
[Codex configuration](https://learn.chatgpt.com/docs/config-file/config-reference),
[progressive skill loading](https://learn.chatgpt.com/docs/build-skills),
[Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol),
[Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra),
[Astra](https://developers.openai.com/api/docs/models/gpt-6-astra),
[Claude cost controls](https://code.claude.com/docs/en/costs),
[Claude model configuration](https://code.claude.com/docs/en/model-config).
Check actual installed versions and available models before applying settings.
These are routing/context controls; no model training or paid fine-tuning is
needed to adopt them. Measure actual plan usage separately from API billing.

## Calibrate on real delivery units

Before changing routes, collect three to five real units with the same acceptance
boundary, task/risk mix and a stated quality observation window. Use the shipped
`.gated-pipeline/schemas/calibration.schema.json` and run
`gated-pipeline calibrate samples.json --json` locally. Keep actual evidence in an
existing private ignored location. This is advisory, not a new gate or service.

Record one execution ID per implementation/review/verification attempt, actual
head/tool/model/effort, and a safe evidence reference. Include failed attempts,
abandoned work and every independent worker. Null means unavailable. Mark the
inventory complete only after reconciling it at the acceptance boundary. Usage
references must identify disjoint execution deltas; never sum repeated cumulative
session counters or charge a reused test receipt again. Record checks run/reused
and selected context packet bytes when known. Context bytes do not prove reading,
cache hits or token savings. A fresh reviewer still loads applicable instructions.

Inspect coverage before comparing costs: partial sums are labelled, missing totals
stay unknown, and incomplete/open populations cannot report cost per accepted
unit. Compare like cohorts and quality evidence, not raw model-count rankings.
Capture real counters on future work if the retrospective evidence is incomplete;
do not re-run completed work just to manufacture a cheaper comparison. Neither
this command nor shorter files measure subscription deductions, and calibration
does not override configured model choices, security review or evidence freshness.
