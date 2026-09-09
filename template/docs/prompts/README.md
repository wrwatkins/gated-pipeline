# Versioned specialized prompts

Shared framework procedures live in `.gated-pipeline/skills/` and follow the installed framework version and file hashes in `.gated-pipeline.json`. Project specializations live in `prompts/<id>/<version>/SKILL.md`, with concise discovery descriptions in project instructions or native skill adapters. Load the body and supporting references only when applicable. Both Codex and Claude adapters should point to the same procedure; retain each harness's native permissions and settings.

`prompts/registry.json` lists approved project prompt versions. It starts empty: installation does not invent specialized skills or evaluation results. Each entry records `id`, stable `major.minor.patch` version, project-relative `path`, SHA-256 of the exact file bytes, accountable `owner` and `evaluationRef`.

Lifecycle: draft a bounded purpose and inputs → evaluate representative tasks → review safety/quality/cost → register the version and fingerprint → use it with recorded attribution → retire through a reviewed change. Include normal, failure and adversarial cases appropriate to the prompt, expected behavior and actual results. Use synthetic inputs. Version breaking contracts as major, added behavior as minor and compatible corrections as patch.

Keep approved versions immutable and point consumers at an explicit version. `gated-pipeline governance` catches changed bytes, missing/linked files and duplicate id/version entries. It cannot detect a person changing both an old fingerprint and its file in the same PR; independent Git review must enforce version history and assess the evaluation. A hash is not a signature or proof the prompt is good.

Record the prompt id/version used in the delivery evidence or linked audit evidence. For framework procedures, record the framework version plus any reviewed local override. Do not record raw user prompts, PII or tool transcripts in the registry.
