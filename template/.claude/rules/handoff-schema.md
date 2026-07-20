# Handoff schema — typed mirror for gate exit blocks & inbox messages

Canonical home ([ADR-025](../../docs/decisions/ADR-025-typed-gate-handoff-envelope.md)). The prose `GATE/RESULT/ARTIFACT/SUMMARY/HANDOFF` block and the `## MSG` envelope (PROCESS CORE §Gate exit block, §Messaging) stay human-canonical; this defines the **machine-readable mirror** appended to them. On any divergence, the prose wins and the mirror is the bug.

## When required

- **Required:** every gate exit block; every `handoff`-type inbox message (state crossing a gate boundary).
- **Optional:** `question` / `bug` / `nit` notes that carry no gate decision.

## Fields

| Field | Type | Meaning |
|---|---|---|
| `gate` | number \| string | Gate number, `"5–6"` for the chore combined run, or `0` for a Phase-0 discovery handoff. |
| `name` | string | Gate/phase name (`develop`, `code-review`, …). |
| `result` | enum | `PASS` \| `FAIL` \| `PASS_NA` \| `SKIP` (SKIP only for Phase 0). |
| `profile` | enum | `full` \| `docs` \| `chore` (the PR's gate profile). |
| `head_sha` | string | Short SHA the evidence was produced against (single-evidence rule anchor). |
| `artifact` | string[] | Repo path(s) or PR link(s) this gate produced. |
| `next` | string \| null | Recipient agent's home name, or `null` at gate 9. |
| `blocking` | object[] | Open BLOCKING findings the receiver must clear before proceeding. `[]` on PASS. Each: `{file, line, what}`. |
| `needs` | string[] | The typed `HANDOFF` — specific things the next gate must verify/know. |
| `evidence` | object | Per-check status, e.g. `{"lint":"pass","typecheck":"pass","tests":"n/a — docs","coverage":"91%"}`. |

## Example (gate 4, docs profile)

```json
{
  "gate": 4,
  "name": "develop",
  "result": "PASS",
  "profile": "docs",
  "head_sha": "1c1f581",
  "artifact": ["docs/requirements/BR-017-...md", ".claude/rules/checklists/"],
  "next": "code-reviewer",
  "blocking": [],
  "needs": ["confirm 'one rule one home' — no list duplicated between a card and a checklist"],
  "evidence": {"lint": "n/a — no TS", "typecheck": "n/a — no TS", "tests": "n/a — docs profile"}
}
```

## Example (inbox handoff message)

Append the same object below the prose `## MSG` envelope, in a JSON code fence. A receiver resolving the thread edits the prose `STATUS:` line as before — the mirror is not rewritten on resolve (it records the handoff as sent).
