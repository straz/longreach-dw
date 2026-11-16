# Verity Investments · Decision Watch (test7): User Interface Design

> **Reference copy (dw, 2026-10-05).** Copied from `longreach/test7/docs/DESIGN.md`; only this note was added. This is
> the analyst tool's design, implemented in `longreach/decision-watch.html`. Demo 1 (`DEMO1.md`)
> does not implement it; it is kept here as the target for later work on the same ontology.

Builds on `ONTOLOGY.md`, which defines every record named here. No code yet.

---

## 0. About Decision Watch

This is the product's own description. It appears in the About panel and, shortened, under the
header on first visit. It lives in `copy.yml` so it can be edited without code.

> **Decision Watch** helps Verity analysts keep each client's investment strategies in step with
> what is actually happening.
>
> **Decision** is where you write and curate a strategy: what the client is invested in, the
> thesis behind it, and the assumptions and predictions it depends on. It is how you and your
> client agree on the direction ahead.
>
> **Watch** is where you see how it plays out. It follows reported facts as they come in, shows
> the trends, and points out gaps where reality is moving away from what the strategy assumed or
> predicted.
>
> You may meet your clients on a schedule, perhaps quarterly, but gaps can open much faster than
> that. Decision Watch helps you stay ahead of the curve and reconsider a strategy while there
> is still time to do something about it.

Short form, for the header strip: *Record what each strategy assumes. See when reality moves
away from it, in time to act.*

---

## 1. UX principles

1. **A gap is never hidden.** If an assumption or prediction has evidence against it, that shows
   wherever the assumption appears: in Watch, in Decision, on player pages. Not only on one
   screen.
2. **Show the gap, not a score.** A gap is drawn as the distance between what was expected and
   what was reported, on the indicator's own scale, with each observation visible. Counts are
   allowed; each opens its list.
3. **Every value says where it came from.** A provenance mark on every value (§6.1). Analyst,
   AI, external, and derived records never look alike.
4. **Time is visible.** Every gap shows when it opened and how long until the next client
   meeting. The analyst can move the "as of" date and watch gaps open.
5. **One click from noticing to acting.** From any gap, the analyst can review it, judge
   evidence, or open a change to the strategy, without losing their place.
6. **Plain English first, detail on demand.** Statements read as sentences; thresholds, IDs, and
   rules sit one level down.
7. **The tool never decides.** It says "reconsider", never "sell", "wrong", "failed",
   "recommend", or "guaranteed". The analyst keeps all investment authority.

---

