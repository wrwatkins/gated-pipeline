# Synthetic non-production data policy — implementation handoff

Date: 2026-09-11
Status: PLAN READY; framework implementation, adoption, independent review, CI and merge are QUEUED.
Owner: next implementation agent; planning author Codex task 01a0904b-9ab3-73c3-a3e0-cfaf7acb4441.
Repository: gated-pipeline. Inspected base: 9d19525d20f06cb368fd16478b00afb13ebf45c4 (0.10.0).
Plan ID: GP-SYNTH-20260911.
Companion: woodsofindianrun, `docs/plans/synthetic-data-and-scale-testing-2026-09-11.md`, plan ID WIR-SYNTH-20260911.
Current disposition: the framework contract and misuse tests are implemented in draft PR #10 and remain subject to independent review and coordinator Gate 9; Woods generator adoption remains sequenced behind its plan integration.

This agent-readable plan records requested future work. It changes no installed
policy, validator, application, test fixture or workflow by itself. Implementation
must follow the existing gated process and preserve project-owned policy during
framework updates.

## 1. Required behavior and ownership

1. Real user PII must NEVER be used in local development, fixtures, tests, CI,
   demos or other non-production artifacts, including logs, screenshots, prompts,
   reports and caches. Require independently generated synthetic people/data;
   redaction or pseudonymization of a production dump is not a substitute.
2. Non-PII articles/events/public content are not subject to the general PII ban.
   Classification must include text, attachments and metadata: a public-looking
   article can contain PII. The framework must support stricter project rules.
   Woods permits only its existing map GeoJSON as production-derived dataset
   content in Git; that exception must be explicit in Woods, absent by default
   in the generic scaffold, and must not permit real resident identities or
   production member-to-map relationships. Synthetic relationships remain valid
   test scenarios and must never imply actual occupancy.
3. The owner conditionally authorizes a one-time read-only production shape
   profile only when source schemas/constraints cannot answer a concrete need.
   Keep raw data in the production boundary, store only non-identifying coarse
   aggregate/schema findings and a receipt preventing automatic repetition.
   Prefer source-only modeling, especially for Woods' fewer than 150 users.
   No automatic production connector, snapshot download or recurring refresh.
4. Provide reusable methods/contracts for deterministic synthetic generation,
   including larger article/event populations and plausible relationships,
   distributions, lifecycle/permission states, invalid inputs and workload skew.
   Application factories remain project-owned; the framework must not import
   Django or invent domain models.
5. All shared Woods local/integration/browser/performance dataset tiers must far
   exceed current production. Require project-defined numeric minima and verified
   per-model counts; tiny fixtures do not establish performance. The framework
   itself needs large synthetic record/project/receipt fixtures for its real
   metadata-processing paths, not an invented application user database.

## 2. Current implementation surfaces

| Existing home | Inspected behavior | Planned extension |
|---|---|---|
| [security policy template](../../template/docs/security/README.md) | Says “Prefer synthetic/redacted examples”; excludes production exports | Make synthetic PII mandatory and document the qualified non-PII/public-content rules |
| [governance](../../lib/governance.mjs), [schema validator](../../lib/schema.mjs), [CLI](../../bin/install.mjs) | Validate declared repository/audit/cost structures using bounded readers; structure is not content assurance | Add a narrow test-data policy/receipt validation and scan interface with explicit limits |
| [project config](../../template/pipeline.config.json), [AI repository map](../../template/ai-repository.json) | Project-owned governance and test commands exist | Define policy ownership, required hooks, coverage and receipt references without destructive migration |
| [framework manifest](../../framework-manifest.json), [scaffold](../../lib/scaffold.mjs), [doctor](../../lib/doctor.mjs) | Managed and project-owned update behavior already exists | Ship managed validation assets; preserve customized policy and report incomplete adoption |
| [tests](../../test/governance.test.mjs), [CLI docs](../../CLI.md), [examples](../../examples/README.md) | Synthetic framework examples and Node tests exist | Add canary/negative controls, larger synthetic processing fixtures and safe Node/Python adapter examples |

The package ships selected paths through package.json. New managed assets and
examples must be included in package checks and framework fingerprints. Root
planning docs are contributor handoff artifacts, not automatically installed
runtime policy.

## 3. Contract design for the implementing agent

