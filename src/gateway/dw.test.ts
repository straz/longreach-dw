import { afterEach, expect, test, vi } from 'vitest'
import { DwGateway } from './dw.ts'

afterEach(() => vi.unstubAllGlobals())

const rows = (body: unknown) => {
  const fetch = vi.fn(async (_request: Request) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

test("a stored query asks the demo's graph, as of the end of the day, and answers in days", async () => {
  const fetch = rows({ rows: [{ commitment: 'c1', committed_at: '2026-10-01T00:00Z', held_at: '2026-10-01T14:05Z' }] })
  const got = await new DwGateway({ graph: 'proj-cvw-commitments', org: 'cvw', project: 'commitments' }).query('expected_evidence', { after: '2027-01-15' }, { asOf: '2027-01-15' })
  expect(got).toEqual([{ commitment: 'c1', committed_at: '2026-10-01', held_at: '2026-10-01T14:05:00.000Z' }])
  const sent = fetch.mock.calls[0][0]
  expect(new URL(sent.url).pathname).toBe('/v1/graphs/proj-cvw-commitments/queries/expected_evidence')
  expect(await sent.json()).toEqual({ params: { after: '2027-01-15T00:00Z', as_of: '2027-01-15T23:59:59.999Z' }, branch: 'main' })
})

test("it reads the branch it is given, the visitor's sandbox", async () => {
  const fetch = rows({ rows: [] })
  await new DwGateway({ graph: 'proj-cvw-commitments', org: 'cvw', project: 'commitments', branch: 'sandbox-p' }).query('commitments', {})
  expect(await fetch.mock.calls[0][0].json()).toEqual({ params: {}, branch: 'sandbox-p' })
})
