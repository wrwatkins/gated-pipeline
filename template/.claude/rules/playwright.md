---
paths: ["apps/web/e2e/**", "**/playwright.config.*"]
---

# Playwright / E2E rules

Project rule file (formerly `the project's earlier instructions file` §Playwright rules + the §Testing console-watcher rule). Loads when E2E files are worked on.

- `getByRole` / `getByLabel` over CSS/XPath selectors.
- Never `page.waitForTimeout` — use web-first assertions.
- `baseURL` set in config, not per-test.
- Shared interaction helpers required (`apps/web/e2e/helpers.ts`); adopt Page Object Model at scale, ~40+ tests (supersedes the earlier blanket POM mandate resolution; the shipped 8-spec suite is functional-helpers and healthy).
- Retries: `0` everywhere; a flaky test is a FAIL (supersedes the earlier 2-in-CI guidance resolution).
- `workers: 1`, `fullyParallel: false`, pinned alphabetical spec order — the suite manages cross-file fixture state by order, not isolation (normative detail in PROCESS §Test tiers; gate 8 checks new/renamed specs against the fixture-mutation order).
- **E2E tests must watch the dev console and assert clean at the end.** A page can render the expected DOM and still throw in the console — the visual assertion passes, the bug ships. `apps/web/e2e/console.ts` implements the pattern: attach the watcher before first navigation, allowlist only documented third-party noise, assert clean at the end. A real console error means fix the code, never grow the allowlist to pass.
