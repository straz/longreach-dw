import { expect, test } from 'vitest'
import { endOf, fromApi, mapDeep, noNulls, toApi } from './wire.ts'

test('every instant that comes back is its day in UTC, at any depth; nothing else changes', () => {
  expect(fromApi({ at_day: '2027-03-31T00:00Z', rows: [{ when: '2026-12-01T23:59Z' }], note: '2027-03-31 was a Wednesday', n: 3 })).toEqual({
    at_day: '2027-03-31',
    rows: [{ when: '2026-12-01' }],
    note: '2027-03-31 was a Wednesday',
    n: 3,
  })
})

test('a moment keeps its time, in one fixed form, so text order is time order', () => {
  const got = fromApi({ reviews: [{ held_at: '2027-03-31T10:00Z' }, { held_at: '2027-03-31T10:00:30Z' }], decision: { decided_at: '2027-03-31T10:00:00.250Z' } })
  expect(got).toEqual({ reviews: [{ held_at: '2027-03-31T10:00:00.000Z' }, { held_at: '2027-03-31T10:00:30.000Z' }], decision: { decided_at: '2027-03-31T10:00:00.250Z' } })
  // In the API's shortest form, "10:00Z" sorts after "10:00:30Z"; in the fixed form it does not.
  expect(got.reviews[0].held_at < got.reviews[1].held_at).toBe(true)
})

test('a day sent in a parameter or a write, at any depth, is its midnight in UTC; an as-of day ends at its last millisecond', () => {
  expect(toApi({ after: '2027-03-01', curie: 'fibo-x', n: 2 })).toEqual({ after: '2027-03-01T00:00Z', curie: 'fibo-x', n: 2 })
  expect(toApi({ value: { until: '2027-09-30', decision: { decided_at: '2027-03-31T10:00:00Z' } } })).toEqual({ value: { until: '2027-09-30T00:00Z', decision: { decided_at: '2027-03-31T10:00:00Z' } } })
  expect(endOf('2027-01-15')).toBe('2027-01-15T23:59:59.999Z')
})

test('mapDeep visits every leaf with its key', () => {
  expect(mapDeep({ a: 1, b: [{ c: 2 }] }, (v, k) => `${k}:${v}`)).toEqual({ a: 'a:1', b: [{ c: 'c:2' }] })
})

test('a null the API writes for an absent value is left out, at any depth', () => {
  expect(noNulls({ a: null, b: { c: null, d: 1 }, e: [{ f: null, g: 'x' }] })).toEqual({ b: { d: 1 }, e: [{ g: 'x' }] })
})
