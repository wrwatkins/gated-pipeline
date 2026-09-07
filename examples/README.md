# Executable adaptation examples

These are small projects that use only their language's standard library. Copy an example into a scratch Git repository, install the pipeline with `--yes`, then run `doctor`. Each example supplies a real `pipeline.config.json` and STACK.md; installation preserves them.

- Node CLI: `node --test sum.test.mjs`
- Python library: `python3 -m unittest discover -p 'test_*.py'`

`evidence.fixture.json` demonstrates the complete attributed record, with synthetic Codex/Claude actors and a synthetic full commit SHA. It is explicitly a schema fixture, not proof that models reviewed or CI ran on these examples. Validate its shape with:

```sh
gated-pipeline check evidence.fixture.json --head=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
gated-pipeline pr-body evidence.fixture.json --head=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa --through=9
```

For actual work, replace the synthetic identities, revisions, checks and references with the observed facts. Keep in-flight records in the ignored `.gated-pipeline/evidence/` directory to avoid a self-referential commit hash.
