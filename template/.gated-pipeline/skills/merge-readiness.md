# Local merge readiness

Framework skill version: 1.1.0; delivered and fingerprinted by the installed framework release.

Use immediately before an authorized merge. Run locally in the current Codex,
Claude or other agent workflow. No bot approval, hosted AI review or additional
agent is needed to run these deterministic checks. Code review itself must be
performed independently where the project requires it; use its existing reviewer
or an authorized independent agent, never a renamed author session.

1. Read current project merge policy, applicable gate evidence and the actual
   independent review. Preserve user authorization already given for this scope.
   `gated-pipeline check <evidence.json> --head=<current-head> --through=9`
   validates the framework gate contract. For opted-in ordinary prose, follow
   [docs-lite](../guides/docs-lite.md) and also supply `--base=<trusted-base>`;
   its final validation covers gates 4 and 5. For a project with its own evidence
   schema, run its declared checker and audit its gate blocks instead.
2. Obtain the PR's current full head from GitHub. Confirm the intended repository,
   target branch, full base SHA, open/non-draft state, real review result and no unresolved
   changes requests. Never change the SHA on old evidence to make it match. If
   only docs changed, the reviewer must inspect that delta and explicitly rebind
   the result. Record actual author/reviewer tool, model and run in PR attribution.
3. Create a minimal review receipt from that completed review (shape below), and
   read `merge-policy.json` from the reviewed project. Required check names and
   publishers must come from the project's trusted policy/workflows, not whatever
   checks happened to appear. Policy edits are reviewed changes. An empty list
   fails. A skip is allowed only for the named job's documented, verified condition.
4. Fetch all **latest** check runs for that same head:
   `gh api "repos/<owner>/<repo>/commits/<head>/check-runs?filter=latest&per_page=100" --paginate --slurp > <checks.json>`.
   Run `node .gated-pipeline/workflows/merge-readiness.mjs <head> <review.json> merge-policy.json <checks.json>`.
   Missing, stale, pending, failed, unapproved skipped/neutral or wrong-publisher
   checks fail. This checker compares declared review metadata; inspect the real
   cited evidence. It does not authenticate identities or verify receipt truth.
5. Re-read the PR head immediately before merging. If it moved, stop and obtain
   current review/check evidence. With authorization and all gates satisfied,
   merge as the normal authorized account using
   `gh pr merge <number> --repo <owner>/<repo> --merge --match-head-commit <head>`.
   Never use `--admin`, bypass branch rules or push directly to a protected branch.
   A head/base-move rejection requires refreshed evidence; do not blindly retry.
   Record the actual merge SHA, decision, actor and checks in the audit/trace.

Minimal receipt (replace synthetic identities with actual review metadata):

```json
{"schemaVersion":1,"headSha":"<full-reviewed-head>","result":"PASS","author":{"id":"<actual-author>","tool":"<actual-tool>","runId":"<actual-run-or-null>"},"reviewer":{"id":"<actual-reviewer>","tool":"<actual-tool>","runId":"<actual-run-or-null>"},"evidence":["<actual-review-reference>"]}
```

Use JSON null for an unavailable run, never a fabricated identifier. Full model
attribution remains in the referenced gate/PR record. The named-check policy is
`{"schemaVersion":1,"checks":[{"name":"<exact-job-name>","app":"github-actions","conclusions":["success"],"skipReason":null}]}`.
For a legitimately conditional job, add `skipped` and a concrete skipReason;
verify that condition for this diff. Required check names can refer to existing
hosted or self-hosted runner jobs. This skill adds no Actions job, runner or model
API call; changing where existing CI runs is a separate project decision.

## Complete committed diff

Before review, capture the base/head and enumerate all changed files with
`git diff --name-status --no-renames <base> <head> --`. Inspect deletions and
renamed sources as well as new destinations. Run
`git diff --check <base> <head> --`; a clean `git diff --check` alone sees only
unstaged tracked edits and says nothing about already committed whitespace.
Before committing, also inspect `git diff --cached --check`, the staged file list
and `git ls-files --others --exclude-standard` so newly added evidence is included.
After the commit, rerun the complete committed-diff check at the actual head.
Record exact scope, command and result. Re-read source/target movement before
merge and refresh affected review/check evidence; preserve earlier failed rounds.
