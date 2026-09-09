# Standards

Owner: record the accountable human in `ai-repository.json`. This is project-owned policy; replace each unconfigured entry with a decision or a link to an existing standard.

| Standard | Authoritative record | Project decision to complete |
| --- | --- | --- |
| Coding | `STACK.md`, nearby code and configured format/lint checks | Language conventions, error handling, interfaces and test boundaries |
| Architecture | `docs/design/`, `docs/decisions/`, `pipeline.config.json` document links | Dependency direction, data ownership, deployment boundaries and tradeoffs |
| Process | `docs/PROCESS.md` and current gate card | Applicable profile and project exceptions with reasons |
| Frameworks/tools | `STACK.md`, dependency manifests and lockfiles | Supported runtimes, approved tools, update cadence and executable verification commands |
| Style | Formatter/linter configuration and project design guidance | Naming, UI/content conventions, accessibility requirements and review expectations |

Use existing conventions unless changing them is within the task. Propose a decision record for material architecture/tool changes, including alternatives, operational cost and rollback. Keep one authority for each rule; link it from this index. Never infer that installing this scaffold approved a framework or tool.

Verification commands belong in `pipeline.config.json`; humans/CI decide whether evidence from those commands is meaningful. A standard with no automated check still needs a named reviewer and explicit evidence. Record exceptions with scope, owner and revisit date; do not silently remove a gate.
