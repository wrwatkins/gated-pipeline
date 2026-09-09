# Adoption, quality and ROI

Choose a reporting window, eligible work population and comparison baseline before interpreting outcomes. Start with unknown measurements; do not convert missing history into zero failures or invented savings. Store aggregates and safe evidence references, without personal payloads or individual productivity rankings.

| Metric | Definition and evidence |
| --- | --- |
| Adoption | Eligible delivery units with attributed agent work / all eligible units; define exclusions |
| Acceptance | Units accepted without a subsequent correction / observed completed units, with a stated observation window |
| Rework | Failed gate attempts, correction time and follow-up fixes per unit; preserve failures |
| Lead time | Elapsed time from accepted card to verified deployment; also report review/queue time when available |
| Quality | Escaped defects and incidents by severity and observation window; missing follow-up stays unknown |
| Effort | Actual human review/implementation time plus agent execution time; record overlaps before summing |
| Cost per accepted unit | Measured allocated inference/tool/infrastructure cost divided by accepted units; include failed attempts and reviews |
| Net benefit / ROI | Comparable baseline cost minus observed total cost; divide net benefit by observed investment only with defensible inputs |

Report sample size, task/risk mix, source revisions, missing data and any attribution limitations. Compare model/prompt versions on similar work and total cost including rework. Document whether a number is observed, estimated or unknown and how estimates were produced. Adoption is not quality; faster completion alone does not prove business value.

Use `docs/traces/` and existing evidence for gate outcomes; usage receipts and cost-policy checks support cost reporting. The scaffold supplies definitions and record validation, not a telemetry collector or ROI calculator. Capture a measured baseline before claiming improvement, and review these results at the project's cadence boundaries.
