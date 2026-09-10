# Ordinary documentation fast path

Use `docs-lite` only after the project has adopted this profile. It uses two
actual records: author preparation (gate 4), then one independent local
reviewer who verifies the docs, CI and merge readiness (gate 5). No synthetic
N/A planning records or separate gates 6–9. Existing `full`, `docs` and `chore`
profiles keep their nine-gate contract. This profile grants no merge authority.

## Eligibility before implementation

A reviewed `docs-policy.json` must already exist in the trusted PR base. The
installed default has an empty `paths` array, which disables the profile. Opt in
through the normal review path with narrow exact files or directory prefixes:

```json
{"schemaVersion":1,"paths":["README.md","docs/user-guide/"]}
```

Use full base and head commit SHAs observed independently from the actual PR.
The base must be an ancestor of head; if the current target moved, refresh the
branch and evidence before using this path. A caller-selected historical base
is not proof of the current PR scope.

```sh
gated-pipeline docs-scope --base=<trusted-base-SHA> --head=<current-head-SHA> --json
```

The helper inspects the complete committed diff, including additions, deletions
and both sides of renames. Only regular, non-executable Markdown in the base
allowlist is eligible. It rejects hidden files, symlinks, binary content,
whitespace errors and named policy/security/release/audit/evidence/instruction
paths. Head cannot authorize its own policy expansion. It reports paths and a
diff hash, never a model verdict. A filename allowlist cannot establish semantics.

The independent reviewer must read the actual diff. Reject behavior changes,
commands that alter execution, agent instructions, framework/tool selection,
security or access rules, governance, release/audit verdicts, generated evidence,
or content consumed by runtime/CI/loaders even when stored in `README.md`.
Ambiguous or mixed work uses the normal profile. Never downshift after a failure
to avoid it. If scope expands, retain the compact record as linked history and
start the applicable full/chore sequence; preserve unresolved findings.

## Evidence and merge

Use the normal evidence schema with `profile: "docs-lite"`, current `headSha`
and only gates 4 and 5 in `attempts`:

| Gate | Actor | Required passing evidence |
|---|---|---|
| 4 | Actual author | `docs`: complete-diff whitespace, links and relevant documentation validation |
| 5 | Independent reviewer | `scope`: semantic eligibility; `docs`: actual docs verification; each exact name in `pipeline.config.json` → `ci.requiredChecks`, with source `ci` |

Configure a nonempty set of fast deterministic CI jobs. Keep the project's
existing named-check/publisher policy and verify every conditional skip against
the actual diff; this profile does not edit CI or its protection rules. In the
framework record, every required CI name needs a passing CI result. Never record
a skipped job as a passing execution. Projects with conditional jobs use their
own declared checker to validate allowed skips and still require fast green CI.

The author cannot review themselves even if `independentReview` is disabled for
other profiles. Record actual tool, actor, model and run; a renamed author run
is not independent. Keep failed attempts and explicit finding resolutions.
A new author attempt invalidates the downstream review, even on the same SHA.

```sh
# Preparation/draft before the independent review:
gated-pipeline check <record.json> --base=<base-SHA> --head=<head-SHA> --through=4
# After the reviewer has verified scope, docs, CI and readiness:
gated-pipeline check <record.json> --base=<base-SHA> --head=<head-SHA>
gated-pipeline pr-body <record.json> --base=<base-SHA> --head=<head-SHA>
```

Defaults (`check` through 9 and `pr-body` through 8) both require the complete
two-record sequence for this profile. Through 4 is preparation only. The CLI
recomputes scope from Git instead of trusting supplied eligibility JSON. Review
metadata and CI references remain declarations: the reviewer must inspect their
real sources, then follow the [merge-readiness skill](../skills/merge-readiness.md)
for current-head named-check verification and an authorized SHA-bound merge.
