# Traces — pipeline self-observability (smart logging + metrics)

The compounding loop makes each *unit* smarter; this makes the *pipeline* smarter. Every merged unit appends one structured line to **`pipeline-log.jsonl`** — a machine-aggregatable trace of how the pipeline actually ran — and a periodic **process-trace review** computes metrics over the log and recommends process changes (profile/tier calibration, new gate checks, retired ceremony).

The trace data already exists: it's the **typed handoff mirrors** each gate emits (`.claude/rules/handoff-schema.md`). Tracing just persists them per unit, plus a few derived counts.

## The log — `docs/traces/pipeline-log.jsonl`

Append-only, one JSON object per merged unit (gate 9 writes it on merge). Greppable, diffable, never rewritten. One line:

```json
{
  "pr": 0, "date": "YYYY-MM-DD", "unit": "<slug>", "profile": "full|docs|chore",
  "gates": [
    {"gate": 5, "result": "PASS", "tier": "opus", "findings": {"blocking": 0, "important": 1, "nit": 1}, "fail_rounds": 0}
  ],
  "rework_rounds": 0,
  "escapes": [],
  "cost": {"tokens": null, "duration_min": null}
}
```

- `gates` — one entry per gate that ran, distilled from its typed mirror (result, model tier, findings by severity, FAIL/loop-back rounds).
- `rework_rounds` — total FAIL loop-backs this unit (a rework signal).
- `escapes` — defects found **after** merge that an earlier gate should have caught. Usually empty at write time; the process-trace review (or a later bug traced to this unit) **backfills** it: `{"found_pr": N, "should_have_caught": "gate-7", "what": "…"}`. This is the highest-value signal in the whole log.
- `cost` — tokens/duration if the harness exposes them; null otherwise.

## Metrics the process-trace review computes

- **Catch distribution** — findings by gate: which gates earn their keep, which rarely catch anything.
- **Rework rate** — mean FAIL rounds/unit and its trend; a gate that FAILs often points to an upstream-gate quality gap.
- **Escape rate** — escapes ÷ units, and *which gate* each escape should have been caught by. The core "is the pipeline actually working" number.
- **Profile calibration** — escape rate by profile: are `docs`/`chore` letting defects through? Should a surface be forced to `full`?
- **Tier calibration** — escapes on sonnet-tier gates that opus might have caught (adjust tiers).
- **Cost** — tokens/duration by profile, to weigh ceremony against payoff.

Findings graduate as process changes (an ADR + a card edit) through the normal gates — the pipeline improving itself with evidence, not vibes.
