# Decision Watch, Demo 1 — Software Engineering Plan

No code yet. This plan builds Demo 1 (`DEMO1.md`) as a static site, on a data contract designed
to be served later by the Postgres graph (`DATA-LAYER.md`). Read with `ONTOLOGY.md` (revision 3)
and `GAPS.md`.

---

## 1. Goals and non-goals

**Goals**
1. Demo 1 as specified: one screen, a causal chain, a TODAY button, propagation, a computed
   verdict. Phone first. Offline. Accessible.
2. Build it on the **real architecture in miniature**: seed data → validated graph export →
   deterministic engine → UI. Nothing in the demo is hard-coded that the product would compute.
3. Leave behind reusable parts: the graph contract, the engine, and the seed tooling, so Demo 2,
   Demo 3, and the analyst tool are built on the same foundation.

**Non-goals for this plan's MVP**
- The server and database (designed in DATA-LAYER; phase 6 is a later build).
- Editing, multiple users, clients, Watch views, AI suggestions.
- Demo 2's economics and Demo 3's processes (notes in `longreach/test7/docs/DEMO2.md`, `DEMO3.md`).

---

## 2. What we reuse

| From | What | How |
|---|---|---|
| test7 Phase 1 (`longreach/test7/`) | Vite + React 19 + TS + pnpm + vitest + oxlint setup; `tokens.css` with `--action` tokens; self-hosted fonts; `brand.yml` and white-label build check; YAML loader with `JSON_SCHEMA`; copy-shape pattern; `test-setup.ts` shims | **Copy** into `dw/web/`, as test7 copied from test6. test7 stays frozen |
| test6 (`longreach/test6/`) | `Dialog` (native dialog), `SourcePanel` pattern, `spans.ts` quote resolution | Copy for the node sheet |
| `decision-watch.html` | gap chart SVG drawing (threshold, tolerance zone, stance glyphs); stance rules (`ruleStance`); fictional source names | Port the logic into the engine and a `GapChart` component, with tests; the file stays as a reference |
| cardb | backend conventions (uv, async SQLAlchemy, Alembic, service layer) | Phase 6 |
| StackDB | YAML seed conventions (handles, typed fields, named links) | Seed format (DATA-LAYER §7) |

---

## 3. Architecture

```
 seed/*.yml ──► compile (Node, build time) ──► graph.json ──► engine (pure TS) ──► UI (React)
 (StackDB-like)   validate against registry       (DATA-LAYER §6)   as-of, states,     Demo 1 screen
                  reject cycles, bad refs                           support, exposure,
                                                                    diff, verdict
                                        later: FastAPI /v1/graph serves the same graph.json
```

- **One contract**: `graph.json`, versioned, with a JSON Schema (`shared/graph.schema.json`). The
  static build produces it from YAML; the server will produce it from Postgres. A golden test will
  check both produce the same document for the same seed (phase 6).
- **The engine is pure**: no DOM, no React, no clock. Inputs: the graph, a scope, a snapshot, an
  as-of date. Outputs: plain data. It is the only place states are decided.
- **The UI only renders** what the engine returns, plus animation timing.
- **Output**: a normal static build (for GitHub Pages) and, via `vite-plugin-singlefile`, one
  self-contained `demo1.html` (fonts and data inlined) that can be emailed, opened offline, or shown
  from a phone's files. That keeps the portability of `decision-watch.html` without its maintenance
  cost.

### 3.1 Engine API

```ts
type AsOf = { snapshotSeq?: number; evidenceDate: IsoDate }

loadGraph(json: unknown): Graph                          // validates against the schema
view(graph, scope: Handle, asOf: AsOf): GraphView         // latest versions as of (beliefs by seq, evidence by date)

ownState(view, asm: Handle): OwnState                     // holding · weakening · broken · untested, with the readings used
supportStates(view, root: Handle): Map<Handle, Support>   // supported · at_risk · weakened, topological order
displayState(own, support): DisplayState                  // broken > at_risk > own
downstream(view, asm: Handle): { conclusions: Handle[]; commitments: Handle[] }
exposure(view, asm: Handle): { total: Money | null; from: { commitment: Handle; size: Money | null }[] }
diff(view, asm: Handle): { expected; actual; changeSinceBaseline; unit }
verdict(view, commitment: Handle): Verdict                // DEMO1 §3.5, with its inputs listed
```

