import { afterEach, expect, test, vi } from 'vitest'
import { noNulls } from '../app/demo.ts'
import { DwGateway, days, endOf, instants } from './dw.ts'

afterEach(() => vi.unstubAllGlobals())

test("every instant that comes back is read as its day in UTC, at any depth; nothing else changes", () => {
  expect(days({ at: '2027-03-31T00:00Z', held: '2027-03-31T14:05:09.250Z', rows: [{ when: '2026-12-01T23:59Z' }], note: '2027-03-31 was a Wednesday', n: 3 })).toEqual({
    at: '2027-03-31',
    held: '2027-03-31',
    rows: [{ when: '2026-12-01' }],
    note: '2027-03-31 was a Wednesday',
    n: 3,
  })
})

test('a day sent in a parameter or a write, at any depth, is its midnight in UTC; an as-of day ends at its last millisecond', () => {
  expect(instants({ after: '2027-03-01', curie: 'fibo-x', n: 2 })).toEqual({ after: '2027-03-01T00:00Z', curie: 'fibo-x', n: 2 })
  expect(instants({ value: { until: '2027-09-30', decision: { decided_at: '2027-03-31T10:00:00Z' } } })).toEqual({ value: { until: '2027-09-30T00:00Z', decision: { decided_at: '2027-03-31T10:00:00Z' } } })
  expect(endOf('2027-01-15')).toBe('2027-01-15T23:59:59.999Z')
})

test("a stored query asks the demo's graph, as of the end of the day, and answers in days", async () => {
  const fetch = vi.fn(async (_request: Request) => new Response(JSON.stringify({ rows: [{ commitment: 'c1', committed_at: '2026-10-01T00:00Z' }] }), { headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetch)
  const rows = await new DwGateway({ graph: 'proj-cvw-commitments', org: 'cvw', project: 'commitments' }).query('expected_evidence', { after: '2027-01-15' }, { asOf: '2027-01-15' })
  expect(rows).toEqual([{ commitment: 'c1', committed_at: '2026-10-01' }])
  const sent = fetch.mock.calls[0][0]
  expect(new URL(sent.url).pathname).toBe('/v1/graphs/proj-cvw-commitments/queries/expected_evidence')
  expect(await sent.json()).toEqual({ params: { after: '2027-01-15T00:00Z', as_of: '2027-01-15T23:59:59.999Z' }, branch: 'main' })
})

test("it reads the branch it is given, the visitor's sandbox", async () => {
  const fetch = vi.fn(async (_request: Request) => new Response(JSON.stringify({ rows: [] }), { headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetch)
  await new DwGateway({ graph: 'proj-cvw-commitments', org: 'cvw', project: 'commitments', branch: 'sandbox-p' }).query('commitments', {})
  expect(await fetch.mock.calls[0][0].json()).toEqual({ params: {}, branch: 'sandbox-p' })
})

test('a null the API writes for an absent value is left out, at any depth', () => {
  expect(noNulls({ a: null, b: { c: null, d: 1 }, e: [{ f: null, g: 'x' }] })).toEqual({ b: { d: 1 }, e: [{ g: 'x' }] })
})
