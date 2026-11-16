import { existsSync, readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// The dev server runs at https://127.0.0.1:5173, the origin tyapi's gateway allows on a laptop, with the
// gateway's own local certificate (TYAPI: the tyapi checkout), so the two are one site and the gateway's
// session cookie comes with every call (docs/PLAN.md §4). A build needs neither.
const tls = `${process.env.TYAPI ?? '../tyapi'}/secrets/tls`
const https = existsSync(`${tls}/gateway.pem`) ? { cert: readFileSync(`${tls}/gateway.pem`), key: readFileSync(`${tls}/gateway.key`) } : undefined

// localhost reaches the same server but is another site to the browser: the gateway refuses its calls
// and its cookie isn't sent. Send it to 127.0.0.1 instead.
const toLoopback: Plugin = {
  name: 'localhost-to-127.0.0.1',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const host = String(req.headers[':authority'] ?? req.headers.host ?? '') // HTTP/2 has no Host header
      if (!host.startsWith('localhost')) return next()
      res.statusCode = 307
      res.setHeader('location', `https://${host.replace(/^localhost/, '127.0.0.1')}${req.url ?? '/'}`)
      res.end()
    })
  },
}

export default defineConfig({
  plugins: [react(), toLoopback],
  // Served at the root of https://dw.longreach.ai.
  base: '/',
  server: { host: '127.0.0.1', port: 5173, strictPort: true, https },
  test: {
    // Node by default; component tests opt in with a `// @vitest-environment jsdom` docblock.
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
})
