// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { API_URL, type Schemas } from '../api.ts'
import App, { makeQueryClient } from './App.tsx'

type Demo = Schemas['DemoListing']

const demo = (org: string, name: string, persona: string, title: string, clock: string, briefs = 0): Demo => ({
  graph: `proj-${org}-commitments`,
  org,
  org_name: name,
  project: 'commitments',
  name: `${name} commitments`,
  persona: { party: org, actor: `act-${org}`, name: persona, title },
  frame: { clock, timeline_start: '2026-01-01T00:00Z', money_unit: 'USD_M', footer: `${name} data are synthetic.` },
  briefs,
  documents: 0,
})
const DEMOS = [
  demo('alder-college', 'Alder College', 'Rhea Castillo', 'Provost', '2027-11-15T00:00Z'),
  demo('fairhaven', 'Fairhaven Systems', 'Dana Whitlock', 'CFO', '2027-03-31T00:00Z', 6),
]
const STEVE = { principal_id: 'p', kind: 'human', email: 'steve@strassmann.com', display_name: 'Steve Strassmann', pod_admin: false, acting_as: null, orgs: [], graphs: [] }
const UNAUTHORIZED: [number, unknown] = [401, { error: 'sign in first', code: 'unauthorized' }]

/** What GET /v1/projects/{org}/{project}/demo answers for a listed demo: its frame and persona, no content. */
const content = (d: Demo): Schemas['DemoOut'] => ({
  graph: d.graph,
  org: d.org,
  project: d.project,
  name: d.name,
  party: d.org,
  persona: d.persona,
  frame: d.frame,
  briefs: [],
  documents: [],
  indicators: {},
})

/** Each demo's content, and every stored query answering no rows. */
const DEMO_ROUTES = Object.fromEntries(
  DEMOS.flatMap((d): [string, [number, unknown]][] => [
    [`GET /v1/projects/${d.org}/${d.project}/demo`, [200, content(d)]],
    [`POST /v1/projects/${d.org}/${d.project}/sandbox`, [200, { graph: d.graph, branch: 'sandbox-p', started: true }]],
    [`DELETE /v1/projects/${d.org}/${d.project}/sandbox`, [200, { graph: d.graph, branch: 'sandbox-p', started: false }]],
  ]),
)
const NO_ROWS = /^POST \/v1\/graphs\/[^/]+\/queries\/(\w+)$/

