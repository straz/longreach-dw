import { execFileSync } from 'node:child_process'
import { type APIRequestContext, type APIResponse, type Page, expect } from '@playwright/test'
import { LOCAL_API, LOCAL_APP, TYAPI } from '../local.ts'

// Setup shared by the browser tests.

const API = process.env.VITE_API_URL ?? LOCAL_API

/** Every demo graph back to its seed, with tyapi's own job, which deletes every sandbox with it: each test starts
 *  from the seed whatever the last one left in the mock visitor's sandbox. Its output shows only when it fails. */
export const reseed = () => {
  try {
    execFileSync('make', ['-s', '-C', TYAPI, 'rebuild-demos'], { stdio: 'pipe', timeout: 120_000 })
  } catch (e) {
    const out = e as { stdout?: Buffer; stderr?: Buffer }
    throw new Error(`make rebuild-demos in ${TYAPI} failed:\n${out.stdout ?? ''}${out.stderr ?? ''}`)
  }
}

/** Sign in with the laptop's mock and open a page of the Fairhaven demo, e.g. open(page, 'watch/flags'). */
export async function open(page: Page, route: string) {
  const target = new URL(`#/fairhaven/${route}`, `${LOCAL_APP}/`).href
  await page.goto(`${API}/auth/login?next=${encodeURIComponent(target)}`)
  await page.waitForURL(target)
}

/** A Longreach API key for a local user, e.g. a maintainer of the demos, from tyapi's own tool. */
export const keyFor = (email: string) => execFileSync('make', ['-s', '-C', TYAPI, 'key', `EMAIL=${email}`], { encoding: 'utf8' }).trim().split('\n').at(-1) ?? ''

/** The Fairhaven demo's project, as MCP names it. */
export const FAIRHAVEN = 'fairhaven/commitments'
const FAIRHAVEN_ROUTES = `${API}/v1/projects/${FAIRHAVEN}`

async function answered(r: APIResponse, what: string) {
  if (!r.ok()) throw new Error(`${what}: ${r.status()} ${await r.text()}`)
  return r.json()
}

/** A call to the Fairhaven demo's project routes as the holder of a key. */
export const asKey = async (request: APIRequestContext, key: string, method: string, path: string, data?: unknown) =>
  answered(await request.fetch(`${FAIRHAVEN_ROUTES}${path}`, { method, data, headers: { authorization: `Bearer ${key}` } }), `${method} ${path}`)

/** The same, as the signed-in visitor, with their browser session, as dw itself calls. */
export const asVisitor = async (page: Page, method: string, path: string, data?: unknown) =>
  answered(await page.request.fetch(`${FAIRHAVEN_ROUTES}${path}`, { method, data, headers: { origin: LOCAL_APP, 'x-longreach-client': 'dw' } }), `${method} ${path}`)

/** One MCP call to the gateway as an assistant holding a key: a JSON-RPC request, its result. */
export async function mcp(request: APIRequestContext, key: string, method: string, params: Record<string, unknown> = {}) {
  const r = await request.post(`${API}/v1/mcp`, { data: { jsonrpc: '2.0', id: 1, method, params }, headers: { authorization: `Bearer ${key}` } })
  const body = (await answered(r, `MCP ${method}`)) as { result?: { isError?: boolean; content?: { text: string }[] }; error?: unknown }
  if (body.error || body.result?.isError) throw new Error(`MCP ${method}: ${JSON.stringify(body.error ?? body.result)}`)
  return body.result
}

/** The navbar's update control, and its menu opened. */
export const updateControl = (page: Page) => page.getByRole('button', { name: /^Working in/ })

export async function updatesMenu(page: Page) {
  await updateControl(page).click()
  return page.getByRole('group', { name: 'Your updates' })
}

/** On the drafting page: open the palette on the commitment, or on a card, and choose what to add by typing part of
 *  its words. */
export async function addCard(page: Page, what: string, on?: string) {
  if (on) await page.locator('.record-card', { hasText: on }).first().focus()
  else await page.getByRole('region', { name: 'The commitment' }).focus()
  await page.keyboard.press('/')
  const palette = page.getByRole('dialog')
  await expect(palette).toBeVisible()
  await palette.getByRole('textbox').fill(what)
  await page.keyboard.press('Enter')
  await expect(palette).toBeHidden()
}

/** Type a new card's text and save it with Enter. */
export async function writeCard(page: Page, text: string) {
  const card = page.locator('.record-card.is-unsaved').last()
  await card.getByRole('textbox').first().fill(text)
  await card.getByRole('textbox').first().press('Enter')
  await expect(page.locator('.record-card.is-unsaved')).toHaveCount(0)
  await expect(page.getByRole('article')).toContainText(text)
}
