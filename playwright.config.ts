import { defineConfig } from '@playwright/test'

// Browser tests against the laptop's tyapi stack (docs/PLAN.md §6): dw's dev server at https://127.0.0.1:5173 and
// tyapi's gateway at https://127.0.0.1:8100, `make up` there first, with the mock sign-in
// (TYAPI_AUTH_MOCK=steve@strassmann.com). Tests that change a demo reseed it first (e2e/helpers.ts), so they run
// one at a time.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  outputDir: 'test-results',
  use: {
    baseURL: 'https://127.0.0.1:5173/',
    channel: 'chrome',
    viewport: { width: 1440, height: 960 },
    // The gateway's local certificate, which the dev server shares (vite.config.ts).
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'pnpm dev',
    url: 'https://127.0.0.1:5173/',
    ignoreHTTPSErrors: true,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