/** fetch answering each path from routes, [status, body]; a path it lacks is a test failure. */
const serve = (routes: Record<string, [number, unknown] | ((request: Request) => [number, unknown])>) => {
  const fetch = vi.fn(async (request: Request) => {
    const key = `${request.method} ${new URL(request.url).pathname}`
    const rows = NO_ROWS.exec(key)
    const route = routes[key] ?? DEMO_ROUTES[key] ?? (rows ? ([200, { query_name: rows[1], row_count: 0, rows: [], target: {} }] as [number, unknown]) : undefined)
    if (!route) throw new Error(`no answer for ${key}`)
    const [status, body] = typeof route === 'function' ? route(request) : route
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

const open = () => render(<App queryClient={makeQueryClient()} />)

beforeEach(() => window.history.replaceState(null, '', '/'))
afterEach(() => vi.unstubAllGlobals())

test('signed out, it offers to sign in through the gateway and come back here', async () => {
  serve({ 'GET /auth/me': UNAUTHORIZED })
  open()
  const link = await screen.findByRole('link', { name: 'Sign in with Google' })
  expect(link.getAttribute('href')).toBe(`${API_URL}/auth/login?next=${encodeURIComponent(window.location.href)}`)
  expect(screen.queryByRole('alert')).toBeNull()
})

test('a refused sign-in says why, once', async () => {
  window.history.replaceState(null, '', '/?signin_refused=no+account+for+stranger%40example.com#/fairhaven')
  serve({ 'GET /auth/me': UNAUTHORIZED })
  open()
  expect(await screen.findByRole('alert')).toHaveTextContent('Longreach did not sign you in: no account for stranger@example.com')
  expect(window.location.search).toBe('')
  expect(window.location.hash).toBe('#/fairhaven')
})

const orgShown = () => screen.findByText(/./, { selector: '.navbar-org' })

test("signed in, it opens the first demo with briefs on its first tab, as its persona, reading that demo's graph", async () => {
  const fetch = serve({ 'GET /auth/me': [200, STEVE], 'GET /v1/demos': [200, { demos: DEMOS }] })
  open()
  expect(await orgShown()).toHaveTextContent('Fairhaven Systems')
  expect(screen.getByRole('button', { name: /Dana Whitlock, CFO/ })).toBeInTheDocument()
  expect(window.location.hash).toBe('#/fairhaven/commitment')
  expect(await screen.findByText('Fairhaven Systems data are synthetic.')).toBeInTheDocument()
  const read = fetch.mock.calls.map(([r]) => r).find((r) => r.url.includes('/queries/'))!
  expect(new URL(read.url).pathname).toMatch(/^\/v1\/graphs\/proj-fairhaven-commitments\/queries\//)
  expect((await read.json()).branch).toBe('sandbox-p')
})

const calls = (fetch: ReturnType<typeof serve>) => fetch.mock.calls.map(([r]) => `${r.method} ${new URL(r.url).pathname}`)

test("it reads the visitor's own sandbox, started on opening the demo; a reader of the demo reads its main", async () => {
  let fetch = serve({ 'GET /auth/me': [200, STEVE], 'GET /v1/demos': [200, { demos: DEMOS }] })
  const { unmount } = open()
  expect(await orgShown()).toHaveTextContent('Fairhaven Systems')
  expect(calls(fetch)).toContain('POST /v1/projects/fairhaven/commitments/sandbox')
  unmount()
  fetch = serve({
    'GET /auth/me': [200, STEVE],
    'GET /v1/demos': [200, { demos: DEMOS }],
    'POST /v1/projects/fairhaven/commitments/sandbox': [403, { error: 'a sandbox needs write', code: 'forbidden' }],
  })
  open()
  expect(await orgShown()).toHaveTextContent('Fairhaven Systems')
  await vi.waitFor(() => expect(fetch.mock.calls.some(([r]) => r.url.includes('/queries/'))).toBe(true))
  const read = fetch.mock.calls.map(([r]) => r).find((r) => r.url.includes('/queries/'))!
  expect((await read.json()).branch).toBe('main')
  fireEvent.click(screen.getByRole('button', { name: /Dana Whitlock, CFO/ }))
  expect(screen.queryByRole('button', { name: /Start over/ })).toBeNull()
})

test('starting over deletes the sandbox, starts a new one and reads it again', async () => {
  vi.stubGlobal('confirm', () => true)
  const fetch = serve({ 'GET /auth/me': [200, STEVE], 'GET /v1/demos': [200, { demos: DEMOS }] })
  open()
  fireEvent.click(await screen.findByRole('button', { name: /Dana Whitlock, CFO/ }))
  const reads = () => calls(fetch).filter((c) => c.includes('/queries/')).length
  await vi.waitFor(() => expect(reads()).toBeGreaterThan(0))
  const before = reads()
  fireEvent.click(screen.getByRole('button', { name: 'Start over in Fairhaven Systems' }))
  await vi.waitFor(() => expect(calls(fetch)).toContain('DELETE /v1/projects/fairhaven/commitments/sandbox'))
  const sandbox = calls(fetch).filter((c) => c.endsWith('/sandbox'))
  expect(sandbox.slice(-2)).toEqual(['DELETE /v1/projects/fairhaven/commitments/sandbox', 'POST /v1/projects/fairhaven/commitments/sandbox'])
  await vi.waitFor(() => expect(reads()).toBeGreaterThan(before))
})

test('the user menu lists every demo, and opens another at its own clock', async () => {
  serve({ 'GET /auth/me': [200, STEVE], 'GET /v1/demos': [200, { demos: DEMOS }] })
  open()
  fireEvent.click(await screen.findByRole('button', { name: /Dana Whitlock, CFO/ }))
  const menu = screen.getByRole('group', { name: 'Open a demo as' })
  expect(within(menu).getAllByRole('button', { name: /as of/ }).map((item) => item.textContent)).toEqual([
    'RCRhea CastilloProvost, Alder College, as of Nov 15, 2027',
    'DWDana WhitlockCFO, Fairhaven Systems, as of Mar 31, 2027Signed in',
  ])
  expect(within(menu).getByText('Google account: steve@strassmann.com')).toBeInTheDocument()
  fireEvent.click(within(menu).getByRole('button', { name: /Rhea Castillo/ }))
  expect(await screen.findByText('Alder College', { selector: '.navbar-org' })).toBeInTheDocument()
  expect(window.location.hash).toBe('#/alder-college/commitment')
})

test('a link to a demo opens it, and one to a demo the visitor cannot open goes to the first', async () => {
  serve({ 'GET /auth/me': [200, STEVE], 'GET /v1/demos': [200, { demos: DEMOS }] })
  window.history.replaceState(null, '', '/#/alder-college')
  const { unmount } = open()
  expect(await screen.findByText('Alder College', { selector: '.navbar-org' })).toBeInTheDocument()
  unmount()
  window.history.replaceState(null, '', '/#/calder-point')
  open()
  expect(await screen.findByText('Fairhaven Systems', { selector: '.navbar-org' })).toBeInTheDocument()
})

test('logging out ends the session and shows the sign-in again', async () => {
  let signedIn = true
  const fetch = serve({
    'GET /auth/me': () => (signedIn ? [200, STEVE] : UNAUTHORIZED),
    'GET /v1/demos': [200, { demos: DEMOS }],
    'POST /auth/logout': () => {
      signedIn = false
      return [200, { signed_out: true }]
    },
  })
  open()
  fireEvent.click(await screen.findByRole('button', { name: /Dana Whitlock, CFO/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
  expect(await screen.findByRole('link', { name: 'Sign in with Google' })).toBeInTheDocument()
  const logout = fetch.mock.calls.find(([r]) => new URL(r.url).pathname === '/auth/logout')![0]
  expect([logout.url, logout.credentials, logout.headers.get('x-longreach-client')]).toEqual([`${API_URL}/auth/logout`, 'include', 'dw'])
})

test('a failed sign-out says why and can try again', async () => {
  let up = false
  serve({
    'GET /auth/me': [200, STEVE],
    'GET /v1/demos': [200, { demos: DEMOS }],
    'POST /auth/logout': () => (up ? [200, { signed_out: true }] : [503, { error: 'the gateway is restarting', code: 'unavailable' }]),
  })
  open()
  fireEvent.click(await screen.findByRole('button', { name: /Dana Whitlock, CFO/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Longreach did not sign you out: the gateway is restarting')
  up = true
  serve({ 'GET /auth/me': UNAUTHORIZED, 'POST /auth/logout': [200, { signed_out: true }] })
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('link', { name: 'Sign in with Google' })).toBeInTheDocument()
})

test('a failed start over says why and keeps the menu open', async () => {
  vi.stubGlobal('confirm', () => true)
  serve({
    'GET /auth/me': [200, STEVE],
    'GET /v1/demos': [200, { demos: DEMOS }],
    'DELETE /v1/projects/fairhaven/commitments/sandbox': [503, { error: 'the graph service is not reachable', code: 'unavailable' }],
  })
  open()
  fireEvent.click(await screen.findByRole('button', { name: /Dana Whitlock, CFO/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Start over in Fairhaven Systems' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not start over: the graph service is not reachable')
  expect(screen.getByRole('group', { name: 'Open a demo as' })).toBeInTheDocument()
})

test('Escape closes the user menu and puts focus back on its button', async () => {
  serve({ 'GET /auth/me': [200, STEVE], 'GET /v1/demos': [200, { demos: DEMOS }] })
  open()
  const button = await screen.findByRole('button', { name: /Dana Whitlock, CFO/ })
  fireEvent.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'true')
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(document.activeElement).toBe(button)
})

test('a visitor with no demo is told so', async () => {
  serve({ 'GET /auth/me': [200, STEVE], 'GET /v1/demos': [200, { demos: [] }] })
  open()
  expect(await screen.findByText(/No demo is open to steve@strassmann.com/)).toBeInTheDocument()
})

test('when the API does not answer, it says so in its words and can try again', async () => {
  let up = false
  serve({ 'GET /auth/me': () => (up ? UNAUTHORIZED : [502, { error: 'the gateway is starting', code: 'unavailable' }]) })
  open()
  expect(await screen.findByRole('alert')).toHaveTextContent('Longreach did not answer: the gateway is starting')
  up = true
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('link', { name: 'Sign in with Google' })).toBeInTheDocument()
})