## 2. Shell and navigation

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Verity  Decision Watch   Client: [Harlow County Teachers' Pension ▾]  As of: [Mar 31 2027 ▾]│
│                                                       Priya Raman   Library   ⓘ About      │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  [ Decision ]  [ Watch  •4 ]                        Next meeting: Apr 15 (15 days)        │
├─────────────────────────┬────────────────────────────────────────────────────────────────┤
│ STRATEGIES              │                                                                │
│ ○ All strategies        │                                                                │
│ ● AI infrastructure     │                 main pane (depends on tab)                     │
│   credit        ▲2 ▼1   │                                                                │
│                         │                                                                │
│ TEMPLATES               │                                                                │
│   Devansh thesis v1     │                                                                │
│ [+ New strategy]        │                                                                │
└─────────────────────────┴────────────────────────────────────────────────────────────────┘
  Verity analysts only. Mixes cited public facts with fictional demonstration data. Not investment advice.
```

- **Header.** Firm and product name from `brand.yml`. The **client selector** includes *All
  clients*, which shows Priya's whole book (this is where the cross-strategy queries live). The
  **as-of selector** sets the evidence date (default: demo today, Mar 31 2027); see §5.6.
  **Library** opens the shared pool (§4). **About** opens §0.
- **Tabs.** `Decision` and `Watch`. The Watch tab carries a badge with the number of open gaps
  in the current scope. Both tabs share the left list and its selection.
- **Next meeting** for the selected client, with days remaining. With *All clients*, the
  soonest meeting.
- **Left list.** The selected client's strategies (grouped by client under *All clients*), then
  templates. Each strategy shows its open gaps as small counts by kind: ▲ contradicting,
  ▼ weakening (text labels on hover and for screen readers). *All strategies* at the top gives
  Watch a combined view. On phones the list becomes a picker above the main pane.
- **URL** records client, tab, strategy, view, selected item, filters, and as-of date, so any view
  can be linked and survives a reload.
- **Footer** from `brand.yml`, stating that the demo mixes cited public facts with fictional
  data.

---

## 3. Decision tab: author and curate the strategy

Purpose: write down what the client is invested in and why, in a form the client can agree to,
and keep it current.

### 3.1 Strategy page

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ AI infrastructure credit                                   [Edit] [Client summary]    │
│ Harlow County Teachers' Pension · AI infrastructure · forked from Devansh thesis v1   │
│ Current snapshot: Feb 20 2027 · presented to client Jan 14 · 2 gaps since then         │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ THESIS                                                                                │
│ AI demand is real; the risk is in financing that depends on a few buyers.            │
│                                                                                       │
│ POSITIONS                                                                             │
│  Lend    Senior secured GPU-backed project debt            relies on 4 assumptions ▲1 │
│  Avoid   CoreWeave unsecured notes                         relies on 3 assumptions    │
│  Lend    Data-center construction loans, IG tenants only   relies on 2 assumptions    │
│                                                                                       │
│ WHY: BETS AND ASSUMPTIONS                          group by: [Role ▾]  show: [All ▾]  │
│  Model labs: "Usage and revenue grow fast enough to support compute commitments"      │
│   ● necessary  OpenAI keeps raising outside capital on schedule   high  ▲ gap  ~~~╱  │
│   ● necessary  OpenAI 2027 revenue ≥ $55B (prediction, Dec 31)     med   on track     │
│   ○ supporting Anthropic run-rate keeps rising                    med   supported    │
│  Neoclouds: "Recover upfront costs before contracts reset"                            │
│   ● necessary  CoreWeave top-3 customer share ≤ 75%               med   ▼ weakening  │
│   ...                                                                                 │
│                                                                                       │
│ RISK MAP        (analyst's levels, 1–5; blank = no view)                              │
│                 pricing funding counterparty renewal concentration                    │
│  Oracle            ·       5         5           ·         4                          │
│  CoreWeave         1       5         5 ↑         4         5                          │
│  ...                                                                                  │
│                                                                                       │
│ PROTECTIONS · BREAK TRIGGERS · SCENARIOS · WATCHLIST            (collapsed sections)  │
│ HISTORY                                                          (timeline, §3.5)     │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

Sections, top to bottom:

- **Header**: name, client, domain, template lineage, current snapshot date, the last snapshot
  presented to the client, and how many gaps have opened since.
- **Thesis**: one sentence.
- **Positions**: stance, subject, and the assumptions each relies on, with gap counts. This is
  the client's money; it comes first.
- **Why: bets and assumptions**: each bet (plain English) with its assumptions. Each assumption
  row shows necessary / supporting, the statement, conviction, its **Watch state** (§5.2) and a
  sparkline with the threshold line when it has an expectation. Gaps are visible here, not only
  in Watch. Grouping by role, player, position, or state.
- **Risk map**: the sparse RiskLevel grid, holders × risk types. Arrows mark levels changed in
  the latest snapshot. Each cell opens its rationale and `driven_by` assumptions.
- **Protections**: each with its holder, risks, contract, and expiry date; expiring within 12
  months highlighted.
- **Break triggers**: condition, watched indicators with distance to trip, and the `leads_to`
  chain drawn as a short path.
- **Scenarios**: the shock matrix for this strategy.
- **Watchlist**: the indicator groups this strategy watches first (they drive Watch → Trends).
- **History**: §3.5.

Clicking any assumption opens the **assumption panel** (§6.3), the same one Watch uses.

### 3.2 Editing: drafts and snapshots

- `Edit` switches the page into draft mode. A bar across the top reads *Draft: 3 changes · Save
  snapshot · Discard*. Every edit becomes a change in the draft change set (ONTOLOGY §6.2), and
  changed items are marked in place with the old value shown struck through.
- **Save snapshot** asks for a note and a trigger (scheduled review · gap · manual) and links any
  reviews that led to it.
- Rewording an assumption asks: *Same meaning, or a different claim?* A different claim retires
  the old one and adds a new one, so old evidence judgments do not attach to it.
- Changing a threshold is allowed but marked *Expectation changed* in history, so moving the
  goalposts is visible.

### 3.3 Assumption editor

- **Statement** as structured text: plain words with pills for the player, indicator, and
  threshold (the test6 structured-text pattern). A plain-English line underneath, for the
  client summary.
- **Type**: assumption or prediction (prediction adds a resolve-by date).
- **Conviction**: low · medium · high.
- **Expectation builder**: pick an indicator (search, with a sparkline of its history), a rule
  (at least, at most, within band, trend), threshold and tolerance. A live preview draws the
  indicator's history against the proposed threshold, so the analyst sees immediately whether
  the assumption would already show a gap.
- **Links**: which bets it supports (necessary / supporting), which positions rely on it, which
  risk levels it drives.
- **Review by** date; defaults to the day after the client's next meeting.

### 3.4 AI suggestions in Decision

AI suggestions appear inline where they apply, with a dashed outline and an *AI · opinion* mark:
a suggested assumption under a bet, a suggested risk level in a grid cell. Each has *Adopt*
(creates an analyst record `based_on` it, as a draft change) and *Dismiss*. They never look like
analyst content and never enter the strategy without the analyst adopting them.

### 3.5 History

A timeline of change sets, with client meetings marked. Each entry: date, note, trigger, the
changes (grouped by type, ONTOLOGY §6.2), and the gaps and observations that led to it. Choose
any two points to see the diff. *Compare with template* shows where the strategy has moved away
from Devansh v1.

### 3.6 Client summary

A printable one-page view of the current snapshot in plain English: thesis, positions, the key
assumptions and what would change our mind, and what we will watch before the next meeting.
Presenting it records a Meeting with the snapshot shown. This is how the client gets on board
with the forward-looking direction, and how Watch later knows what the client agreed to.

### 3.7 New strategy

`+ New strategy`: choose client and domain, then start from a template (copies its beliefs,
keeping `forked_from`) or blank. Then set positions and thesis; the assumptions come from the
template and are trimmed or adjusted.

---

## 4. Library: the shared pool

Opened from the header; replaces the tabs and list while open, with *Back* to return. Every
name elsewhere in the app (a player, an obligation, an indicator, a source) links here.

- **Players**: roles over time, parent and aliases, obligations in and out, indicators, and
  *what each strategy believes about this player* side by side (assumptions and risk levels,
  with Watch states). This is where two strategies' disagreement is visible.
- **Obligations**: a graph around the selected obligation: `supported_by`, `backstops`,
  collateral, and the end payer. A **clock strip** puts technology cadence, contract term, debt
  maturity, accounting life, and lease term on one time axis, with the uncovered span between
  contract end and debt maturity shaded.
- **Concentration**: per end payer, the notional that ultimately depends on it, by role, and
  which of Priya's strategies have necessary assumptions on it.
- **Indicators**: series chart with every observation, provenance marks, and which strategies'
  expectations use it (each threshold drawable on the chart).
- **Sources**: each source with Priya's assessment and the AI's, side by side, and the
  observations it has supplied.
- **Evidence entry**: the manual intake form: one document, then its observations (excerpt,
  kind, indicator or event, value with qualifier, dates). After saving, it shows which
  strategies the new observations bear on.

---

## 5. Watch tab: see how it plays out

Purpose: follow reported facts, see trends, and notice gaps early enough to act.

### 5.1 Views

Four views, as a segmented control at the top of the main pane. All respect the client and
strategy selection and the as-of date.

| View | Question it answers | Default sort |
|---|---|---|
| **Gaps** (default) | where is reality moving away from what we assumed? | contradicting before weakening, necessary before supporting, high conviction first, newest first |
| **Trends** | what are the facts doing? | by watchlist group |
| **Evidence** | what came in, and what does it touch? | newest first |
| **Coming up** | what is about to matter? | by date |

### 5.2 What counts as a gap

A gap is any of these, for a belief in a selected strategy:

| Watch state | Meaning | Shown as |
|---|---|---|
| **Contradicting** | newest rule or analyst evidence is past the threshold by more than the tolerance | ▲ strong color, filled |
| **Weakening** | newest evidence is past the threshold within tolerance, or trending toward it | ▼ softer color |
| **Missed** | a prediction resolved against the analyst | ✕ |
| **Trigger near** | a break-trigger indicator within 10% of its trip threshold | ◆ |
| **Protection expiring** | a protection that shields a position ends within 90 days | ⏱ |
| Supported | newest evidence supports | ✓ quiet |
| Untested / stale | no evidence, or none since review-by | ○ grey, listed in Coming up |

States come from the newest evidence and the counts behind it are always one click away; the
tool does not average evidence into a state. AI stances never set a state on their own: an AI
stance that disagrees with the current state shows as a marker (*AI suggests: weakening*) until
the analyst adopts or dismisses it.

**Gap lifecycle:** *new* (opened since the analyst last reviewed it) → *reviewed* (the analyst
recorded a Review: no change, or a change) → *reopened* when new evidence moves it again. New
gaps are bold and counted in the tab badge.

### 5.3 Gaps view

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ Gaps · Harlow County Teachers' Pension · as of Mar 31 2027                            │
│ 4 open (2 new) · since last client meeting Jan 14 · next meeting Apr 15 (15 days)     │
│ Filter: [Contradicting ✓] [Weakening ✓] [Triggers ✓] [Expiring ✓] [Include AI ☐]     │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ ▲ NEW  OpenAI keeps raising outside capital on schedule                     high · nec│
│        AI infrastructure credit · Model labs                                          │
│        Round now expected Q3, was Q1  ─────────────╮                                  │
│        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╰──●  opened Feb 12 (7 wk before mtg)│
│        Affects: Lend · senior secured project debt; Risk: OpenAI funding 5             │
│        Evidence: 3 contradict · 1 weakens · 1 supports   AI: agrees                     │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ ▼      CoreWeave top-3 customer share ≤ 75%                                 med · nec │
│        74.1% (Q4) · threshold 75% · tolerance 5 pp        ▁▂▃▅▆ ⟶ ¦75                 │
│        ...                                                                            │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ ◆      Trigger: contract protection expires while debt remains                        │
│        DDTL 5.5: 22 months of debt past contract end · $1.1B outstanding               │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

Each gap row shows: state and lifecycle; the statement in plain English; conviction and
necessity; strategy and role; a **gap sparkline** (§6.2) or, for qualitative assumptions, a
stance strip of dated evidence marks; when it opened and how that compares with the next client
meeting; what it affects (positions, risk levels, and the next break trigger in its chain); and
evidence counts split by origin. Clicking a row opens the assumption panel (§6.3) on the right;
on narrow screens it replaces the list.

With *All clients*, rows also show the client, and one assumption shared by several strategies
(same `forked_from` origin) is grouped: *3 strategies depend on this*. This is the firm-level
concentration view.

### 5.4 Trends view

The watchlist groups of the selected strategy (or all strategies' watchlists merged) as a grid
of small charts. Each chart: the indicator series, every observation as a point with a
provenance mark, the reported predictions for it (company guidance) as a dashed line, and the
threshold of every assumption that uses it, labeled by strategy. Rising / falling / flat is
stated in words under each chart. A chart with a gap has the gap region shaded (§6.2), so trends
and gaps read together.

### 5.5 Evidence view

The newest observations, as an inbox. Each row: excerpt, source with Priya's assessment,
provenance mark (and *Synthetic* where applicable), valid time and published date, and **what
it touches**: for each strategy, the assumptions it bears on and the stance (rule, analyst, or
AI). Actions on each row: *Judge* (for qualitative assumptions it may bear on), *Assess source*,
*Open indicator*. Rows the analyst has not looked at are bold. Filters: player, role, source,
kind, origin, touches a gap.

### 5.6 Coming up view

A dated list (and a small calendar strip) of what will matter soon: client meetings,
predictions resolving, protections expiring, contracts ending before their debt, stale
assumptions, and scheduled reporting dates for watched players. Each item links to its record.
This is the view to open before a client meeting.

### 5.7 As of and replay

The header's as-of date filters everything to what was known by then (ONTOLOGY §6.3). In Watch,
a **replay strip** under the view control shows the demo period (Sep 2026 – Mar 2027) with client
meetings and snapshots marked; dragging it replays how gaps opened. A second control, *Compare
with snapshot*, evaluates today's evidence against an older snapshot of the strategy: "what
would we have seen if we had not changed our view in February?"

---

## 6. Shared components

### 6.1 Provenance mark

A small text label, never color alone:

| Mark | Example text |
|---|---|
| External | `EXT · fact · SEC 10-Q` · `EXT · forecast · OpenAI via FT` · `EXT · opinion · S&P` |
| Analyst | `ANALYST · Priya Raman` |
| AI | `AI · opinion · unreviewed` / `AI · adopted by Priya` |
| Derived | `DERIVED · ext facts + analyst` (opens inputs) |
| Synthetic | an extra `SYNTHETIC` tag on invented demo records |

Hover or focus shows the full provenance block. AI content also has a dashed outline wherever it
appears as a block.

### 6.2 Gap chart

The central visual. Used large in the assumption panel, small as a sparkline in lists.

- The indicator's observations over time, joined by a line; each point marked by stance
  (supports, weakens, contradicts) with shape as well as color.
- The expectation drawn as a line or band. The **tolerance zone** beyond it is lightly shaded,
  and the zone past the tolerance more strongly. Where the observed line enters those zones, the
  area between the line and the threshold is filled: that filled area is the gap.
- Reported predictions (company guidance) as a dashed line.
- For a prediction: the target marked at its resolve-by date, so the path toward it is visible.
- Vertical markers: client meetings, snapshots of this strategy, and today.
- Hover on a point: value with qualifier, source, provenance mark, excerpt.

For qualitative assumptions, the same time axis with dated evidence marks by stance and origin,
in place of a line.

### 6.3 Assumption panel

Opens from Decision, Watch, and Library. Top to bottom:

1. Statement, plain English, type, conviction, necessity, strategy; Watch state and lifecycle.
2. Gap chart.
3. **Evidence**: the evidence set, summary first (counts by stance and origin), expanded by
   indicator, newest first. Each item: stance, provenance mark, excerpt, source and assessments,
   dates. Rule, analyst, and AI evidence in separate groups.
4. **What relies on it**: positions, bets, risk levels (`driven_by`), and the break-trigger
   chain it leads into.
5. **History**: its changes across snapshots (conviction, threshold, wording).
6. **Actions**: *Mark reviewed: no change* (with note) · *Judge evidence* · *Change conviction* ·
   *Change a risk level* · *Retire* · *Open in Decision*. Changes go to the strategy's draft;
   the panel shows *Added to draft (2 changes)* with a link. Every action records a Review.
7. **AI**: any AI suggestion for this assumption, marked, with *Adopt* / *Dismiss*.

### 6.4 Evidence judging

A compact control on an observation–assumption pair: four stance buttons (supports, weakens,
contradicts, not relevant) and an optional note. One click records an analyst judged link. If
an AI stance exists, it is shown beside the buttons, labeled, and *Agree* creates the analyst
link `based_on` it.

---

## 7. Demo walkthrough (as of Mar 31 2027)

The synthetic storyline should let a viewer see, in a few minutes:

1. **Watch, All clients**: 7 open gaps across four strategies; 3 opened since the January
   meetings.
2. The top gap: *OpenAI keeps raising capital on schedule*, contradicting since Feb 12. Three
   strategies depend on it; the pension's senior secured lending position relies on it; next
   meeting in 15 days.
3. The gap chart shows the expected Q1 close, the reported slip, and a fictional-source report
   of a smaller round. The AI agrees; an analyst judgment from Feb 20 records Priya's view.
4. In the pension strategy's **History**, the Feb 20 snapshot raised OpenAI funding risk
   from 4 to 5 in response. The family office strategy has not changed yet: the same gap is new
   there.
5. **Coming up**: CoreWeave's DDTL 5.5 contracts end in 2028 with debt outstanding; the clock
   strip shows the uncovered span.
6. The **energy strategy** shares an interconnect-delay observation with the endowment's
   data-center strategy: one observation, two gaps, two clients.
7. **Replay** from Oct 2026 shows the gaps opening one at a time between meetings.
8. Some assumptions stay supported (Anthropic run-rate, Google Cloud backlog conversion), so the
   screen is not all alarm.

---

## 8. Vocabulary and guardrails

| Term in the UI | Meaning |
|---|---|
| Strategy | one client's investment thesis model in one domain |
| Thesis | the strategy's one-sentence view |
| Position | what the client is invested in or has decided |
| Assumption / prediction | a claim the strategy relies on; a prediction has a date |
| Conviction | low · medium · high |
| Evidence | observations bearing on an assumption, each with a stance |
| Gap | contradicting, weakening, missed, trigger near, or protection expiring |
| Reviewed | the analyst recorded a response to a gap |
| Snapshot | a saved version of the strategy |
| Presented | the snapshot shown to the client at a meeting |

Guardrails: no "sell", "buy", "wrong", "failed", "recommend", "approve", or "guaranteed" in the
UI; "contradicting" describes evidence against a claim, never the analyst; no trade
instructions; provenance on every value; every synthetic record labeled.

---

## 9. Open questions

1. **"Trigger near" and "expiring" windows.** 10% of the trip threshold and 90 days are
   placeholders. Per strategy, or fixed?
2. **Seen state.** Is *new* tracked per browser (simple), or recorded as analyst data (survives
   devices, adds records)? Recommendation: per browser for the demo.
3. **Client summary format.** A print view is enough for the demo; PDF export later?
4. **AI alerts.** Off by default (AI stances appear as markers, never as gaps). Should the
   analyst be able to switch them on per strategy?
5. **Mockups.** The next step could be clickable HTML mockups of the Watch gaps view and the
   assumption panel, using a slice of the demo data, before writing the build plan.
