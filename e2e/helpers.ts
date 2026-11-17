import { execFileSync } from 'node:child_process'
import type { Page } from '@playwright/test'
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
