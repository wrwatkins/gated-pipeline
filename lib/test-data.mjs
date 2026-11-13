import { lstat, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { hash, safePath, safeRelative } from './files.mjs'
import { validate } from './schema.mjs'

const LIMIT = 1024 * 1024
const safeRef = value => typeof value === 'string' && value.length <= 240 && !/[\x00-\x1f\x7f\\]/.test(value)
const safeChild = (parent, path) => path === parent || path.startsWith(parent + '/')
const schemaCache = new Map()

async function schema(name) {
  if (!schemaCache.has(name)) schemaCache.set(name, readFile(new URL(`../template/.gated-pipeline/schemas/${name}.schema.json`, import.meta.url), 'utf8').then(JSON.parse))
  return schemaCache.get(name)
}
async function bounded(root, path) {
  if (!safeRef(path)) throw new Error('Test-data input is unsafe')
  try {
    const target = await safePath(root, path), stat = await lstat(target)
    if (!stat.isFile() || stat.size > LIMIT) throw new Error('invalid')
    const bytes = await readFile(target)
    if (bytes.length > LIMIT) throw new Error('invalid')
    return { bytes, target }
  } catch { throw new Error('Test-data input missing, linked, unreadable or over size limit') }
}
async function parsed(root, path, schemaName) {
  let input
  try { input = await bounded(root, path) } catch { throw new Error('Test-data policy or receipt is unavailable') }
  let value
  try { value = JSON.parse(input.bytes) } catch { throw new Error('Invalid test-data policy or receipt JSON') }
  if (validate(value, await schema(schemaName)).length) throw new Error('Invalid test-data policy or receipt shape')
  return { value, bytes: input.bytes }
}
function policySemantics(policy) {
  if (policy.productionPii !== 'forbidden' || policy.pseudonymizedProductionPii !== 'forbidden' || policy.nonPiiContent !== 'synthetic_required') throw new Error('Test-data policy permits a prohibited source')
  if (!safeRef(policy.generatedDataRoot) || !safeRelative(policy.generatedDataRoot) || policy.generatedDataRoot.startsWith('.') && policy.generatedDataRoot !== '.test-data' && !policy.generatedDataRoot.startsWith('.test-data/')) throw new Error('Test-data policy has unsafe generated-data root')
  const names = new Set()
  for (const tier of policy.tiers) {
    if (names.has(tier.name)) throw new Error('Test-data policy has duplicate tiers')
    names.add(tier.name)
  }
  if (!names.has('dev')) throw new Error('Test-data policy lacks a development tier')
  for (const item of policy.exceptions) if (!safeRef(item.path) || !safeRelative(item.path) || item.path.startsWith('.') || item.path.includes('//')) throw new Error('Test-data policy has unsafe exception path')
}
function receiptSemantics(policy, policyBytes, receipt) {
  if (receipt.policySha256 !== hash(policyBytes)) throw new Error('Test-data receipt is not bound to current policy')
  if (receipt.source !== 'synthetic') throw new Error('Test-data receipt source is not synthetic')
  if (receipt.profile === 'not_used' && (receipt.profileApprovalRef !== null || receipt.profileSummaryRef !== null)) throw new Error('Test-data receipt has inconsistent profiling provenance')
  if (receipt.profile === 'aggregate_once_approved' && (policy.productionProfiling !== 'approval_required_aggregate_only' || !safeRef(receipt.profileApprovalRef) || !safeRef(receipt.profileSummaryRef))) throw new Error('Test-data receipt has unapproved profiling provenance')
  const tier = policy.tiers.find(item => item.name === receipt.tier)
  if (!tier) throw new Error('Test-data receipt has an unknown tier')
  for (const field of ['users', 'articles', 'events', 'relatedRecords']) if (receipt.counts[field] < tier[field]) throw new Error('Test-data receipt is below required tier scale')
  if (!safeRef(receipt.outputRoot) || !safeRelative(receipt.outputRoot) || !safeChild(policy.generatedDataRoot, receipt.outputRoot)) throw new Error('Test-data receipt output is outside generated-data root')
}

export async function testDataCheck(root, receiptPath = null) {
  const policy = await parsed(root, 'test-data-policy.json', 'test-data-policy')
  policySemantics(policy.value)
  if (receiptPath === null) return { valid: true, policy: policy.value.policyId, receipt: null, note: 'Policy shape and source restrictions validated; configured commands remain project-owned.' }
  const receipt = await parsed(root, receiptPath, 'test-data-receipt')
  receiptSemantics(policy.value, policy.bytes, receipt.value)
  return { valid: true, policy: policy.value.policyId, receipt: receipt.value.tier, note: 'Policy and synthetic receipt validated; this does not inspect generated payloads or prove a command ran.' }
}

export async function testDataDoctor(root) {
  try {
    const result = await testDataCheck(root)
    const missing = Object.entries((await parsed(root, 'test-data-policy.json', 'test-data-policy')).value.commands).filter(([, value]) => value.startsWith('configure ')).map(([key]) => key)
    return { valid: true, warnings: missing.length ? [`Synthetic test-data ${missing.join(', ')} command is not configured`] : [], checks: [`Synthetic test-data policy ${result.policy} validated`] }
  } catch (error) { return { valid: false, warnings: [], checks: [], error: error.message } }
}
