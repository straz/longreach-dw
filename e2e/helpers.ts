import { execFileSync } from 'node:child_process'
import type { Page } from '@playwright/test'

// Setup shared by the browser tests.

const API = process.env.VITE_API_URL ?? 'https://127.0.0.1:8100'
const TYAPI = process.env.TYAPI ?? '../tyapi'

/** Every demo graph back to its seed, with tyapi's own job, which deletes every sandbox with it: each test starts
 *  from the seed whatever the last one left in the mock visitor's sandbox. */
export const reseed = () => execFileSync('make', ['-s', '-C', TYAPI, 'rebuild-demos'], { stdio: 'ignore', timeout: 120_000 })

/** Sign in with the laptop's mock and open a page of the Fairhaven demo, e.g. open(page, 'watch/flags'). */
export async function open(page: Page, route: string) {
  const target = new URL(`#/fairhaven/${route}`, 'https://127.0.0.1:5173/').href
  await page.goto(`${API}/auth/login?next=${encodeURIComponent(target)}`)
  await page.waitForURL(target)
}
