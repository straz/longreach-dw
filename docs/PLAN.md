# Decision Watch at dw.longreach.ai — plan

Plan, no code yet. Written 2026-11-14.

dw is a port of the frozen test8 demo (`~/src/lr/longreach/test8`, commit `055fc0b`, served at
`https://longreach.ai/test8/`) into an app whose data lives in Longreach's API. It stays a static
site, built here and served from GitHub Pages at `https://dw.longreach.ai`, and it reads and writes
everything through `https://api.longreach.ai` (tyapi). test8 is not changed: it stays a static demo
with its in-browser mock, and it is the reference this port is checked against.

The backend's side of the plan is `~/src/lr/tyapi/docs/18-dw-backend.md`. Decisions there are
cited as W1 to W13.

## 1. What carries over from test8

- **The product:** the CFO's question, the three tabs (Commitment → Watch → Reconsider), the
  screens, the briefs, the visual design and the copy (test8 `docs/PLAN.md` §1 to §4, §7, and
  `PRODUCT.md`).
- **The stack:** Vite, React 19, TypeScript, pnpm, TanStack Query, React Router, vitest, oxlint,
  Playwright.
- **The read-side logic:** test8's `src/domain/` (watch states, the materiality rule, the capital
  clock and headline, coming-up dates, detail) is pure functions of query rows, and stays in the
  browser as it is.
- **The queries:** the same named queries, which tyapi adopts into its ty-core model with test8's
  schema additions (W5). Their rows have the same shape.

## 2. What changes

| test8 | dw |
|---|---|
| `MockGateway`: an in-memory graph in the browser, state in `sessionStorage` | `api.longreach.ai`. Each visitor's changes are kept on their own sandbox branch, per demo (W11) |
| Planners in `src/services/` build records, sent with `load` | Domain routes: dw sends an intent ("accept this field", "record this decision") and tyapi builds the records (W1). No planners here. The routes, built in tyapi's Phase B1, are listed in tyapi `docs/18-dw-backend.md` §3; each answers `{graph, written, graph_commit_id, commitment?, decision?}`, after which dw refetches what it shows |
| `query(name, params, {asOf, branch})` | The same, as `POST /v1/graphs/{graph}/queries/{name}` with `Graphs-Http-Api: 0.14`, `{params: {…, as_of}, branch}` (W4, W6). tyapi's queries give the mock's rows (checked by tyapi's `gateway/tests/test_decision_watch.py`), except that, as of a past date, dw takes each commitment's state from its latest transition by then, as the mock did. Every date is an ISO-8601 instant in UTC both ways (W14): dw sends `as_of` as an instant (the end of the chosen day, `2027-01-15T23:59:59.999Z`), a calendar day arrives as its midnight UTC, and dw never assumes a time zone; it shows dates in UTC, as test8 did |
| Content compiled from `content/<client>/` into `public/seed/` | The demo's frame and content (persona, clock, indicators, briefs, sample documents) from `GET /v1/projects/{graph}/demo`; the records are tyapi's demo seeds |
| Two clients, Fairhaven and CVW, one clock | Six demos, each a client with its persona and its own clock (W9; table below): five at 2027-03-31, Alder at 2027-11-15 |
| Google sign-in in the browser against `allowlist.yml`, a curtain only | Sign-in through the gateway; the visitor list is tyapi's (`demos/visitors.yaml`), checked by the server (W10, W13) |
| The persona (Dana, Joseph) is the user | The persona is what the screen shows and what the graph records; the visitor's Google account is who wrote it (W12) |
| Types generated from `vendor/ty-core/` and `queries/` | API types generated from tyapi's API description (W7), copied into `vendor/tyapi/openapi.yaml` by `pnpm api:pull` (tyapi's `python -m gateway.openapi`, no gateway running); query row types from tyapi's ty-core model in `vendor/ty-core/`. Both copies name the tyapi commit they came from |
| Dev drawer showing the mock's request log | Dropped; the gateway keeps the request log |
| The MCP server in `mcp/` | Not ported. The AI's tools are in tyapi's `/v1/mcp` (W1; tyapi `docs/16-mcp.md`, `17-mcp-proposals.md`) |

The demos, as clients in the user menu:

