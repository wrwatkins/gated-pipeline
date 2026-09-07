import test from 'node:test'
import assert from 'node:assert/strict'
import { sum } from './sum.mjs'
test('sums values and rejects non-finite input', () => {
  assert.equal(sum([2, 3]), 5)
  assert.equal(sum([]), 0)
  assert.throws(() => sum([NaN]), TypeError)
})
