export const meta = {
  name: 'gate-review-fanout',
  description: 'Gates 5–8 review fan-out: review a target across correctness/security/perf/ops in parallel, emit ADR-025 typed handoff blocks',
  whenToUse: 'Opt-in, billed. Automates the mechanical verification gates (5 code-review, 6 client-perf, 7 security, 8 runtime/ops) as a parallel dimension fan-out (ADR-016) producing typed verdicts (ADR-025). Not for the judgment/HITL gates (1, 2, 9).',
  phases: [
    { title: 'Review', detail: 'one reviewer per gate dimension, in parallel' },
    { title: 'Synthesize', detail: 'combine into one verdict + ADR-025 typed blocks' },
  ],
}

// Target to review: a repo-relative file path or a git diff ref, passed via args.
// Falls back to the affiliate redirect route (security-relevant) for a self-contained demo.
const target = (args && args.target) || 'apps/web/app/go/[offerId]/route.ts'
const profile = (args && args.profile) || 'full'

// One reviewer per verification gate. Prompts mirror the gate cards + the
// extracted checklists (ADR-024): .claude/rules/checklists/{code-review,security-review}.md
// and .claude/rules/perf-budgets.md.
const DIMENSIONS = [
  {
    gate: 5, key: 'code-review',
    prompt: `You are gate 5 (code review) for {{PROJECT_SLUG}}. Read \`${target}\`.
Hunt the dimensions in .claude/rules/checklists/code-review.md: logic errors / unhandled edges
(null history, UTC-midnight timezone drift, VIN charset/check-digit, month-end dates); invariant
violations (packages/core purity — no fetch/db/fs; idempotent sends via dedupe_key; signed tokens
single-purpose+expiring; trust guardrails — one sponsored slot, no passive data sharing); TDS drift,
needless abstraction, dead code; missing/vacuous tests. Report only real findings, most-severe first.`,
  },
  {
    gate: 7, key: 'security',
    prompt: `You are gate 7 (security) for {{PROJECT_SLUG}}. Read \`${target}\`.
Review against .claude/rules/checklists/security-review.md: injection (Drizzle builder only, no
string SQL); authz on every /api route + rate limits on VIN-decode/token endpoints; token hygiene
(signed, single-purpose, expiring, constant-time compare); secrets (env only, none in logs/bundles);
PII (ids-only in logs/analytics, VIN quasi-PII, err.name only); redirect abuse (/go/:offerId ->
allowlisted merchant hosts only); open-redirect/token-namespace per DESIGN §7. Report only real
findings, most-severe first. Severity CRITICAL/HIGH block.`,
  },
  {
    gate: 6, key: 'client-perf',
    prompt: `You are gate 6 (client perf budget) for {{PROJECT_SLUG}}. Read \`${target}\` and
.claude/rules/perf-budgets.md. Flag anything that would breach the client budgets (public route
first-load JS <=130 KB gz; app-shell <=180 KB gz; LCP<2.5s, CLS<0.1, INP<200ms) — heavy client
imports, layout shift, blocking work. If the target is a server route with no client bundle impact,
say so plainly (n/a is a valid, honest result). Report only real findings.`,
  },
  {
    gate: 8, key: 'runtime-ops',
    prompt: `You are gate 8 (runtime/ops) for {{PROJECT_SLUG}}. Read \`${target}\` and
.claude/rules/perf-budgets.md §Runtime. Check: N+1 query patterns; unindexed hot-path queries;
instrumentation (PostHog server events + single-line JSON logs, ids only, no PII); idempotency
(dedupe_key on sweeps/sends); alerting story for failure paths; rollback/backward-compat for any
migration. Report only real findings, most-severe first.`,
  },
]

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['result', 'findings'],
  properties: {
    result: { type: 'string', enum: ['PASS', 'FAIL'], description: 'FAIL if any BLOCKING/CRITICAL/HIGH finding' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'what', 'where'],
        properties: {
          severity: { type: 'string', enum: ['BLOCKING', 'IMPORTANT', 'NIT', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          what: { type: 'string' },
          where: { type: 'string', description: 'file:line' },
          fix: { type: 'string' },
        },
      },
    },
    notes: { type: 'string', description: 'one line if clean / n/a' },
  },
}

phase('Review')
const reviews = await parallel(
  DIMENSIONS.map(d => () =>
    agent(d.prompt, { label: `gate-${d.gate}:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA })
      .then(r => ({ ...d, review: r }))
      .catch(() => ({ ...d, review: null }))
  )
)

phase('Synthesize')
// Build one ADR-025-shaped typed block per gate dimension (the machine mirror).
const blocks = reviews.filter(Boolean).map(({ gate, key, review }) => {
  const r = review || { result: 'FAIL', findings: [{ severity: 'BLOCKING', what: 'reviewer failed to return', where: target }] }
  const blocking = (r.findings || []).filter(f => ['BLOCKING', 'CRITICAL', 'HIGH'].includes(f.severity))
  return {
    gate,
    name: key,
    result: blocking.length ? 'FAIL' : 'PASS',
    profile,
    artifact: [target],
    next: gate === 5 ? 'tester' : gate === 6 ? 'security-reviewer' : gate === 7 ? 'ops-reviewer' : 'pr-approver',
    blocking: blocking.map(f => ({ file: f.where, line: 0, what: f.what })),
    needs: (r.findings || []).filter(f => !['BLOCKING', 'CRITICAL', 'HIGH'].includes(f.severity)).map(f => `${f.severity}: ${f.what}`),
    evidence: { review: r.result, findings: (r.findings || []).length, note: r.notes || '' },
  }
})

const verdict = blocks.some(b => b.result === 'FAIL') ? 'FAIL' : 'PASS'
log(`gate-review-fanout on ${target}: ${verdict} (${blocks.filter(b => b.result === 'FAIL').length}/${blocks.length} gates FAIL)`)

return { target, profile, verdict, blocks }