| Client | Persona | Content |
|---|---|---|
| Fairhaven Systems | Dana Whitlock, CFO | test8's, complete |
| CVW Construction | Joseph Farhat, CEO | test8's, complete |
| Northwind Freight | Maya Ruiz | Records only: no briefs, indicators or sample documents yet |
| Calder Point Properties | Ines Park | Records only |
| Verity Investments | Lena Hart | Records only |
| Alder College | Rhea Castillo | Records only |

Screens show their empty states where a demo has no briefs, indicators or documents.

## 3. Signing in

1. A visitor who is not signed in sees the sign-in screen. **Sign in with Google** goes to
   `https://api.longreach.ai/auth/login?next=<this page>`.
2. The gateway signs them in with Google, sets its session cookie and sends them back. It refuses
   anyone who is not a tyapi user by sending them back with the reason in `signin_refused`, which
   the sign-in screen shows. Decision Watch's visitors (`demos/visitors.yaml`) are the users who may
   open its demos: `GET /v1/demos` lists the ones the visitor can open, each with its persona and
   clock, and the URL names the one open (`#/<org>/…`).
3. Every call is `fetch(url, {credentials: "include"})`. Writes also send
   `X-Longreach-Client: dw`, which the gateway requires of a session's changes from an allowed
   origin.
4. `GET /auth/me` says who is signed in; a 401 sends the visitor back to step 1. **Log out** is
   `POST /auth/logout`.

The cookie is `api.longreach.ai`'s own. It goes with dw's requests because both names are under
`longreach.ai`, which is why dw is served from `dw.longreach.ai` and not a `github.io` address,
where browsers would treat it as a third-party cookie and drop it.

## 4. Running locally

| | Laptop | Pilot |
|---|---|---|
| dw | `pnpm dev` at `https://127.0.0.1:5173`, with tyapi's local certificate (`tyapi/secrets/tls/`) | `https://dw.longreach.ai` |
| API | tyapi's `make up`, at `https://127.0.0.1:8100` | `https://api.longreach.ai` |
| Sign-in | tyapi's mock sign-in (`TYAPI_AUTH_MOCK=steve@strassmann.com`), loopback only | Google |

The API's address comes from the build (`VITE_API_URL`). tyapi's gateway allows dw's origin: on a
laptop `https://127.0.0.1:5173` by default, in the pilot `https://dw.longreach.ai` (`TYAPI_APP_ORIGINS`).
A visitor must be listed in tyapi's `demos/visitors.yaml`; the mock signs in as `steve@strassmann.com`,
who is. `127.0.0.1` on both sides keeps them one site,
as `dw` and `api` are in the pilot, so sign-in, cookies and CORS run the same code locally.

## 5. Phases

dw starts when tyapi's Phase B (the domain routes) is done, against the laptop's gateway, and goes
live after tyapi's Phase D (sandboxes).

| Phase | Work | Check |
|---|---|---|
| 0. Scaffold (done 2026-11-15) | Copy test8's stack, design tokens, fonts, components and `src/domain/` into this repo; drop `MockGateway`, `src/services/`, `mcp/`, the content compiler and the client-side allowlist; one page that signs in through the gateway | Builds; test8's domain tests pass here, changed only where ty-core now requires a field (`Commitment.watched`, `Review.kind` in `test-fixtures.ts` and `materiality.test.ts`); locally, sign in and log out against the laptop's tyapi |
| 1. Client and types (done 2026-11-15) | An API client typed by the API description (`openapi-fetch`, types by `openapi-typescript`); query row types from tyapi's model; `VITE_API_URL` | A renamed field in the API fails the build: checked by renaming `display_name` in a copy, which stopped the build at the types check and, once regenerated, at each use |
| 2. Sign-in and clients (done 2026-11-15) | §3; the user menu lists the six demos from the API, each with its persona and clock | Locally: sign in with the mock, switch demos; an unlisted email sees the refusal. Checked in the browser against the laptop's tyapi, the refusal with the mock set to an unknown email |
| 3. Reads (done 2026-11-15) | Every screen reads through the stored-query route, with `as_of` (an instant in UTC) and the visitor's sandbox branch; a commitment's state as of a past date from `transitions` | The Fairhaven and CVW screens match test8's at the same as-of dates (visual baselines). Checked by comparing each tab, a commitment, a brief and the Watch views, at the demo clock and at 2027-01-15, as text: identical but for the differences listed below §5 |
| 4. Writes (done 2026-11-15) | Every action calls its domain route, then refetches what it changed; **Start over**, in the user menu, deletes the visitor's sandbox and starts a new one from the seed | Each action of test8's walkthrough (test8 `docs/PLAN.md` §9) gives the same screen as in test8. Checked by test8's walkthrough and every write of its browser tests, ported to `e2e/` and run against the laptop's tyapi: all pass with test8's expected figures |
| 5. Deploy | GitHub Pages with the custom domain `dw.longreach.ai`, `VITE_API_URL=https://api.longreach.ai` | A listed visitor signs in with Google, works in their sandbox, and another visitor does not see it |

