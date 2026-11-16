# Demo 1 — "What were we thinking?"

A 30–60 second demo that needs almost no explanation. One investment thesis, written as a causal
chain. One click on **TODAY**. Three links stay green, one breaks, everything downstream lights up,
and a single verdict states what is exposed and that reconsideration is warranted.

What the audience should take away, without being told: *there is a system of record for the
**why**, the why is a chain (a graph, not a memo), and the tool shows the **diff** between that
chain and today's evidence.*

This document is the product and UX spec. `PLAN.md` is how we build it, `ONTOLOGY.md` is the data
model, `DATA-LAYER.md` is persistence, `GAPS.md` is what is still missing.

---

## 1. The story

**Then (Oct 1, 2026).** Verity Investments commits **$50M** to **Halberd Compute** (a fictional
GPU cloud operator; name to confirm, §9 Q1). The investment committee wrote down why:

```
AI demand ↑  →  hyperscaler capex ↑  →  GPU utilization ↑  →  pricing power ↑  →  margins ↑  →  Invest $50M in Halberd
```

Each link is a claim the committee believed, and each has a measure that can be checked:

| # | Claim (plain English) | Measure | What "holding" means |
|---|---|---|---|
| 1 | AI demand keeps rising | model-lab run-rate revenue, aggregate | rising over the last 2 quarters |
| 2 | Hyperscalers keep raising capex | top-4 hyperscaler capex, trailing 2 quarters | at or above the Sep 2026 level |
| 3 | GPUs stay well utilized | GPU cluster utilization index | at or above 85% |
| 4 | Operators keep pricing power | H100 rental price index | at or above the Sep 2026 level ($2.10/GPU-hr), tolerance 5% |
| 5 | Halberd's margins expand | Halberd gross margin | rising (this is a conclusion: it depends on 4) |
| — | **Invest $50M in Halberd** | the commitment (the *what*) | supported while its necessary reasons hold |

**Today (Mar 31, 2027).** Click **TODAY**:

- Claims 1–3: still hold (green). Demand, capex and utilization all came in as expected.
- Claim 4: **breaks.** `EXPECTED: pricing ≥ $2.10 · ACTUAL: $1.87, pricing ↓ 11%`.
- Claim 5 and the investment light up as **at risk**: not because their own numbers are in, but
  because a reason they depend on has broken.
- The verdict appears:

```
ASSUMPTION BROKEN
"Operators keep pricing power" no longer holds: H100 pricing is down 11% since Oct 1.
It supported 2 downstream conclusions and $50M of exposure.
Reconsideration warranted. Next scheduled review: Apr 15 (15 days).
```

That is the whole demo. The narrator says one sentence at most: *"This is the why behind a $50M
decision, kept as a system of record. Watch what happens when I ask it about today."*

---

## 2. Principles for this demo

1. **One screen, one story, one click.** No tabs, filters, menus, or settings on the demo path.
2. **Phone first.** It is shown in the back of an Uber: portrait phone (390×844) is the primary
   layout; it must also read on a laptop and a projector.
3. **The chain is the hero.** The DAG is the largest element; every node reads as a short sentence.
4. **Diff, not dashboard.** Each node shows EXPECTED vs ACTUAL only after TODAY; before that it
   shows only what was believed.
5. **Readable in color-blind conditions.** Every state has a glyph and a word, not only a color.
6. **Depth on demand, never forced.** Tapping a node opens its evidence; the demo works without it.
7. **Honest data.** Fictional company, fictional sources, labeled as such on screen. The article's
   real facts may be cited as background, never mixed into Halberd's numbers.
8. **The tool never decides.** "Reconsideration warranted", never "sell", "wrong", or "failed"
   (guardrails carried from test6/test7, `DESIGN.md` §8).

---

## 3. Screens and states

### 3.1 Then (opening state)

```
┌───────────────────────────────────┐
│ Verity Investments                │
│ Decision Watch · powered by        │
│ Longreach                         │
├───────────────────────────────────┤
│ Invest $50M in Halberd Compute    │  ← the WHAT, top
│ Decided Oct 1, 2026 · Investment  │
│ Committee                         │
│                                   │
│ WHY                               │
│ ┌───────────────────────────────┐ │
│ │ AI demand keeps rising     ↑  │ │
│ └──────────────┬────────────────┘ │
│ ┌──────────────▼────────────────┐ │
│ │ Hyperscalers keep raising     │ │
│ │ capex                      ↑  │ │
│ └──────────────┬────────────────┘ │
│        … utilization, pricing,    │
│          margins …                │
│ ┌──────────────▼────────────────┐ │
│ │ Halberd's margins expand   ↑  │ │
│ └──────────────┬────────────────┘ │
│        supports the decision      │
│                                   │
│  As of Oct 1, 2026   [ TODAY ▶ ]  │  ← one primary button
├───────────────────────────────────┤
│ Fictional company and data.       │
└───────────────────────────────────┘
```

