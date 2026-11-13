# gated-pipeline

A delivery process for software written with AI coding assistants, kept as plain files in your repository.

Every change passes through nine gates in order: requirements, architecture, technical design, development, code review, test, security, operations, and approval. Each gate is a role that any assistant or a person can carry. Each records what it checked, who did it, and what it found, in a JSON evidence file that a command validates before merge. Nothing here calls a model, runs a hosted service, or installs runtime packages. Node 18 or newer is the only requirement.

## Why

Assistants are fast and confident, and a fast confident author needs an independent reviewer, a tester who did not write the code, and a record that shows who did what. This framework makes those roles explicit, keeps their evidence in the repository, and gives you a validator that refuses a record with a missing gate, a self-review, or a stale commit.

## Install

From your project root, with a checkout of this repository:

```sh
node /path/to/gated-pipeline/bin/install.mjs install --yes --slug=my-app --name="My App"
```

Or install from GitHub and use the CLI:

```sh
npm install --save-dev github:wrwatkins/gated-pipeline
npx gated-pipeline install --yes --slug=my-app --name="My App"
```

The installer adds a `.gated-pipeline/` directory with the shared procedures, small entry points for Claude Code and Codex, and a managed block in `AGENTS.md`. Existing instructions outside that block are left alone. Choose `--agents=codex`, `--agents=claude`, or `--agents=none` for a narrower setup.

## Configure

1. Edit `pipeline.config.json`: your test, lint and build commands, which checks are required, which paths are tests, and which optional reviews you want.
2. Write `STACK.md`: the project's real constraints and invariants in plain words.
3. Check the setup:

```sh
npx gated-pipeline doctor
npx gated-pipeline hooks           # optional Git guard against pushing to protected branches
```

A fresh install reports an unconfigured test command until you supply one. That is deliberate.

## How a change moves through

1. **Requirements, architecture, design.** Numbered acceptance criteria, an architecture verdict, and a design that names the tests each criterion needs.
2. **Tests before code.** The developer writes the unit tests red and commits them before any production code. The tester writes the browser or integration specs red at the same time. Both record a red receipt.
3. **Development.** The developer makes every red test green.
4. **Review, test, security, operations.** Independent roles, each in a fresh context. They can run at the same time when their surfaces do not overlap. A failed round stays in the record; its correction names it and runs fresh. Security includes an adversarial pass scaled to what the diff touches.
5. **Approval.** The validator checks the record and the branch history, then a person with authority merges the reviewed commit with a merge commit, never a squash, once every required check has completed on that exact head.
6. **After the target moves.** If the only change since the last gated head is a clean merge of the target, only test, security and operations re-run; the inspector, not the author, decides.

The order of record never changes, and no role can approve its own work under a different name.

## Commands

| Command | What it does |
|---|---|
| `doctor` | Checks local setup |
| `context --gate=N` | Lists the files a role should read for gate N |
| `test-first --base --head` | Verifies tests came before code and were not weakened, merge-aware |
| `merge-regression --verified-head --head --unit-paths` | Verifies that movement since the last gated head was clean merges and records only, so gates 1–5 stay bound |
| `check <evidence.json> --head` | Validates a gate evidence record; add `--base` to bind red receipts to the branch |
| `pr-body <evidence.json> --head` | Renders the validated record for a pull request |
| `cadence` | Reports which periodic reviews are due |
| `sync` | Updates framework files without touching your edits |

Full reference, including what is and is not enforced: [CLI.md](CLI.md). Process rules: [PROCESS](template/docs/PROCESS.md). Portability and design notes: [GENERALIZATION-NOTES.md](GENERALIZATION-NOTES.md).

## Profiles

Not every change needs the full treatment. `full` is the default for anything that touches production behaviour. `docs` covers documentation-only changes, `chore` covers tooling and test-only changes, and the opt-in `docs-lite` path gives ordinary prose one independent review. Every profile still records every gate, and a skipped gate needs a written reason.

## Development

The [contributor task ledger](docs/TASKS.md) records queued framework work.
Synthetic-data disposition: the [synthetic non-production data policy and scale-testing plan](docs/plans/synthetic-data-policy-2026-09-11.md) is merged; its framework policy/receipt contract is in independent review, while Woods application generators remain sequenced behind that repository's plan integration.

```sh
npm test
npm run check
```

## License

MIT.
