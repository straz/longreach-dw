# Decision Watch (dw) — docs

Decision Watch at `https://dw.longreach.ai`: a port of the frozen test8 demo whose data lives in
Longreach's API (`https://api.longreach.ai`, tyapi). No code yet.

| File | What it is |
|---|---|
| `PLAN.md` | The port: what carries over from test8, what changes, sign-in, running locally, phases, testing, deployment |
| `pitch-2026-09.md` | The pitch (copied from `longreach/test7/docs/`) |
| `DESIGN.md` | The analyst tool UI design (copied from test7, reference for later) |
| `ai-bubble-devansh-2026-09.md` | The source article behind the AI-infrastructure domain (copied) |

Elsewhere:
- The demo being ported: `~/src/lr/longreach/test8` (`README.md`, `PRODUCT.md`, `docs/PLAN.md`).
- The backend's plan: `~/src/lr/tyapi/docs/18-dw-backend.md`; its MCP endpoint:
  `docs/16-mcp.md`.

`archive/` holds the earlier plan for Demo 1, "What were we thinking?" (written 2026-10, before
test8): its plan, spec, ontology revision 3, the Postgres data layer it designed and its gaps. The
port replaces that design: the data model is tyapi's ty-core, and the data layer is tyapi.
Other demo notes: Demo 2, `~/src/lr/longreach/test7/docs/DEMO2.md`; Demo 3,
`~/src/lr/longreach/test7/docs/DEMO3.md`; the analyst-tool mockup,
`~/src/lr/longreach/decision-watch.html`.