- Nodes are neutral (outlined), each with its belief arrow (↑) and nothing else.
- The commitment is at the top, above the WHY. The chain flows down toward "supports the
  decision". (The investment is both the headline and the chain's end; the final edge loops back
  visually to the header card. Alternative: commitment as the last node. See §9 Q3.)
- On a laptop the chain runs left to right with the commitment as the rightmost node.

### 3.2 Evaluating (the transition, ~3 seconds)

- Clicking **TODAY** animates the "as of" date from Oct 1, 2026 to Mar 31, 2027 (a counter, about
  1 second), then evaluates nodes in order, top to bottom, ~300 ms each:
  - holding nodes turn green with ✓ and show `EXPECTED … · ACTUAL …` in one line;
  - the breaking node turns to the broken state (strong amber-red, ✕ glyph, bolder border),
    shows the actual value large: `pricing ↓ 11%`, and a tiny sparkline;
  - then the downstream edges and nodes light up in the at-risk state (amber, ⚠), with the
    reason: `depends on a broken assumption`.
- With `prefers-reduced-motion`, everything appears in its final state at once.

### 3.3 Today (final state)

- The verdict card slides up (on phones, pinned to the bottom; on wide screens, beside the chain).
- The **TODAY** button becomes **THEN ◀** so the presenter can replay.
- Tapping any node opens a bottom sheet with: the claim, the measure, a chart of its readings from
  Sep 2026 to Mar 2027 with the threshold line, the readings table, each reading's source (fictional
  sources, marked), and what depends on it. This is the only depth.

### 3.4 Node states

| State | When | Look | Glyph · word |
|---|---|---|---|
| believed | before TODAY | outlined, neutral | ↑ belief arrow |
| holding | evidence within expectation | green fill, light | ✓ Holding |
| broken | evidence past the expectation by more than the tolerance | strong amber-red, heavy border | ✕ Broken |
| at risk | own evidence absent or holding, but a **necessary** upstream claim is broken | amber, dashed border | ⚠ At risk |
| weakening | within tolerance but moving the wrong way (not used in the demo script; supported) | light amber | ▼ Weakening |

Colors come from the Verity tokens (test7 `tokens.css`): action green for buttons only; status
colors are separate. "Broken" is the only strong color on the screen.

### 3.5 The verdict

Generated from the graph, not written by hand:

- **Headline:** `ASSUMPTION BROKEN` (or `ASSUMPTIONS BROKEN` with a count).
- **Line 1:** the broken claim in plain English, and its diff in words (`down 11% since Oct 1`).
- **Line 2:** `It supported {n} downstream conclusions and {exposure} of exposure.` `n` counts the
  conclusions and commitments reachable downstream along necessary links; `exposure` sums the sizes
  of the commitments reached.
- **Line 3:** `Reconsideration warranted.` plus the next scheduled review and days left, when known.
- **Who:** `Decision authority: Verity Investment Committee` (the AUTHORITY of the decision object).

Wording note: the demo brief says "ASSUMPTION BROKEN". The earlier design vocabulary was
"contradicting". Demo 1 uses **broken** on the verdict and node; the analyst tool keeps
"contradicting". Decide whether to converge (§9 Q4).

---

## 4. Data for the demo

All Halberd data is synthetic and attributed to fictional sources (the rule from test7 ONTOLOGY
§11.2). One seed file per the data-layer format (`DATA-LAYER.md` §7). Values to author:

| Measure | Sep 2026 (baseline) | Dec 2026 | Mar 2027 (today) | Expectation | Result |
|---|---|---|---|---|---|
| Model-lab run-rate revenue (aggregate) | $90B | $104B | $121B | rising | holding |
| Top-4 hyperscaler capex, trailing 2Q | $178B | $191B | $203B | ≥ $178B | holding |
| GPU cluster utilization index | 91% | 89% | 87% | ≥ 85% | holding |
| H100 rental price index | $2.10 | $1.98 | $1.87 | ≥ $2.10, tolerance 5% | **broken** (−11.0%) |
| Halberd gross margin | 41% | 40% | — (not yet reported) | rising | **at risk** (upstream) |

