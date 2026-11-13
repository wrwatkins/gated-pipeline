# Code review dimensions

- Correct behavior and failure handling against requirements.
- Input provenance, current authority, ownership and cross-user isolation.
- Project invariants and architectural boundaries from STACK.md.
- Real regression assertions, suite completion and relevant edge cases.
- Red receipt present for the profile; no red test weakened, skipped or deleted between its red commit and the head.
- Concurrency, idempotency, resource bounds and recoverability when applicable.
- Simplicity, dependency risk and documentation accuracy.

Findings need IDs, severity, location, observed consequence and a concrete fix. Keep uncertainty explicit.