Rules come from ONTOLOGY §7 (1, 9, 10, 11). Every function has fixture tests (§6).

### 3.2 UI components

`App` (state: `asOf`, `phase`: then · evaluating · today, selected node) · `BrandHeader` (from
test7) · `CommitmentCard` · `Chain` (vertical under 720 px, horizontal above) · `ChainNode`
(state, glyph, word, expected/actual line) · `ChainEdge` (necessary vs supporting, lit state) ·
`TodayButton` · `AsOfCounter` · `VerdictCard` (aria-live) · `NodeSheet` (Dialog: claim, `GapChart`,
readings, sources, what depends on it, how it was computed) · `GapChart` (ported) · `Footer`.

---

## 4. Repository layout

```
dw/
  docs/                    this plan, DEMO1, ONTOLOGY, DATA-LAYER, GAPS, pitch, DESIGN (reference)
  shared/
    graph.schema.json      the contract
    registry/              node and link types from ONTOLOGY (YAML; source for the schema and, later, the DB migration)
    fixtures/              engine test corpus: small graphs + expected outputs (shared with the Python port later)
  seed/
    demo1/                 halberd-50m change sets (YAML), indicators, observations, sources
  web/                     Vite + React app (copied infrastructure from test7)
    scripts/
      compile-graph.ts     seed/*.yml → public/graph.json, validated
      check-content.ts     brand, white-label, guardrail words, schema
    src/
      engine/              pure TS, §3.1
      components/  screens/  styles/  data/  (brand, copy)
  server/                  phase 6 (DATA-LAYER §10)
```

---

## 5. Phases

Each phase ends with checks that can fail.

### Phase 0 — Repository and scaffold
- `git init` in `dw/`, or decide it lives in the longreach site repo (§8 Q1). Hosting decision (§8 Q2).
- Copy test7 Phase 1 infrastructure into `dw/web/`; strip test7-specific screens; keep `brand.yml`,
  tokens, fonts, white-label check.
- CI: install, lint, typecheck, test, build (GitHub Actions).
- **Verify:** empty branded page builds, at 360 px and 1920 px; white-label check fails on a planted
  firm name.

### Phase 1 — Registry, schema, seed, compiler
- `shared/registry/` with the node and link types Demo 1 needs (strategy, commitment, assumption,
  indicator, observation, source, role; supports, measures, expects, authorizes, about), each with
  a JSON Schema for its fields, derived from ONTOLOGY rev 3.
- `graph.schema.json` (DATA-LAYER §6).
- `seed/demo1/` per DEMO1 §4: one base change set for the strategy; one intake change set per
  month of readings; fictional sources.
- `compile-graph.ts`: YAML → graph.json; validates fields against the registry, link endpoint
  types, handle references, acyclic `supports`, required `published_at` on observations,
  provenance rules (synthetic records only from fictional sources).
- **Verify:** the seed compiles; each validation rule has a failing fixture that names the file,
  record, and field; the output validates against the schema.

### Phase 2 — Engine
- Implement §3.1. Port `ruleStance` and gap-run logic from the mockup, generalized.
- Fixture corpus in `shared/fixtures/`: the Demo 1 seed at Oct 1 and Mar 31; a chain with two
  breaks (plural verdict); a break on a supporting-only link (weakened, not at risk); a diamond
  (two paths to one commitment, counted once); a commitment without size (exposure listed, total
  marked incomplete); a cycle (rejected at load); tolerance edges (exactly at threshold, exactly at
  tolerance).