Prefer a small versioned project-owned `test-data-policy.json` and a managed
schema/validator. Proposed fields and commands are design targets, not existing
features. Resolve naming with Woods before implementing either adapter.

| Contract component | Required information and behavior |
|---|---|
| Policy | schema version, applicable environments/data classes, generator and verification commands, fixture/artifact roots, required dataset minima, ownership, bounded scan coverage and retention |
| Provenance/exception | independent generation or permitted non-PII content; exact file path, digest, data class, justification and owner reference for each project exception; no blanket directories/extensions |
| Dataset receipt | generator/source version, profile, seed, explicit reference time, per-model and scenario counts, logical digest, environment/run identity and validation outcome; never sample records or secret connection strings |
| Performance receipt | dataset receipt reference, source revision, hardware/runtime/database, workload, concurrency/achieved throughput, duration/warm-up, latency/query/job/resource metrics, thresholds, pass/fail and missing/skipped checks |
| Profiling receipt | one-time status/date, unresolved schema question, sanitized aggregate/schema findings and cleanup attestation; no raw values, identifiers, precise sparse distributions or automatically followed references |

The policy must forbid production-origin PII even if encrypted, hashed or placed
in an ignored file. Local secrets for disposable synthetic accounts remain
secrets: keep them out of committed manifests and scrubbed artifacts.

Proposed user interface: `gated-pipeline test-data-check [directory] --json`
for bounded local policy/receipt/file validation; project-owned generation and
runtime-test commands execute separately via existing explicit test/CI hooks.
Do not execute arbitrary strings from an untrusted policy just to validate it.
Keep the default framework dependency footprint and Node compatibility unless an
actual limitation justifies a reviewed change.

Report statuses separately: policy valid, runtime evidence present, file scan
coverage complete, dataset minima met, performance budgets met. Missing mandatory
coverage, unknown/malformed receipts, unreadable/oversized files and failed
project checks cannot become success. A valid declared receipt is not proof
that its measurements happened; retain actual test logs and independent review.

Read only bounded regular files under declared roots, reject traversal/symlinks
and surprising executable/config content, and avoid network access. Unexpected
binary/archive/export files require explicit disposition; do not silently skip
them or recurse without limits. Return fixed diagnostics with safe path/rule IDs,
never matched PII or secret values. Consider sensitive filenames when formatting
output. Scan the declared working tree plus committed/staged change scope for CI;
separately document ignored artifact checks. Historical Git exposure is a
distinct audit/remediation task, not proof supplied by a current-tree scan.

Use layers: source provenance and generated-data recipes, blocked unsafe imports,
schema/content checks, exact exceptions, artifact checks and independent review.
Do not market regex detection, hashes or manifests as a universal PII detector.
Artificial canaries demonstrate detection paths without introducing real people.

## 4. Work packages and ordering

| Order | Framework work | Required result |
|---|---|---|
| 1 | Inventory current fixture/examples/import/profiling guidance; agree contract with Woods | Named policy gaps, field/command decision and red misuse tests |
| 2 | Policy schema and validator/CLI | Bounded/redacted deterministic validation, explicit outcomes and negative controls |
| 3 | Scaffold, doctor and migration | Correct managed fingerprints/package inclusion, customized project policy preserved, incomplete adoption visible |
| 4 | Examples, scale fixtures and enforcement integration | Synthetic Node/Python adapter examples, required CI integration example, larger fixture-processing benchmarks and per-tier coverage |
| 5 | Independent review, delivery and Woods adoption | Relevant tests/package checks/CI and current-commit review pass; separate framework PR and Woods adoption PR with exact version/commit recorded |

Woods source inventory and factory design can proceed while the contract is
settled. Contract adoption is an integration dependency before completion; do
not make Woods unsafe while waiting, and do not copy Woods' map exception into
the generic template. Keep existing deterministic CI and local AI reviews.

Proposed file changes include `lib/test-data.mjs`,
`template/.gated-pipeline/schemas/test-data-policy.schema.json`,
a corresponding dataset/performance receipt schema,
`template/test-data-policy.json`, `test/test-data.test.mjs`, existing CLI,
governance/doctor/scaffold integration and relevant documentation/examples.
Use the repository's schema validator's supported keyword subset; add tests for
any new validation behavior. Plan safe migration for existing installations
rather than silently replacing their policy or falsely reporting adoption.

