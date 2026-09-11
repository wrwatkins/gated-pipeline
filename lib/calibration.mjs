import { readGovernanceDocument } from './governance.mjs'

const metrics = ['inputTokens', 'outputTokens', 'cachedInputTokens', 'totalTokens', 'costUsd', 'contextBytes', 'checksRun', 'checksReused']
const add = (a, b, integer = true) => {
  const value = a + b
  if (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER || (integer && !Number.isSafeInteger(value))) throw new Error('Calibration aggregate exceeds safe numeric range')
  return value
}
function summarize(units) {
  const attempts = units.flatMap(u => u.attempts)
  const completePopulation = units.length > 0 && units.every(u => u.attemptsComplete && ['accepted', 'rejected'].includes(u.outcome))
  const acceptedUnits = units.filter(u => u.outcome === 'accepted').length
  const measurements = {}
  for (const metric of metrics) {
    const values = attempts.map(a => metric === 'totalTokens'
      ? a.usage.inputTokens === null || a.usage.outputTokens === null ? null : add(a.usage.inputTokens, a.usage.outputTokens)
      : Object.hasOwn(a.usage, metric) ? a.usage[metric] : a[metric])
    const known = values.filter(v => v !== null)
    const knownSubtotal = known.length ? known.reduce((n, v) => add(n, v, metric !== 'costUsd'), 0) : null
    const complete = completePopulation && attempts.length > 0 && known.length === attempts.length
    measurements[metric] = { measuredAttempts: known.length, missingAttempts: attempts.length - known.length,
      knownSubtotal, total: complete ? knownSubtotal : null,
      perAcceptedUnit: complete && acceptedUnits > 0 ? knownSubtotal / acceptedUnits : null }
  }
  return { units: units.length, acceptedUnits,
    rejectedUnits: units.filter(u => u.outcome === 'rejected').length,
    unsettledUnits: units.filter(u => ['pending', 'unknown'].includes(u.outcome)).length,
    incompleteUnits: units.filter(u => !u.attemptsComplete).length,
    attempts: attempts.length, failedAttempts: attempts.filter(a => a.outcome === 'fail').length,
    unknownOutcomeAttempts: attempts.filter(a => a.outcome === 'unknown').length,
    reviewAttempts: attempts.filter(a => a.stage === 'review').length,
    unknownModelAttempts: attempts.filter(a => a.model === null).length,
    completePopulation, measurements }
}

/** Local descriptive statistics over caller-supplied records; never a gate or model selector. */
export async function calibrate(root, path) {
  const data = await readGovernanceDocument(root, path, 'calibration')
  const unitIds = new Set(), attemptIds = new Set(), usageRefs = new Set(), cohorts = new Map(), models = new Map()
  for (const unit of data.units) {
    if (unitIds.has(unit.id)) throw new Error('Duplicate calibration delivery unit')
    unitIds.add(unit.id)
    if (unit.attemptsComplete && unit.attempts.length === 0) throw new Error('Complete calibration units require recorded attempts')
    const key = JSON.stringify([unit.kind, unit.risk, unit.route, unit.billing])
    if (!cohorts.has(key)) cohorts.set(key, [])
    cohorts.get(key).push(unit)
    for (const attempt of unit.attempts) {
      if (attemptIds.has(attempt.id)) throw new Error('Duplicate calibration execution; record reused evidence once')
      attemptIds.add(attempt.id)
      const usage = attempt.usage
      if (usage.cachedInputTokens !== null && (usage.inputTokens === null || usage.cachedInputTokens > usage.inputTokens)) throw new Error('Cached input requires a measured input total at least as large')
      const hasUsage = ['inputTokens', 'outputTokens', 'cachedInputTokens', 'costUsd'].some(k => usage[k] !== null)
      if (hasUsage && usage.reference === null) throw new Error('Measured calibration usage requires a receipt reference')
      if (usage.reference !== null) {
        if (usageRefs.has(usage.reference)) throw new Error('Duplicate calibration usage receipt; provide non-overlapping execution deltas')
        usageRefs.add(usage.reference)
      }
      const modelKey = JSON.stringify([attempt.tool, attempt.model, attempt.effort])
      models.set(modelKey, (models.get(modelKey) || 0) + 1)
    }
  }
  const summary = summarize(data.units)
  return { schemaVersion: 1, status: !data.units.length ? 'empty' : summary.completePopulation ? 'recorded' : 'partial',
    summary, cohorts: [...cohorts].map(([key, units]) => {
      const [kind, risk, route, billing] = JSON.parse(key)
      return { kind, risk, route, billing, ...summarize(units) }
    }), models: [...models].map(([key, attempts]) => {
      const [tool, model, effort] = JSON.parse(key)
      return { tool, model, effort, attempts }
    }),
    notices: [
      'Declared records are not verified telemetry. Incomplete attempt inventories and missing measurements remain explicit; known subtotals are not complete unit costs.',
      'Per-accepted-unit denominators include only accepted units; numerators include all recorded attempts and rejected units. Open or incomplete populations suppress these figures.',
      'Compare like task/risk/route/billing cohorts and inspect quality plus observation windows before changing defaults. Model counts do not assign mixed-unit outcomes to individual models.',
      'Context bytes are document measurements, not tokens, cache hits or subscription deductions. Record actual allocated USD only; do not convert API prices into plan usage.',
      'Usage references must identify non-overlapping execution deltas, including failed attempts and independent reviews. Reused checks cite the original execution without adding its usage again.',
    ] }
}

export function formatCalibration(report) {
  const s = report.summary
  return [`Calibration: ${report.status}; ${s.units} units, ${s.acceptedUnits} accepted, ${s.attempts} recorded attempts (${s.failedAttempts} failed)`,
    `Coverage: ${s.incompleteUnits} incomplete units; ${s.unknownModelAttempts} attempts with unknown model`,
    ...Object.entries(s.measurements).map(([name, m]) => `${name}: total ${m.total ?? 'unknown'}; known subtotal ${m.knownSubtotal ?? 'unknown'}; measured ${m.measuredAttempts}/${s.attempts}; per accepted unit ${m.perAcceptedUnit ?? 'unknown'}`),
    `Task/risk/route/billing cohorts: ${report.cohorts.length}; use --json for grouped measurements and model counts.`,
    ...report.notices].join('\n')
}
