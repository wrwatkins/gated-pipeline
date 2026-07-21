# Code & engineering defaults

Project rule file (formerly `the project's earlier instructions file` §Code & engineering defaults). Unconditional — loads every session.

- Never speculate about code in files you have not opened and read.
- Don't add comments narrating what you added or removed.
- Don't rename symbols/variables while refactoring.
- Prefer well-known libraries over roll-your-own.
- All new and updated logic is covered by automated tests **at its appropriate tier** — unit for pure logic, integration for route handlers, E2E for flows (PROCESS §Test tiers; supersedes the earlier blanket unit-test wording. The int-tier-first practice for handlers was always the sanctioned reading).
- Run a SAST scan after every task.
- Lint, typecheck, and tests green before any PR (PROCESS §Scans — all blocking).
- The pre-PR completion bar is the shared **Definition of Done** checklist — [`.claude/rules/checklists/definition-of-done.md`](checklists/definition-of-done.md).
