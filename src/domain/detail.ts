import type { IsoDate, QueryRow } from '../model/generated.ts'
import { type Alternative, alternativesOf } from './alternatives.ts'
import { dayOf } from './dates.ts'
import { type LatestReading, tripwireStatus } from './materiality.ts'
import type { CommitmentView, Portfolio } from './portfolio.ts'
import type { BeliefEvaluation, Stance } from './watchState.ts'

// One commitment, everything the detail pane and its date spine show
// (docs/PLAN.md §4.2). Pure: rows in, plain data out.

export const DETAIL_QUERIES = [
  'origins',
  'decision_mandates',
  'alternatives',
  'chosen',
  'reasons',
  'tripwires',
  'depends_on',
  'options',
  'risks',
  'risk_drivers',
  'transitions',
  'reviews',
  'claims',
  'recorded_in',
] as const

type DetailQuery = (typeof DETAIL_QUERIES)[number]
export type DetailRows = { [N in DetailQuery]: QueryRow<N>[] } & {
  /** Reports expected after the as-of date (expected_evidence). */
  expected: QueryRow<'expected_evidence'>[]
  /** Approvals of the originating decision (approvals). */
  approvals: QueryRow<'approvals'>[]
}

export type Origin = QueryRow<'origins'> & {
  mandate?: QueryRow<'decision_mandates'>
  approvals: QueryRow<'approvals'>[]
  alternatives: Alternative[]
}

export type Dependency = { commitment: CommitmentView; kind?: string; direction: 'on' | 'by'; protectionGap: boolean }

export type TripwireView = QueryRow<'tripwires'> & { latest?: LatestReading; near: boolean; fired: boolean }

export type HistoryEntry = { at: string; kind: 'transition' | 'review'; title: string; detail?: string }

export type SpineEvent = {
  date: IsoDate
  kind: 'evidence' | 'decision' | 'window' | 'report' | 'revisit' | 'end'
  title: string
  detail?: string
  /** For evidence: how it moved the belief. */
  stance?: Stance
  belief?: string
  claim?: string
  amount?: number
  /** For a window: what exercising the option costs. */
  cost?: number
  synthetic?: boolean
}

export type CommitmentDetail = {
  view: CommitmentView
  recordedIn?: QueryRow<'recorded_in'>
  origin?: Origin
  tripwires: TripwireView[]
  dependencies: Dependency[]
  options: QueryRow<'options'>[]
  risks: (QueryRow<'risks'> & { drivers: string[] })[]
  history: HistoryEntry[]
  spine: { past: SpineEvent[]; coming: SpineEvent[] }
}

/** The decision that created a commitment; after a correction, the newest one. */
export const currentOrigin = (origins: QueryRow<'origins'>[], commitment: string) => origins.filter((o) => o.commitment === commitment).at(-1)

