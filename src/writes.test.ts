import { afterEach, expect, test, vi } from 'vitest'
import { API_URL, ApiError } from './api.ts'
import { acceptField, approveDecision, recordDecision, replaceField, setWatched } from './writes.ts'

afterEach(() => vi.unstubAllGlobals())

const WRITTEN = { graph: 'proj-fairhaven-commitments', written: 3, graph_commit_id: 'g1', decision: 'd-renew' }
const answers = (body: unknown, status = 200) => {
  const fetch = vi.fn(async (_request: Request) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}
const sent = (fetch: ReturnType<typeof answers>) => fetch.mock.calls.at(-1)![0]
const FAIRHAVEN = { org: 'fairhaven', project: 'commitments' }
const at = (path: string) => `${API_URL}/v1/projects/fairhaven/commitments${path}`

test("a decision sends only the intent to its route, naming dw, with a revisit day as its midnight in UTC", async () => {
  const fetch = answers(WRITTEN)
  expect(await recordDecision(FAIRHAVEN, { brief: 'b1', path: 'delay', rationale: 'Wait for Q3', conditions: '', revisitAt: '2027-06-30', approval: 'own' })).toEqual(WRITTEN)
  expect([sent(fetch).method, sent(fetch).url, sent(fetch).headers.get('x-longreach-client')]).toEqual(['POST', at('/decisions'), 'dw'])
  expect(await sent(fetch).json()).toEqual({ brief: 'b1', path: 'delay', rationale: 'Wait for Q3', revisit_at: '2027-06-30T00:00Z', approval: 'own' })
})

test('a write names what it acts on in the path', async () => {
  const fetch = answers(WRITTEN)
  await acceptField(FAIRHAVEN, { slug: 'c3', field: 'capital' })
  expect(sent(fetch).url).toBe(at('/commitments/c3/fields/capital/accept'))
  await approveDecision(FAIRHAVEN, 'd-renew')
  expect(sent(fetch).url).toBe(at('/decisions/d-renew/approve'))
  await setWatched(FAIRHAVEN, { slug: 'c3', watched: false })
  expect([sent(fetch).method, sent(fetch).url, await sent(fetch).json()]).toEqual(['PUT', at('/commitments/c3/watch'), { watched: false }])
})

test("a refused write says what the gateway said", async () => {
  answers({ error: 'the decision is approved already', code: 'conflict' }, 409)
  await expect(approveDecision(FAIRHAVEN, 'd-renew')).rejects.toEqual(new ApiError(409, 'conflict', 'the decision is approved already'))
})

test('a value stated as its owner goes out with its days as instants', async () => {
  const fetch = answers(WRITTEN)
  await replaceField(FAIRHAVEN, { slug: 'c21-gb300-storage', value: { field: 'capital', text: '$12.6M', amount: 12.6, until: '2027-09-30' } })
  expect(sent(fetch).url).toBe(at('/commitments/c21-gb300-storage/fields/capital/replace'))
  expect(await sent(fetch).json()).toEqual({ value: { field: 'capital', text: '$12.6M', amount: 12.6, until: '2027-09-30T00:00Z' } })
})
