// Optional fan-out within ONE gate. Callers supply the agent/tool adapter.
// Gate order and final decisions remain owned by docs/PROCESS.md.
const dimensions = {
  5: ['correctness', 'tests', 'design'],
  6: ['traceability', 'test-evidence'],
  7: ['security', 'supply-chain'],
};
const severities = new Set(['BLOCKING', 'CRITICAL', 'HIGH', 'IMPORTANT', 'MEDIUM', 'LOW', 'NIT']);
const blocking = new Set(['BLOCKING', 'CRITICAL', 'HIGH']);
const validFinding = (f) => f && severities.has(f.severity) &&
  typeof f.what === 'string' && Boolean(f.what.trim());

export async function reviewGate({ gate, target, headSha, reviewer, timeoutMs = 60000 }) {
  if (!Number.isInteger(gate) || !dimensions[gate] ||
      typeof target !== 'string' || !target.trim() ||
      typeof headSha !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(headSha) ||
      typeof reviewer !== 'function' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Provide gate 5, 6 or 7, a target, full headSha, reviewer and positive timeoutMs');
  }
  const reviews = await Promise.all(dimensions[gate].map(async (dimension) => {
    let timer;
    let retainedFindings = [];
    let reportedHeadSha = null;
    const controller = new AbortController();
    try {
      const report = await Promise.race([
        Promise.resolve().then(() => reviewer({ gate, dimension, target, headSha, signal: controller.signal })),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error('Reviewer timed out'));
          }, timeoutMs);
        }),
      ]);
      const findings = Array.isArray(report?.findings) ? Array.from(report.findings) : null;
      retainedFindings = (findings ?? []).filter(validFinding);
      reportedHeadSha = typeof report?.headSha === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(report.headSha) ? report.headSha : null;
      if (!report || !['PASS', 'FAIL'].includes(report.result) || report.headSha !== headSha ||
          !findings || findings.some((f) => !validFinding(f))) {
        throw new Error('Reviewer returned missing, malformed or stale evidence');
      }
      return {
        ...report,
        dimension,
        result: report.result === 'FAIL' || report.findings.some((f) => blocking.has(f.severity)) ? 'FAIL' : 'PASS',
      };
    } catch {
      // Provider exceptions can contain credentials or private prompts.
      return {
        dimension, result: 'FAIL', headSha, reportedHeadSha,
        findings: [...retainedFindings, { severity: 'BLOCKING', what: 'Reviewer did not return valid current evidence; inspect the local adapter failure.' }],
      };
    } finally {
      clearTimeout(timer);
    }
  }));
  return {
    gate, target, headSha,
    result: reviews.every((r) => r.result === 'PASS') ? 'PASS' : 'FAIL',
    reviews,
    note: 'Supporting reports only. The owning gate must finish its checklist and emit its prose decision, typed mirror and attribution. This does not approve or merge a PR.',
  };
}