- **Verify:** all fixtures pass; mutation spot checks (flip `<` to `<=`, drop the necessity check)
  are caught; at Mar 31 the verdict reads exactly as DEMO1 §1, with every number computed.

### Phase 3 — Demo screen
- Then state, TODAY transition, Today state, verdict, THEN replay, `#today` deep link.
- Chain layout vertical (phone) and horizontal (wide); nodes show state glyph + word.
- **Verify:** component tests for each phase of the flow; Playwright screenshots at 390×844 and
  1440×900 in both states; no console errors; no horizontal scroll.

### Phase 4 — Node sheet and depth
- `NodeSheet` with `GapChart` (ported), readings table, sources marked fictional, "depends on" and
  "supports" lists, and "how this was computed" (D-6).
- **Verify:** every number on screen can be traced from the sheet to a seed reading; sheet traps
  focus and closes on Escape.

### Phase 5 — Polish, accessibility, offline, hallway test
- Reduced motion; presenter mode (`?presenter`: reset, slow); aria-live verdict; axe and
  Lighthouse; single-file build; airplane-mode run on a phone.
- Hallway test with 5 people (DEMO1 §7.1); adjust copy and layout from what they say.
- **Verify:** acceptance criteria in DEMO1 §7, each checked and recorded in `docs/QA.md`.

### Phase 6 — Data layer (later; separate build)
Per DATA-LAYER: S1 schema and registry migration · S2 seed loader writes change sets · S3
`/v1/graph` export with a golden test against `compile-graph.ts` output · S4 change-set write API
with validation · S5 Python engine port against the shared fixtures. The demo switches from
`graph.json` to `/v1/graph` by configuration only.

---

## 6. Testing strategy

| Level | Tool | What |
|---|---|---|
| Schema and seed | compiler + vitest | every rule has passing and failing fixtures; errors name file/record/field |
| Engine | vitest, shared fixtures | pure functions; fixtures are data so the Python port can run them |
| Components | vitest + Testing Library (jsdom) | each state renders its glyph, word, and text; verdict text |
| Flow and visual | Playwright | Then → TODAY → Today on phone and desktop sizes; screenshots compared |
| Accessibility | axe (Playwright), Lighthouse | zero violations; keyboard-only run |
| Content | `check-content.ts` | brand, white-label, guardrail words (no "sell", "wrong", "failed", "recommend", "guaranteed"), fictional-source rule |
| Offline | manual | single-file build in airplane mode on iOS and Android |

Prove tests can fail: for the engine and compiler, a deliberate mutation per rule must fail a test
(the practice from test6/test7).

---

## 7. Tooling and conventions

- pnpm, Vite, React 19, TypeScript strict, vitest, oxlint, Playwright; `vite-plugin-singlefile`
  for the portable build; `js-yaml` (`JSON_SCHEMA`) in the compiler; `ajv` for JSON Schema.
- No runtime network calls; fonts self-hosted.
- Python (phase 6): `uv`, `pyproject.toml`, ruff, pytest (cardb conventions).
- Copy and brand in YAML, as in test7; firm name only in `brand.yml`.

---

## 8. Decisions needed

1. **Where `dw` lives:** its own git repo, or a folder in the longreach site repo like test2–test7.
2. **Hosting:** public on longreach.ai, a private link, or files only (single-file build for
   meetings). Related to GAPS I-7 for the existing mockup.
3. **Company name** for the demo subject (DEMO1 §9 Q1).
4. **"Broken" vs "contradicting"** (DEMO1 §9 Q4, GAPS D-11).
5. **Chain or visible DAG** on the main screen (DEMO1 §9 Q2).
6. **Conviction's role** in verdicts (GAPS D-8).

---

## 9. Sizing (rough)

| Phase | Size | Notes |
|---|---|---|
| 0 | S | mostly copying |
| 1 | M | registry and validator are the careful part |
| 2 | M | small API, many edge cases |
| 3 | M | animation and two layouts |
| 4 | S–M | chart port |
| 5 | S | plus the hallway test |
| 6 | L | a separate build |
