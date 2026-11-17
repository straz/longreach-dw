import { execFileSync } from 'node:child_process'
import type { APIRequestContext, APIResponse, Page } from '@playwright/test'
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

const DEMO = `${API}/v1/projects/fairhaven/commitments`

async function answered(r: APIResponse, what: string) {
  if (!r.ok()) throw new Error(`${what}: ${r.status()} ${await r.text()}`)
  return r.json()
}

/** A call to the Fairhaven demo's project routes as the holder of a key. */
export const asKey = async (request: APIRequestContext, key: string, method: string, path: string, data?: unknown) =>
  answered(await request.fetch(`${DEMO}${path}`, { method, data, headers: { authorization: `Bearer ${key}` } }), `${method} ${path}`)

/** The same, as the signed-in visitor, with their browser session, as dw itself calls. */
export const asVisitor = async (page: Page, method: string, path: string, data?: unknown) =>
  answered(await page.request.fetch(`${DEMO}${path}`, { method, data, headers: { origin: LOCAL_APP, 'x-longreach-client': 'dw' } }), `${method} ${path}`)