Update policy/guidance at its single authoritative home. Gate 1 requires
classification and scenario/scale acceptance; Gates 2–3 require isolation and
generator/workload design; Gate 4 produces recipes and checks; Gates 5–7 review
provenance, actual failures and application evidence; Gates 8–9 verify thresholds,
retention, current CI and adoption. Reference that policy from cards/roles
instead of duplicating lengthy text into every context. Use the full applicable
process for the implementation; policy changes do not qualify for docs-lite.

## 5. Scale and verification targets

Woods' proposed shared dataset contract is development/CI: 2,000 users, 5,000
articles, 2,500 events; performance: 10,000 users, 50,000 articles, 25,000 events;
stress/soak: 50,000 users, 250,000 articles, 100,000 events, with proportional
household and related-record volumes defined in WIR-SYNTH-20260911.
Keep these project-owned; other adopters select documented numeric targets
appropriate to their application, with useful scale and realistic distributions.

For the framework, generate on-demand synthetic metadata fixtures at 1,000,
10,000 and 100,000 records to probe actual supported receipt, validation and scan
paths. Respect existing byte limits: a too-large input must fail safely, or be
partitioned into documented independent fixtures for throughput testing. Do not
increase a security bound just to achieve a record count. Capture elapsed time,
peak memory, file/record count and exit behavior; include 1,000/10,000-file trees
where file traversal is introduced. Establish runtime budgets from repeatable
baseline measurements and retain scaling regressions as failures.

Required acceptance:

| ID | Passing evidence |
|---|---|
| GP-A1 policy semantics | Production PII rejected as a source; pseudonymized imports do not qualify; synthetic content accepted; non-PII content distinction works; Woods exact map exception works only when configured |
| GP-A2 robust enforcement | Negative controls for malformed/missing policy/receipt, undersized datasets, fake/stale provenance bindings, sparse profiling output, unsafe paths/symlinks/oversized files and unexpected exports; errors contain no payload values |
| GP-A3 safe adoption | Fresh install and upgrade tested; customized policy retained; absent runtime checks marked incomplete; hashes/package coverage correct; Node/Python examples run without production access or paid services |
| GP-A4 truthful scale | Required generated records/counts and applicable coverage verified; reproducibility and interruption behavior tested; elapsed/memory/scaling evidence recorded; unread/missing/empty workloads fail visibly |
| GP-A5 cross-repo completion | Framework tests and package checks pass, independent code/security review complete, current named CI green; Woods adoption pins reviewed contract/version and produces its own application receipts |

Security and data-integrity acceptance applies to every work package: preserve the
repository's existing path, symlink, bounded-input and redacted-diagnostic
hardening; verify permissions and mutation boundaries before adding a writer; do
not overwrite, delete or duplicate generated/imported data by accident; and use
transactional or idempotent generation with a recovery receipt where a project
persists data. Negative controls must retain failed checks and prove rejected PII
does not reach fixtures, logs, Git or release payloads. This scope does not
authorize live attacks, production reads/writes, or bypassing an unresolved
platform security review.

Existing verification commands are `npm test` and `npm run check`. Add targeted
test-data contract, migration and benchmark commands with documented budgets;
the planning pass does not run or claim future implementation tests.

Retain only sanitized manifests/metrics and minimal synthetic fixture recipes in
Git. Keep large generated datasets in disposable ignored test storage, with
explicit per-run ownership, cleanup commands and retention. Production exports,
live-service tokens and real person records never become negative-test fixtures.

## Pickup checkpoint

The plan is ready for another agent; every work package above is still queued.
Use an isolated branch/worktree and inspect live claims with
`node template/.gated-pipeline/workflows/team-coordination.mjs status`.
The framework has no root contributor ledger at the inspected base, so this
handoff introduces `docs/TASKS.md`; the separate
`template/docs/TASKS.md` remains the installed-project scaffold.

First action: claim GP-SYNTH-20260911, read WIR-SYNTH-20260911, agree the small
policy/receipt contract and add misuse tests before implementing the CLI.
Preserve the existing cost-calibration follow-up (collect complete non-overlapping
receipts on 3–5 normal delivery units); this new next action does not cancel it.