**How phase 3 ports test8.** test8's screens (`src/features/`) and frame came over unchanged in what they show.
They read through test8's `GatewayClient`; `src/gateway/dw.ts` implements it over the API for the open demo's
graph. The screens and `src/domain/` work in calendar days, as test8 did, and the API in instants in UTC; the
adapter converts at the boundary, exactly: an as-of day goes out as the end of that day, a day parameter as its
midnight, and each instant comes back as its day. Each demo has its own clock (`domain/clock.ts`), and its
content (briefs, sample documents, indicators) comes from `GET /v1/projects/{org}/{project}/demo`. Cached answers
are keyed by graph, so demos never share them. Writes are `src/writes.ts`: until phase 4 wires each to its domain
route, every write control is off, saying why.

**How phase 4 writes.** Each action is one call in `src/writes.ts` to its domain route, carrying only the intent
("accept this field", "record Delay on B2"): the gateway reads what it needs, builds the records as the demo's
persona at the demo's clock, and names any slug it chose (a draft, a decision). After a write, every cached
answer from the demo's graph is refetched, at every as-of date, since the gateway, not dw, knows what a write
touched. A day in a write's body goes out as its midnight in UTC, as in a query's parameters. Changes are off
while looking back. Writes go to the visitor's sandbox of the demo, which dw starts on opening it
(`POST /v1/projects/{org}/{project}/sandbox`, tyapi W11) and every screen reads; a visitor who may only read a
demo reads its `main`. `pnpm e2e` reseeds the laptop's
demos before each test.

**Dates, since 2026-11-15.** tyapi takes calendar days (as their midnight UTC; an `as_of` day as its end) and
offset instants, and still answers only in instants in UTC. Once that gateway is deployed, `instants()` in
`src/gateway/dw.ts` and its uses can go and dw can send days as they are; `days()` stays. Until then dw sends
instants, which every gateway takes.

**Where phase 3 differs from test8, accepted:**

- *Rows that tie on a date come back in slug order.* test8's mock kept the order its seed was written in;
  the engine has no such order, so tyapi's queries end their order in the columns that identify a row, and
  ties are alphabetical by slug. It shows where two options close on one day (Fairhaven's Nvidia and
  Polaris Forge 2 windows, CVW's steel package), where a window lists the beliefs it informs, and among
  evidence judged on one day. Because a window shows the cost of its first option only, the Polaris Forge
  lease and CVW's steel window no longer say "costs $3M" and "costs $0.2M".

## 6. Testing

- **Unit:** `src/domain/` keeps test8's tests.
- **Components:** against an HTTP-level mock of the API (MSW), with response bodies typed from the
  API description, so a mock cannot drift from the contract unnoticed.
- **Browser (Playwright):** the walkthrough against the laptop's tyapi stack, signed in with the
  mock, and a smoke test against the pilot after each deploy.

## 7. Deployment

GitHub Pages from this repo, built by a workflow on push to `main`. Squarespace DNS: a CNAME for
`dw` to the GitHub Pages host; the repo's Pages settings name `dw.longreach.ai` and enforce HTTPS.
dw holds no secret: the Google client and its secret are the gateway's, in Infisical.

## 8. Open questions

1. **The other four demos' content.** Briefs, indicators and sample documents for Northwind,
   Calder, Verity and Alder are content work. Which come first?
2. **One clock or several.** test8 runs every client at 2027-03-31, as do Northwind, Calder Point
   and Verity; Alder runs at 2027-11-15. dw takes each demo's clock; does any screen compare demos and
   need one?
