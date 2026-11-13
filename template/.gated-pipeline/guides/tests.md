# Test-first

Tests are written from the acceptance criteria before any production code, and they must fail first.

- **Developer, gate 4, red phase.** Write the unit-tier cases the design names, at least one per applicable acceptance criterion, run them on the unchanged branch, and record the failing run as a red receipt: the commit, the command, its nonzero exit code, a durable reference to the output, and the test paths. Commit the tests before the first production-code commit so history proves the order. Then implement until every red test passes.
- **Tester, before gate 4 completes, red pass.** From the same acceptance criteria, write the browser-tier or integration specs for user-visible contracts, run them red against the unchanged branch, commit them, and hand the developer a red receipt attributed to your own actor. Never write production code or fixtures that fake the feature. When the design names no browser contract, hand the developer a disposition for the gate-4 attempt instead: `noBrowserContract` with your actor, a reason that explains itself (at least forty characters and four distinct words; placeholders such as "n/a" are rejected) and at least two distinct artifacts you inspected. The `full` profile needs your receipt or that disposition.
- **Gate 4 cannot complete** until every red test from both authors passes on the reviewed revision. A red test whose assertions were removed, that gained a skip marker, or that was deleted on the way to green is a blocking finding at review; a deliberate change needs a recorded reason confirmed by the tester.
- **The two red phases run concurrently.** Gate 3 hands off to the developer and the tester at once; implementation starts on the developer's own receipt and does not wait for the tester's.

- **Red commits hold tests only.** A CI workflow line changes what runs, so `.github/workflows/` is production code for ordering; put it in the production commit.
- **Run from a clean export.** Execute the configured command from `git archive` of the head, not from a worktree that may carry uncommitted edits, and cite the whole command.
- **Flaky runs.** A failure on a test the change did not touch is a failed run. Rerun the whole command at the same head and cite that run; record the test in the ledger for a later unit. Never retry one test, allow-list it or add a skip marker.
- **Merges of the target branch** are not this branch's commits: the inspector walks first parents, and credits an assertion loss or skip gain on a red test only up to what the merged-in side itself changed.

Declare what counts as a test path in `pipeline.config.json` under `paths.tests` (and `paths.e2e`); the receipt's own test list always counts. Everything else outside documentation, framework and adapter files is production code for ordering purposes.

`gated-pipeline test-first --base=<sha> --head=<sha>` checks commit order and red-test integrity from Git alone, so CI can run it on every branch. `gated-pipeline check … --base=<sha>` additionally binds each recorded red receipt to the branch. Neither judges whether a test proves its acceptance criterion; the tester and approver do.
