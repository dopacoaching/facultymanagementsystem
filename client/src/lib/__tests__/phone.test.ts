import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePhone } from '../utils/phone'

test('normalizePhone accepts the usual ways of writing a number and tidies spacing', () => {
  assert.deepEqual(normalizePhone('+91 98765 43210'), { ok: true, value: '+91 98765 43210' })
  assert.deepEqual(normalizePhone('  98765   43210 '), { ok: true, value: '98765 43210' })
  assert.deepEqual(normalizePhone('(0495) 276-5432'), { ok: true, value: '(0495) 276-5432' })
})

test('normalizePhone treats empty and missing as "no phone number"', () => {
  assert.deepEqual(normalizePhone(''), { ok: true, value: '' })
  assert.deepEqual(normalizePhone('   '), { ok: true, value: '' })
  assert.deepEqual(normalizePhone(undefined), { ok: true, value: '' })
  assert.deepEqual(normalizePhone(null), { ok: true, value: '' })
})

test('normalizePhone rejects letters, too few or too many digits, and non-strings', () => {
  for (const bad of ['abc', '98765x43210', '12345', '1234567890123456', '++91 98765 43210', '98765 43210 ext 4']) {
    assert.equal(normalizePhone(bad).ok, false, bad)
  }
  assert.equal(normalizePhone(9876543210).ok, false)
  assert.equal(normalizePhone({}).ok, false)
})

test('normalizePhone accepts the 7 and 15 digit limits', () => {
  assert.equal(normalizePhone('1234567').ok, true)
  assert.equal(normalizePhone('+123456789012345').ok, true)
})