- Monthly readings for the price index (Oct–Mar) so its sparkline has a shape; quarterly for the
  others.
- `−11%` = (1.87 − 2.10) / 2.10 = −10.95%, displayed rounded. The verdict computes it; nobody types it.
- The margin's latest reading is deliberately absent at TODAY: the demo shows that the tool flags
  a conclusion **before** its own numbers arrive, because its reason has broken. That is the "before
  the calendar catches up" point from test6.
- Sources: *Northgate Research GPU Index* (fictional), *Keystone Filings Digest* (fictional),
  *Meridian Credit Wire* (fictional), reused from `decision-watch.html`. The H100 values here differ
  from that mockup's series; reconciling them is in `GAPS.md` (I-6).

---

## 5. What is computed (the engine for this demo)

All deterministic, in the browser, from the graph (ONTOLOGY §7):

1. **Own state** of each claim with an expectation: compare the latest reading as of T with the
   threshold and tolerance (rule links, ONTOLOGY §7.1).
2. **Support state:** propagate along `supports` links from leaves to the commitment. A claim or
   commitment is *at risk* if any **necessary** supporter is broken (or itself at risk). Supporting
   (non-necessary) links weaken but do not make a node at risk.
3. **Display state** = broken if own state is broken; otherwise at risk if support state is at
   risk; otherwise own state.
4. **Downstream set** of each broken claim: all nodes reachable along `supports` links; conclusions
   counted separately from commitments.
5. **Exposure** of a claim = sum of `size` over the commitments in its downstream set (each
   commitment counted once).
6. **Diff** for the broken claim: expected vs actual, absolute and percent change from the baseline
   reading at the decision date.
7. **Verdict** text from 4–6 plus the authority and next review on the commitment.

All of this is unit-tested against the seed, including: a second broken claim (plural verdict), a
broken claim on a supporting-only link (no at-risk propagation), and a commitment with no size
(exposure omitted, not shown as $0).

---

## 6. Interaction details

- **TODAY / THEN** toggles "as of" between the decision date and the demo's today. URL keeps it
  (`#today`), so a presenter can open the final state directly.
- **Keyboard:** TODAY is the first focus stop; nodes are a list of buttons; the bottom sheet is a
  dialog (focus trap, Escape closes), as in test6.
- **Screen readers:** after TODAY, an `aria-live` region announces the verdict once; each node's
  accessible name includes its state word.
- **Presenter aids** (hidden unless `?presenter`): a reset button and a "slow" mode that doubles the
  animation timing for a projector.
- **Offline:** everything (fonts, data) is bundled. The demo must run in airplane mode.

---

## 7. Acceptance criteria

1. A first-time viewer understands the screen within 30 seconds with at most one spoken sentence.
   Measured by hallway test with 5 people: each can say, unprompted, which reason broke and what it
   affects.
2. TODAY to verdict in ≤ 4 seconds with motion, instantly with reduced motion.
3. Every number on screen is computed from the seed, and the seed's values are visible in the node
   sheets.
4. Works at 360 px wide and on a 1920 px projector; no horizontal scroll.
5. Lighthouse accessibility 100; axe: zero violations in both states and with the sheet open.
6. Runs offline from a single static build (or one self-contained HTML file, `PLAN.md` §3).
7. No real company is the subject of an invented claim; every synthetic value is labeled.

---

## 8. Out of scope for Demo 1

Editing the thesis, multiple strategies, clients, the Watch tab, AI suggestions, the analyst
workbench (`DESIGN.md`), option pricing and cost of delay (Demo 2), process recomposition (Demo 3),
and the server (the data layer is designed, not built, `DATA-LAYER.md`).

---

## 9. Open questions

1. **Company name.** "Halberd Compute" is a placeholder; check it isn't a real company before use.
2. **Chain or DAG on screen.** The brief draws a chain. The data model is a DAG. Should Demo 1 show
   one branch (e.g. "power availability" also supporting utilization) to make the graph visible, or
   stay a pure chain for simplicity? Recommendation: pure chain for the 30-second version, with the
   branch visible only in the node sheet.
3. **Where the commitment goes.** Top (headline) or end of chain. Recommendation: both, as described
   in §3.1, if it reads clearly in testing; otherwise end of chain.
4. **"Broken" vs "contradicting".** Pick one term for the product, or keep "broken" for demos only.
5. **Real-company variant.** A version with real names (CoreWeave, H100 prices from public data) is
   more persuasive but needs real, cited data and legal comfort. Not for the public site.
