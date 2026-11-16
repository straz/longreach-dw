# Decision Watch (dw)

Longreach's Decision Watch at https://dw.longreach.ai: a port of the frozen test8 demo
(`~/src/lr/longreach/test8`) whose data lives in Longreach's API, https://api.longreach.ai (tyapi). A
static site, built here and published to GitHub Pages. The plan is [docs/PLAN.md](docs/PLAN.md); the
backend's side is tyapi's `docs/18-dw-backend.md`.

Phases 0 to 4 are built: test8's stack, design system, screens and read-side logic; an API client typed by
tyapi's API description, and query rows typed by its ty-core model; sign-in through the gateway, and a
user menu of the visitor's demos; every screen reading its demo's graph, as of any day; and every action
writing through tyapi's domain routes, into the visitor's own sandbox of each demo, which **Start over** in
the user menu resets (docs/PLAN.md §5). It needs a gateway with tyapi's sandbox routes (2026-11-15 or later).

## Running it

Against the laptop's tyapi (`make up` in `~/src/lr/tyapi`). Once, trust tyapi's local CA so the browser
accepts both dw's dev server and the gateway (macOS; restart Chrome after):

```sh
security add-trusted-cert -r trustRoot -k ~/Library/Keychains/login.keychain-db ../tyapi/secrets/tls/ca.pem
```

```sh
pnpm install
pnpm dev        # https://127.0.0.1:5173, with tyapi's local certificate (TYAPI, default ../tyapi)
```

Open **https://127.0.0.1:5173**. The gateway accepts calls only from that origin, and its session cookie
is shared only between pages on the same host, so the dev server redirects `localhost:5173` there.

| Command | Does |
|---|---|
| `pnpm dev` | Check the generated types, start Vite |
| `pnpm build` | Check the generated types, type-check, build to `dist/` |
| `pnpm test` | Unit and component tests |
| `pnpm e2e` | test8's walkthrough and every write, in Chrome against the laptop's tyapi; each test reseeds the demos first (`make rebuild-demos` there) |
| `pnpm lint` | oxlint |
| `pnpm gen:model` | Regenerate `src/model/generated.ts` (query rows) after updating `vendor/ty-core/` from tyapi |
| `pnpm api:pull` | Copy tyapi's API description into `vendor/tyapi/openapi.yaml` (TYAPI, default ../tyapi) |
| `pnpm gen:api` | Regenerate `src/model/api.ts` (every route's body and answer) from that copy |

`VITE_API_URL` sets the API's root at build time; it defaults to the laptop's gateway.

## Deploying

A push to `main` runs `.github/workflows/deploy.yml`: test, build with
`VITE_API_URL=https://api.longreach.ai`, and publish `dist/` to Pages. The repository's Pages source
must be **GitHub Actions** (Settings → Pages), so only the built app is served. Who may sign in is
tyapi's `demos/visitors.yaml`.
