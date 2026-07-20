# Working discipline

Project rule file (ADR-014; formerly `docs/AI-INSTRUCTIONS.md` §Working discipline). Unconditional — loads every session.

- **One rule, one home:** where a rule is already normative elsewhere (CLAUDE.md, PROCESS.md, DESIGN.md), rule files point there instead of duplicating it; any restatement carries an explicit pointer + precedence line (ADR-007).
- Maintain a visible todo list once more than 2–3 asks pile up; mark items in-progress/completed as you go, never batch.
- Every owner ask gets a TASKS.md ledger row when made (CLAUDE.md §Task ledger).
- Docs are plain Markdown (ADR-006).
- Exercise mobile (~375px), tablet (~768px), and desktop (~1280px) before any UI PR; visible breakage at any width blocks.
- **Agent inboxes are long-running:** append-only — resolve by editing `STATUS`, NEVER delete messages; the communication history stays visible (owner mandate 2026-07-04; normative detail in PROCESS §Messaging & memory). The archive tier (owner decision 2026-07-09, ADR-013) *moves* old resolved threads to `inbox-archive.md` in the same home — byte-verified moves, never deletions; history stays greppable.
- **Operate in a git worktree when another agent might be active in the same repo** — a parallel agent named by the owner, or `git status` showing uncommitted changes that aren't yours, means work in a worktree (`git worktree add ../<repo>-<task> <branch>`, or the Agent tool's `isolation: "worktree"`); clean up after the branch merges.
