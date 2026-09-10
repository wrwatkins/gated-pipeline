# Coordinate a local agent team

Framework skill version: 1.0.0; delivered and fingerprinted by the installed framework release.

Use when multiple top-level agents or humans work in the same repository. Keep
one lead per delivery unit, one isolated worktree per writer, and independent
review where required. An existing lead is not permission to spawn a team inside
every task. Prefer bounded delegation and the smallest useful reviewer packet.

Before editing or reserving a shared operation:

1. Read the live task ledger, `git worktree list --porcelain`, relevant branch
   diffs and `node .gated-pipeline/workflows/team-coordination.mjs status`.
   A clean or unclaimed worktree does not prove its agent is idle. Locate the
   actual task owner; do not infer ownership from a model name or rewrite another
   agent's files, environment, database, hooks or server port.
2. Give the unit a unique descriptive id (for example, task slug + date + lead
   suffix). Reference full BR/TDS paths: a sequential number alone can collide
   between agents. Reserve new document IDs as shared resources before using
   them. Do not renumber historical records just to tidy the sequence.
3. Claim only the paths/resources needed, using a small JSON file and
   `node .gated-pipeline/workflows/team-coordination.mjs claim <claim.json>`.
   Required fields: `task`, `owner`, `tool`, `runId`, `paths`, `resources`.
   Use the actual unique task/session identity, not the generic name `root`.
   Paths are repo-relative files or directory prefixes, without globs. Shared
   resources can include `merge`, `deployment`, `port:18005`, `database:csp-test`
   or `document-id:BR-014`. Register a scope expansion before editing new paths.
4. A conflicting claim stops the overlapping work. Continue an unrelated owned
   task or arrange an explicit handoff. Claims are shared immediately across
   linked worktrees through the Git common directory; they are not committed,
   secret storage, distributed locks across separate clones or authentication.
   All participating leads must adopt the protocol. Inspect unregistered work
   before assuming a path is free; notify others only within user authorization.
5. Reserve the `merge` resource for one coordinator while verifying the final
   integration revision, named checks, review evidence and actual merge. Reserve
   `deployment` independently when a release is authorized. Recheck current main
   and interactions with other accepted changes. A green isolated branch does
   not establish a green combined release. Use the local merge-readiness skill.
6. Finish with a bounded handoff: unit/owner, branch/worktree, base/head, changed
   paths, accepted decisions, actual check receipts, unresolved findings, budget
   usage when exposed and next step. Put durable facts in the owning project
   docs; preserve prior failed attempts. Release with
   `node .gated-pipeline/workflows/team-coordination.mjs release <task> <owner> <runId>`
   from the owning worktree. Release a temporary merge/deploy slot by updating
   your own claim to remove that resource when the operation ends.

The helper uses an atomic directory lock plus atomic state replacement so two
writers cannot silently overwrite each other's claims. A busy/crashed lock fails
closed. Inspect its `owner.json`, the corresponding live process/task and saved
state before authorized manual recovery; never delete a lock because a timestamp
looks old. Claims do not expire automatically and cannot force another agent to
stop. This is coordination for cooperating local writers, not a security boundary.

Keep separate-clone or separate-machine teams on an explicitly chosen shared
coordination record; do not claim that local Git metadata reaches those agents.
Measure conflicts, duplicate runs and total accepted-work cost before adding more
workers. This skill launches no agents, paid services, watchers or GitHub jobs.
