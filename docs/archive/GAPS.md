# Gaps: pitch vs design vs implementation

What the pitch (`pitch-2026-09.md`) promises, what the ontology and designs cover, what exists in
code, and what Demo 1 will show. Written 2026-10-05, after reading `longreach/decision-watch.html`
(the current mockup), `longreach/test7` (Phase 1 scaffold and docs), test2/test5/test6, and this
folder's `ONTOLOGY.md` (revision 3).

Legend: **✓** covered · **◐** partly · **✗** missing · **—** not applicable.

---

## 1. Pitch claims

| # | Pitch claim | Ontology (rev 3) | Code today | Demo 1 shows it | Gap and where it is handled |
|---|---|---|---|---|---|
| P1 | A system of record for the **why**, a first-class data object | ✓ decision object (§1.1), versioned graph (DATA-LAYER) | ◐ mockup holds beliefs inline in JS | ✓ | Persistence is designed, not built (I-5) |
| P2 | Captures **assumptions and causal reasoning** | ✓ since rev 3: `supports` DAG | ✗ mockup has bets with flat assumption lists | ✓ the chain | Engine and UI to build (PLAN phases 2–3) |
| P3 | **Deterministic**, not a token-burning black box | ✓ rules computed; AI only suggests (§3, §7) | ✓ mockup's rule stances | ◐ the verdict is computed, but nothing on screen *says* so | Add "how this was computed" in the node sheet (DEMO1 §3.3); D-6 |
| P4 | Measure the **gap** between an assumption and evidence | ✓ expectations, rule stances, gap chart | ✓ mockup gap charts | ✓ expected vs actual | — |
| P5 | **Three clocks**: evidence changes, commitments persist, options expire | ◐ evidence time ✓; commitment `term` added; option clock planned (§15.1) | ◐ meetings and as-of only | ◐ two clocks (evidence, next review) | Option clock is Demo 2 (D-1) |
| P6 | Know which commitments have **stopped earning** tomorrow's resources | ◐ support state and exposure (§4.7); "tomorrow's resources" needs unspent amounts | ✗ | ◐ which commitment, not how much is still unspent | Governable amount, Demo 2 (D-1) |
| P7 | **Compute what changing your mind is still worth** | ✗ Option is a placeholder; no method | ✗ (test5 and test2 have toy "capital still in play" formulas) | ✗ | Demo 2; method undefined (D-2) |
| P8 | Make the why **computationally addressable**: "authorized X because A, B, C; when B changes, who cares and by how much" | ✓ `supports`, traversal, exposure | ✗ | ✓ (one commitment) | Cross-commitment version: D-4 |
| P9 | **One changed fact productive everywhere** it matters | ✓ shared evidence, rule 8 | ✓ mockup: one observation, several strategies | ✗ one commitment only | Optional Demo 1 coda: "also affects 2 other commitments" (D-4) |
| P10 | **Discover options** inside existing commitments (redirect, resize, renegotiate…) | ✗ Option placeholder; no discovery method | ✗ | ✗ | Demo 2; who proposes options (analyst, template, AI) is open (D-3) |
| P11 | **Price organizational delay**: what do 30 more days cost? | ✗ | ✗ (test2 has `optionalityBurn`, a toy) | ✗ | Demo 2 (D-2) |
| P12 | **Route** changed evidence to someone with authority | ◐ `authorizes` added; no routing or notification | ✗ | ◐ names the authority | Notification needs the server (I-5, D-5) |
| P13 | **Learn which reasons deserve money**: cohorts, hit rates, who changes course too early/late/never | ◐ prediction hit rate (query 8); Outcome planned | ✗ | ✗ | Needs Outcomes and volume; sensitive when it rates people (D-7) |
| P14 | **Compound** capital allocation: reason → commitment → evidence → reconsideration → action → outcome | ◐ everything but outcome | ◐ mockup has reviews and snapshots | ◐ up to reconsideration | Outcome (§15.1) |
| P15 | **Black-Scholes**-like pricing of reconsideration options | ✗ | ✗ | ✗ | Analogy only; a real option model needs volatility, horizon, payoff. Don't imply it exists (R-2) |

**Reading:** the design now covers the why, the gap, propagation and exposure, so Demo 1 can show
P1–P4 and P8 honestly. The pitch's economic claims (P6, P7, P10, P11, P15) depend on entities and
methods that don't exist yet. That is Demo 2's territory, and the riskiest part of the pitch to
demo without a stated method.

---

## 2. Design gaps

