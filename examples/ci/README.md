# CI evidence integration

Keep the deterministic project tests as required CI jobs. Evidence validation is an additional job, not a substitute for them. The checker only validates declared records; it does not authenticate CI links, actor identities or test effectiveness.

A safe integration reads a **pinned/trusted** version of gated-pipeline, obtains the PR head SHA independently from the platform event, and validates a retained JSON attachment/artifact or a designated JSON block in the PR body. Do not run `npm install` or arbitrary code from an untrusted PR inside `pull_request_target` with write permissions or secrets. Prefer a read-only job, with no credentials available to project commands.

The critical invocation is:

```sh
node /trusted/gated-pipeline/bin/install.mjs check /downloaded/evidence.json \
  --dir=/reviewed-project --head="$REVIEWED_HEAD_SHA" --through=8
```

Treat project configuration and PR-body edits as policy changes requiring independent review. On PR edits or head changes, refresh validation; a status against an older head cannot approve the new one. Attach the complete record, preserving original failures and attribution. Capture the gate-9 approval separately after pre-merge validation, then retain the final record.

Remote required-check names should be configured explicitly. Bind authorized merges to the reviewed SHA. Local Git/Claude guards are useful early feedback, but server-side requirements are the merge boundary.
