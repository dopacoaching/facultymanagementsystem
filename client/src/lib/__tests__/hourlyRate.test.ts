import test from 'node:test'
import assert from 'node:assert/strict'
import { initialRateHistory, parseRateDate, planRateChange, rateOn } from '../utils/hourlyRate'

const d = (iso: string) => parseRateDate(iso) as Date

test('parseRateDate rejects malformed and impossible dates', () => {
  assert.equal(parseRateDate('2026-02-30'), null)
  assert.equal(parseRateDate('10/10/2026'), null)
  assert.equal(parseRateDate(undefined), null)
  assert.ok(parseRateDate('2026-10-10'))
})

test('a change applies only from its effective date', () => {
  const first = { hourlyRate: 500, hourlyRateHistory: initialRateHistory(500, 'hr') }
  const next = planRateChange(first, 600, d('2026-10-15'), 'hr', d('2026-10-10'))
  assert.equal(next.hourlyRate, 500)                      // not effective yet
  assert.equal(rateOn(next.hourlyRateHistory, undefined, d('2026-10-14')), 500)
  assert.equal(rateOn(next.hourlyRateHistory, undefined, d('2026-10-15')), 600)
  assert.equal(rateOn(next.hourlyRateHistory, undefined, d('2027-01-01')), 600)
})

test('a past effective date updates the current rate', () => {
  const first = { hourlyRate: 500, hourlyRateHistory: initialRateHistory(500, 'hr') }
  const next = planRateChange(first, 650, d('2026-09-01'), 'hr', d('2026-10-10'))
  assert.equal(next.hourlyRate, 650)
  assert.equal(rateOn(next.hourlyRateHistory, undefined, d('2026-08-31')), 500)
})

test('legacy flat rate is seeded as the initial entry', () => {
  const next = planRateChange({ hourlyRate: 400 }, 450, d('2026-10-01'), 'hr', d('2026-10-10'))
  assert.equal(next.hourlyRateHistory.length, 2)
  assert.equal(rateOn(next.hourlyRateHistory, undefined, d('2020-01-01')), 400)
})

test('two changes on the same day keep the latest', () => {
  const a = planRateChange({ hourlyRate: 400 }, 450, d('2026-10-01'), 'hr', d('2026-10-10'))
  const b = planRateChange(a, 470, d('2026-10-01'), 'hr', d('2026-10-10'))
  assert.equal(b.hourlyRateHistory.length, 2)
  assert.equal(b.hourlyRate, 470)
})

test('no history falls back to the flat rate', () => {
  assert.equal(rateOn(undefined, 300, d('2026-10-10')), 300)
  assert.equal(rateOn([], undefined, d('2026-10-10')), undefined)
})
