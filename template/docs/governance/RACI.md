# Human and agent responsibilities

Assign a real accountable human for each area in `ai-repository.json`; null explicitly means unassigned. The table describes roles, not fabricated approvals or named people. R = responsible for work, A = accountable for the outcome, C = consulted, I = informed.

| Activity | Product/project owner | Maintainer/developer | Agent or automation | Independent reviewer/security/ops |
| --- | --- | --- | --- | --- |
| Outcomes and acceptance criteria | A | R | R for authorized drafting | C |
| Architecture and standards | C | A/R | R for authorized analysis/implementation | C |
| Code and tests | I | A | R within assigned scope | C |
| Independent verification | I | A | R only when actually independent | R |
| PII/access decisions | A or named data owner | R | R for bounded assessment | C/R |
| Merge and deploy authority | A or delegated release owner | R | R within recorded authorization | C |
| Metrics and budgets | A | R | R for measured reporting | C |
| Incident response | A or named incident owner | R | R for authorized containment | C/R |

Resolve each alternative accountable role to one human owner for a delivery unit. A model never becomes accountable merely by completing a gate. Developers define clear outcomes, supply trusted context and meaningful tests, review tradeoffs, own operational impact, and maintain the standards and reusable prompts.

Human gates are actual decisions: scope/acceptance, material business or data-access changes, and required release authority. Honor authorization already given for the current scope; carry it into handoffs. Do not invent fresh approval requests at every step. Pause only when needed authority is absent, the action exceeds authorized scope, or a required check fails. Independent agent verification remains verification, not a substitute for a specifically required human decision.

Record the actual author, reviewer and verifier separately in PR evidence. A fresh process identity is not by itself independent review: the reviewer must perform the work and disclose shared authorship/context limitations. The existing gate evidence validator checks declared identities and revisions; people and harness controls establish real independence.