| ID | Gap | Why it matters | Proposed handling |
|---|---|---|---|
| D-1 | **Governable amount and the option clock** are not modeled | P5, P6, P7 rest on "what is still changeable, until when" | Add `spent`, `committed`, `governable` to budget Commitments and an Option entity with `exercise_by` (ONTOLOGY §15.1); design in Demo 2 notes |
| D-2 | **No method for "value of reconsidering" or "cost of delay"** | Demo 2 shows "$3.2–5.1M"; an unexplained range will be challenged in the first meeting | Write the method before the number: inputs, formula, ranges, labeled illustrative. Candidates in `test7/docs/DEMO2.md` |
| D-3 | **Who discovers options?** | P10 promises discovery, not just listing | Start with a per-kind option template (budget: resize · stage · redirect · stop); AI suggestions later, marked as AI |
| D-4 | **Cross-commitment propagation not demonstrated** | P9 is a core differentiator | The engine already computes it; add a second and third commitment sharing the pricing assumption, shown only on request in Demo 1 (or in a Demo 1b) |
| D-5 | **Authority routing** has a link but no behavior | P12: "insight without authority is just another notification" | Demo: name the authority and the next review. Product: notification and acknowledgment, with audit, when the server exists |
| D-6 | **Determinism is invisible** | P3 is a claim the audience can't see | Node sheet shows "computed from: reading, threshold, rule"; verdict lists its inputs (ONTOLOGY principle 6) |
| D-7 | **Learning about people** ("which leaders change course too early") | Useful, and politically charged inside a client | Design learning at the level of assumption classes and sources first; people-level only with explicit opt-in |
| D-8 | **Conviction does nothing** in rev 3 diagnostics | test7's earlier design used conviction to rank gaps; the pitch implies "by how much" | Use conviction to order verdicts and as a display weight; never to change a state. Decide before the analyst tool |
| D-9 | **Exposure overlap** | Two commitments can be the same money (a budget line and the investment it funds) | Commitments may `part_of` another; exposure counts the outermost once. Defer until Demo 2 has budgets |
| D-10 | **`lag_days` is recorded but unused** | Pricing reaches margins with a lag; at-risk could be dated | Use only for display ("expect margin impact by ~Q2") in v1 |
| D-11 | **Vocabulary split** | Demo says "broken"; analyst tool says "contradicting"; test6 banned "wrong"/"failed" | Pick one product term (DEMO1 §9 Q4) |
| D-12 | **Investment-specific names** (Strategy, Position, Bet) | Demos 2 and 3 are budgets and processes | Commitment is generic since rev 3; consider renaming Strategy → Decision when Demo 2 is designed |
| D-13 | **Real vs fictional subjects** | Persuasion wants real names; safety wants fiction | Demo 1 uses a fictional company with market-level fictional series; real-name variants only with real, cited data, never public |

---

## 3. Implementation gaps

| ID | Gap | Detail | Handling |
|---|---|---|---|
| I-1 | **The mockup is one 1,324-line HTML file** | data, engine, and UI interleaved; no tests; no build | Demo 1 is built as a small app with a separate engine (PLAN); the mockup stays a reference |
| I-2 | **test7 code targets a retired design** | Phase 1 scaffold (brand, tokens, white-label check) was built for the 50-signals design | Reuse its infrastructure in dw (PLAN phase 0); don't extend test7 |
| I-3 | **No reusable engine** | stance, state, gap-run logic lives inline in the mockup | `engine/` package in TypeScript with a fixture corpus (PLAN phase 2) |
| I-4 | **No graph format, schema, or seed loader** | data is JS literals | `graph.schema.json`, YAML seeds, compiler (PLAN phase 1; DATA-LAYER §6–7) |
| I-5 | **No server or database** | | Designed in DATA-LAYER; built after Demo 1 (PLAN phase 6) |
| I-6 | **Inconsistent synthetic series** | Demo 1's H100 index ($2.10 → $1.87) differs from the mockup's ($2.10 → $1.47) | Demo 1 owns its seed; when the analyst tool moves onto the graph, one shared fictional dataset replaces both |
| I-7 | **Public exposure of synthetic adverse claims about real companies** | `decision-watch.html` is committed and pushed in the longreach site repo, not excluded by `_config.yml`, so it is likely live at longreach.ai | Decide whether it should be public; if not, exclude it or move it. Demo 1 avoids the issue with a fictional subject |
| I-8 | **No propagation or exposure code anywhere** | | Engine phase 2 |
| I-9 | **Reusable pieces are scattered** | test6: memo extraction with source spans; test5: capital still in play; test2: governable capital, cost-of-waiting toys; test7: brand and white-label | Inventory in PLAN §2; Demo 2 notes say which to reuse |
| I-10 | **`dw` is not a repository yet** | only `docs/` exists; no git, no hosting decision | PLAN phase 0 |

---

## 4. Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-1 | Demo 1 reads as a dashboard, not a story | One screen, one button, one verdict (DEMO1 §2); hallway test is an acceptance criterion |
| R-2 | Economic claims (P7, P11, P15) outrun what we can compute | Show numbers only with a stated method and an "illustrative" label; keep Black-Scholes as an analogy in speech, not a feature |
| R-3 | Fictional data mistaken for real | Fictional company and sources, labeled on screen; real facts only as cited background |
| R-4 | Demo-driven ontology drift | Every demo change goes into ONTOLOGY first (§15 changelog) and in the type registry |
| R-5 | Two diagnostic engines diverge (TS now, Python later) | Shared fixture corpus as the contract (DATA-LAYER §9) |
