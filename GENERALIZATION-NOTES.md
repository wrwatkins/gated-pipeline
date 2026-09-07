# v0.7 migration and portability notes

The shared core is now `.gated-pipeline/`; Claude and Codex get native entry points only. `pipeline.config.json` holds commands, paths and enabled capabilities. `STACK.md` explains real project constraints. Generic gates no longer require a particular framework, database, cloud, model family, test-order convention, governance register or source-project history.

The installer records framework hashes, preserves reinstall settings and lesson indexes, merges only marked instruction blocks/its Claude hook registration, and refuses conflicting framework edits or symlinks. A v0.6 template snapshot supports byte-comparison migration. Modified legacy rule files need explicit reconciliation; protect them only if you intend to keep their behavior. Migration preserves user-owned artifacts and copies old role memory without deleting the originals.

Gate evidence is canonical structured data with explicit actor/tool attribution. Previous prose-first typed mirrors are historical evidence; do not label them v1 evidence without the required fields or fabricate missing model/run identities. Combined chore runs now produce separate gate-5 and gate-6 entries attributed to their actual shared run. Cross-gate parallel review is not part of the generic contract; within-gate adapters preserve each gate's completion barrier.

The process documents the limits of record validation and local hooks. It supplies no model API, hosted state, automatically trusted CI evidence, or guarantee that an assistant obeys Markdown. Remote required checks and independent review remain project responsibilities.

Existing `pipeline-log.jsonl` records remain historical. New append-only events keep later escape attribution separate from merge observations. Set an explicit adoption baseline instead of inferring earlier cadence compliance.
