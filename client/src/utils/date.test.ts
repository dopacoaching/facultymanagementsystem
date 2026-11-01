import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dateForMonth, isMonthValue, defaultHistoryFrom } from './date'

const TODAY = '2026-11-01'

test('switching to last month lands on a pickable day, never an empty date', () => {
  // The bug: the date was cleared, so the picker opened on November where every day is out of range.
  assert.equal(dateForMonth('2026-11-01', '2026-10', TODAY), '2026-10-31')
})

test('the date is kept when it is still inside the new month', () => {
  assert.equal(dateForMonth('2026-10-15', '2026-10', TODAY), '2026-10-15')
})

test('today is used when the month is the current one and the date is outside it', () => {
  assert.equal(dateForMonth('2026-10-15', '2026-11', TODAY), TODAY)
})

test('a month in the future has nothing selectable', () => {
  assert.equal(dateForMonth('2026-11-01', '2026-12', TODAY), '')
})

test('a half-typed month (no month picker) leaves the date alone', () => {
  assert.equal(dateForMonth('2026-11-01', '2026-1', TODAY), '2026-11-01')
  assert.equal(dateForMonth('2026-11-01', '2', TODAY), '2026-11-01')
  assert.equal(isMonthValue('2026-10'), true)
  assert.equal(isMonthValue('2026-13'), false)
})

test('history opens a week back early in the month so last month stays visible', () => {
  assert.equal(defaultHistoryFrom(new Date(2026, 10, 1)), '2026-10-25')
  assert.equal(defaultHistoryFrom(new Date(2026, 10, 20)), '2026-11-01')
})
