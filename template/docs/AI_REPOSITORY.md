# AI-first repository map

`ai-repository.json` routes nine areas to their project-owned homes. Fill the project decisions in those homes; link existing authoritative documents instead of copying them. Run `gated-pipeline governance` to validate the map, prompt fingerprints, declared audit records and budget configuration.

| Area | Home | Load when |
| --- | --- | --- |
| Standards | [Standards](standards/README.md) | Designing, changing or reviewing code/tooling |
| Context | [Project context](context/PROJECT.md) | Starting work or changing scope/boundaries |
| Prompts | [Prompt lifecycle](prompts/README.md) | Selecting or changing a specialized skill |
| Orchestration | [Delivery flow](orchestration/README.md) | Planning delivery, handoffs or deployment |
| Audit | [Audit trail](audit/README.md) | Recording actions, decisions or evidence |
| Security | [PII and access](security/README.md) | Handling personal data, secrets or trust boundaries |
| Responsibilities | [RACI](governance/RACI.md) | Assigning ownership or deciding authorization |
| Metrics | [Measurements](metrics/README.md) | Evaluating adoption, quality or ROI |
| Cost | [Cost governance](cost/README.md) | Selecting models, budgets or concurrency |

The map is an index, not a preload list. Read applicable project policies before acting; defer unrelated detail. `.gated-pipeline/context.json` indexes shared/current-gate files, but cannot discover every task-specific constraint. Route local policies there as required paths when they apply to every task at a gate. After compaction or a new session, reacquire required context.

`docs/PROCESS.md` remains the gate contract; `pipeline.config.json` owns executable check commands; `STACK.md` owns stack invariants. Provider adapters only route to these authorities. Installation/sync creates these homes once and preserves later edits. If a home already exists, reconcile it with this contract; preservation does not prove it is complete.

A structurally valid repository is not proof of adoption, compliance or savings. Assign human owners, collect actual evidence and review outcomes.
