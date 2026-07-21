# Gate 6 — Test

Agent: `tester` · Model tier: **sonnet** (verification gate; default).

## Exit criterion

Every AC traced to an automated test; all tiers green; core coverage ≥90% lines.

## Artifact

Evidence block → PR

## Profile behaviour (chore)

Under **chore**, gate 6 merges into the combined 5–6 review-and-verify run (one run, one `GATE: 5–6` block with en dash — a separate gate-6 run happens only under full/docs). The pyramid runs at most once per head SHA — cite the owning run + head SHA instead of re-running (single-evidence rule; force-fresh only on recorded suspicion). Record which profile you ran under in your exit block.

**Within-gate fan-out** (CORE cross-gate rule): gate 6 is eligible. MAY spawn concurrent dimension-checkers (e.g., one for test traceability, one for client-perf budget) synthesized into one verdict + one exit block.

## Procedure

1. **Traceability:** map each acceptance criterion → the specific test proving it. AC without a test → write the test, or FAIL with why it can't be automated and what manual check substitutes.
2. **Run and record:**
   - your test command (all workspaces)
   - your core-coverage command — ≥90% lines on the core package
   - Integration suite — actual route handlers against an in-memory test DB via your test-DB helpers; an in-memory test DB fidelity limits recorded per PR
   - your e2e command
3. **Probe edges** the ACs imply but tests miss: the edge cases your domain implies (boundary values, date math, idempotency, token reuse — see STACK.md).
4. Paste command tails, suite counts, coverage % into your exit SUMMARY.

A flaky test is a FAIL, not a retry-until-green.

## Test tiers detail (CORE one-line pointer)

- **Unit** — your unit runner, colocated tests, across all packages. the core package ≥90%-lines coverage gate.
- **Integration / functional** — your unit runner invoking actual your framework's route handlers against an in-memory test DB with committed migrations (your test-DB helpers). Active since S1 — no handler mocks, no fake suites; an in-memory test DB fidelity limits recorded per PR.
- **E2E** — your e2e runner in your e2e test dir, serial (`workers: 1`, `fullyParallel: false`, `retries: 0`), pinned alphabetical spec order load-bearing (specs share fixture state). A new or renamed spec file is checked against the fixture-mutation order at gate 8. Growth path (per-spec fixture isolation) decided before ~40 tests.

## Client perf budget (folded dimension — gate 6 owns; CORE one-line pointer)

Reference **[`.claude/rules/perf-budgets.md`](../perf-budgets.md)** for the single source of the numbers. The budgets this gate enforces:
- **Bundle size:** public route first-load JS ≤ 130 KB (gz); app-shell (`/a`, `/u`) first-load JS ≤ 180 KB (gz).
- **Core Web Vitals:** LCP < 2.5 s · CLS < 0.1 · INP < 200 ms.

A breach at either ceiling is a **blocking** finding at this gate. Until the S6 CI bundle-assert exists, enforce by inspecting the build output's first-load-JS line.

## Prereqs

A gate-5 PASS handoff (no unresolved blocking findings). Under chore/parallel: a gate-5-in-progress or recorded parallel authorization. On missing: `prereq-missing` to code-reviewer inbox, exit FAIL.

## Handoff

PASS → `handoff` with gate block to `.claude/pipeline/agents/security-reviewer/inbox.md`. Bugs found → `bug` to developer inbox (and FAIL if blocking).
