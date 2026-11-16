import { afterEach, expect, test, vi } from 'vitest'
import { API_URL, ApiError, GRAPHS_API, answer, client, query, signInUrl } from './api.ts'

afterEach(() => vi.unstubAllGlobals())

const answers = (body: string, status = 200, statusText = '') => {
  const fetch = vi.fn(async (_request: Request) => new Response(body, { status, statusText, headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}
const sent = (fetch: ReturnType<typeof answers>) => fetch.mock.calls.at(-1)![0]

test('every call carries the session cookie, and only a change names dw', async () => {
  const fetch = answers('{"signed_out":true}')
  await answer(client.GET('/auth/me'))
  expect(sent(fetch).url).toBe(`${API_URL}/auth/me`)
  expect(sent(fetch).credentials).toBe('include')
  expect(sent(fetch).headers.get('x-longreach-client')).toBeNull()
  await answer(client.POST('/auth/logout'))
  expect(sent(fetch).headers.get('x-longreach-client')).toBe('dw')
})

test("a refusal keeps the API's status, code and words", async () => {
  answers('{"error":"sign in first","code":"unauthorized","disposition":{"effects":"none","action":"fix"}}', 401)
  await expect(answer(client.GET('/auth/me'))).rejects.toEqual(new ApiError(401, 'unauthorized', 'sign in first'))
})

test("a proxy's page keeps its status and the start of what it said", async () => {
  answers('<html>starting up</html>', 502, 'Bad Gateway')
  await expect(answer(client.GET('/auth/me'))).rejects.toEqual(new ApiError(502, 'error', '502 Bad Gateway: <html>starting up</html>'))
  answers(`<html>${'x'.repeat(1000)}</html>`, 502, 'Bad Gateway')
  const e = (await answer(client.GET('/auth/me')).then(
    () => null,
    (err: unknown) => err,
  )) as ApiError
  expect(e.message.length).toBeLessThan(330)
  expect(e.message.endsWith('…')).toBe(true)
})

test("a stored query names the graph contract, sends its parameters, and gives the model's rows", async () => {
  const fetch = answers('{"query_name":"commitments","row_count":1,"rows":[{"commitment":"c1","state":"active"}],"target":{}}')
  const rows = await query('proj-fairhaven-commitments', 'commitments', { as_of: '2027-01-15T23:59:59.999Z' })
  expect(rows[0].commitment).toBe('c1')
  expect(sent(fetch).url).toBe(`${API_URL}/v1/graphs/proj-fairhaven-commitments/queries/commitments`)
  expect(sent(fetch).headers.get('Graphs-Http-Api')).toBe(GRAPHS_API)
  expect(await sent(fetch).json()).toEqual({ params: { as_of: '2027-01-15T23:59:59.999Z' } })
})

test('a stored query that answers without rows is refused, saying what came back', async () => {
  answers('{"applied":true}')
  await expect(query('g', 'commitments', {})).rejects.toThrow('commitments on g did not answer with rows: {"applied":true}')
})

test('signing in returns to the page it started from', () => {
  expect(signInUrl('https://dw.longreach.ai/fairhaven?asof=2027-01-15')).toBe(
    `${API_URL}/auth/login?next=https%3A%2F%2Fdw.longreach.ai%2Ffairhaven%3Fasof%3D2027-01-15`,
  )
})
