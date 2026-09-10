# Reuse evidence without changing what it proves

Load when deciding whether a prior check or audit can satisfy current work.
Reference the original immutable receipt and state which checks ran now, which
were reused, and which remain unknown. Reuse saves execution and context; it
never makes an old observation a new run or resolves a recorded failure.

A receipt needs the source SHA (and relevant diff or artifact digest), command
and tool version, scope, result, timestamp, environment/platform, configuration
and limitations. Dependency audits also need a normalized digest of the actual
installed name/version inventory and interpreter/runtime/platform. A lockfile
alone does not prove what the released environment installed. Do not put PII,
secrets, credentials or private inventory into public evidence.

Reuse a deterministic result only if its inputs and relevant environment still
match. An independent reviewer may rebind unaffected evidence to a new head
with an explicit inspected-diff justification; never just replace its SHA.
Rerun affected checks after source/configuration, dependencies, tool versions,
platform, install method or test scope changes, incomplete runs, or fixes to
prior findings. Tests validate execution; static inspection does not replace them.

Security evidence has additional expiry: record the project's maximum age and
the observed advisory database/tool revision or query time. Refresh after expiry,
new applicable advisories, changed exposed services/configuration, missing
provenance or a changed actual inventory. If no freshness policy exists, obtain
current advisory results at release readiness. Reuse the stable source/control
analysis where justified; freshness checks and current deployment readiness still
apply. A source SHA match alone cannot certify a live environment or current CVEs.

Production verification refers to the actual released artifact/environment.
Local tests, a docs merge or a green pipeline are not proof of deployment.
Record uncertain controls as partial/unknown and retain rollback limitations.
An earlier authorization for an identical audit service/payload scope may persist;
changed disclosure or authority still needs assessment. This procedure does not
call an external service or expand permission to send inventories anywhere.