export function buildDetail(portfolio: Portfolio, rows: DetailRows, slug: string): CommitmentDetail | undefined {
  const all = [...portfolio.commitments, ...portfolio.others]
  const view = all.find((c) => c.commitment === slug)
  if (!view) return undefined
  const asOf = portfolio.asOf

  const originRow = currentOrigin(rows.origins, slug)
  const origin: Origin | undefined = originRow && {
    ...originRow,
    mandate: rows.decision_mandates.find((m) => m.decision === originRow.decision),
    approvals: rows.approvals,
    alternatives: alternativesOf(originRow.decision, rows),
  }

  const tripwires = rows.tripwires
    .filter((t) => t.commitment === slug)
    .map((t): TripwireView => ({ ...t, ...tripwireStatus(t, rows.claims) }))

  const find = (s: string) => all.find((c) => c.commitment === s)
  const dependencies: Dependency[] = [
    ...rows.depends_on
      .filter((d) => d.commitment === slug)
      .flatMap((d) => {
        const other = find(d.depends_on)
        return other ? [{ commitment: other, kind: d.kind, direction: 'on' as const, protectionGap: !!(other.horizon_at && view.horizon_at && other.horizon_at < view.horizon_at) }] : []
      }),
    ...rows.depends_on
      .filter((d) => d.depends_on === slug)
      .flatMap((d) => {
        const other = find(d.commitment)
        return other ? [{ commitment: other, kind: d.kind, direction: 'by' as const, protectionGap: false }] : []
      }),
  ]

  const options = rows.options.filter((o) => o.commitment === slug)
  const risks = rows.risks
    .filter((r) => r.commitment === slug)
    .map((r) => ({ ...r, drivers: rows.risk_drivers.filter((d) => d.risk === r.risk).map((d) => d.belief) }))
    .sort((a, b) => b.level - a.level)

  const history: HistoryEntry[] = [
    ...rows.transitions
      .filter((t) => t.commitment === slug)
      .map((t) => ({ at: t.at, kind: 'transition' as const, title: t.from_state === 'none' ? `Became ${t.to_state}` : `${t.from_state} → ${t.to_state}`, detail: t.reason })),
    ...rows.reviews
      .filter((r) => r.commitment === slug)
      .map((r) => ({ at: r.held_at ?? r.scheduled_for, kind: 'review' as const, title: `Reviewed: ${r.outcome}`, detail: r.notes })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  const recordedIn = rows.recorded_in.find((r) => r.commitment === slug)
  return { view, recordedIn, origin, tripwires, dependencies, options, risks, history, spine: spineOf(view, portfolio.beliefs, rows, origin, asOf) }
}

/** The dated things about one commitment, split at the as-of date (docs/PLAN.md §7.3). */
export function spineOf(view: CommitmentView, beliefs: Map<string, BeliefEvaluation>, rows: DetailRows, origin: Origin | undefined, asOf: IsoDate) {
  const events: SpineEvent[] = []
  const claim = (slug: string) => rows.claims.find((k) => k.claim === slug)

  // Evidence that moved a belief this commitment rests on. Readings count when
  // their stance changes away from supports; an owner's judgment against a
  // belief always counts. A claim that moved two beliefs appears once, on the
  // first date, with the stronger stance.
  const byClaim = new Map<string, SpineEvent>()
  for (const f of view.foundations) {
    const e = beliefs.get(f.belief)
    if (!e) continue
    let previous: Stance | undefined
    for (const s of e.steps) {
      if (s.stance !== 'supports' && (s.judged || s.stance !== previous)) {
        const k = claim(s.claim)
        const event: SpineEvent = { date: dayOf(s.at), kind: 'evidence', title: k?.statement ?? s.claim, detail: s.note, stance: s.stance, belief: f.belief, claim: s.claim, synthetic: k?.synthetic }
        const seen = byClaim.get(s.claim)
        if (!seen) byClaim.set(s.claim, event)
        else {
          if (event.date < seen.date) seen.date = event.date
          if (event.stance === 'contradicts') seen.stance = 'contradicts'
          seen.detail ??= event.detail
        }
      }
      previous = s.stance
    }
  }
  events.push(...byClaim.values())

  if (origin) events.push({ date: dayOf(origin.decided_at), kind: 'decision', title: origin.statement })
  for (const r of rows.reviews.filter((r) => r.commitment === view.commitment && r.held_at)) {
    events.push({ date: dayOf(r.held_at!), kind: 'decision', title: r.notes?.split('.')[0] ?? `Review: ${r.outcome}`, detail: `Outcome: ${r.outcome}` })
  }

  for (const o of rows.options.filter((o) => o.commitment === view.commitment && o.closes_at)) {
    const avoidable = view.capital && view.capital.until === o.closes_at ? view.capital.avoidable : undefined
    events.push({ date: o.closes_at!, kind: 'window', title: o.title, amount: avoidable, cost: o.exercise_cost || undefined })
  }

  const mine = new Set(view.foundations.map((f) => f.belief))
  const reports = new Map<string, SpineEvent>()
  for (const x of rows.expected.filter((x) => mine.has(x.belief) && x.expected)) {
    const date = x.expected!
    const key = `${date}|${x.source}`
    if (!reports.has(key)) reports.set(key, { date, kind: 'report', title: x.source, belief: x.belief })
  }
  events.push(...reports.values())

  if (view.revisit_at) events.push({ date: view.revisit_at, kind: 'revisit', title: 'Revisit date' })
  if (view.horizon_at) events.push({ date: view.horizon_at, kind: 'end', title: 'Ends' })

  const order: Record<SpineEvent['kind'], number> = { evidence: 0, decision: 1, window: 2, report: 3, revisit: 4, end: 5 }
  const sorted = events.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind])
  return {
    past: sorted.filter((e) => e.date <= asOf && e.kind !== 'window' && e.kind !== 'report' && e.kind !== 'end' && e.kind !== 'revisit'),
    coming: sorted.filter((e) => e.date > asOf),
  }
}
