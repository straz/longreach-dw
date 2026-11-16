import type { IsoDate, QueryRow, ReviewOutcome, TransitionToState } from '../model/generated.ts'
import type { BeliefRow, WatchRow } from './materiality.ts'
import { isBriefReview, pathOfAlternative } from './slugs.ts'
import type { CommitmentView, Portfolio } from './portfolio.ts'

// Reconsideration briefs (docs/PLAN.md §2.6, §4.4). The paths are authored
// (content/<client>/briefs.yml); a brief's state comes from the graph: the
// Watch flags on its beliefs and the reviews held on its commitments.

export const PATH_KEYS = ['continue', 'change', 'delay', 'exit'] as const
export type PathKey = (typeof PATH_KEYS)[number]

export const PATH_LABEL: Record<PathKey, string> = { continue: 'Continue', change: 'Change', delay: 'Delay', exit: 'Exit' }

export type PathEffects = {
  /** Set on every commitment in the bundle. */
  revisit_at?: IsoDate
  /** New exposure readings at the decision date; fields left out keep their value. */
  readings?: { commitment: string; committed?: number; avoidable?: number; until?: IsoDate }[]
  /** Options the path uses. */
  exercises?: string[]
  transitions?: { commitment: string; to: TransitionToState }[]
}

export type AvailablePath = {
  available?: true
  means: string
  incremental: number
  incremental_note?: string
  avoided: number
  deferred: number
  uncertainty: string
  narrows?: { source: string; date: IsoDate }
  mandate: string
  deadline?: IsoDate
  reasons?: { statement: string; polarity: 'pro' | 'con' }[]
  effects?: PathEffects
}

export type PathSpec = AvailablePath | { available: false; why: string }

export const isAvailable = (p: PathSpec | undefined): p is AvailablePath => !!p && p.available !== false

export type BriefSpec = {
  slug: string
  title: string
  commitments: string[]
  related?: string[]
  beliefs: string[]
  /** The seeded review that decided it. */
  review?: string
  /** A brief this one opens after, once that one's revisit date arrives. */
  supersedes?: string
  paths?: Partial<Record<PathKey, PathSpec>>
}

/** Recorded reviews of a brief are named rev-<brief>-<timestamp>. */
export const reviewOf = (spec: BriefSpec, review: string) => review === spec.review || isBriefReview(spec.slug, review)

export type BriefState = 'open' | 'awaiting' | 'deferred' | 'decided'

export type BriefDecision = QueryRow<'review_decisions'> & {
  /** The path chosen, for a decision recorded from this brief's paths. */
  path?: PathKey
  outcome: ReviewOutcome
  held_at: string
  mandate?: QueryRow<'decision_mandates'>
  approved: boolean
  alternatives: (QueryRow<'alternatives'> & { chosen: boolean; reasons: QueryRow<'reasons'>[] })[]
}

export type Brief = {
  spec: BriefSpec
  state: BriefState
  bundle: CommitmentView[]
  related: CommitmentView[]
  /** The Watch rows for its beliefs. */
  rows: BeliefRow[]
  /** The newest decision on it, if any. */
  decision?: BriefDecision
  /** For a deferred brief: when it comes back. */
  revisit?: IsoDate
  /** The brief that replaced this one. */
  supersededBy?: string
  unspent: number
  avoidable: number
  /** The soonest window on the bundle. */
  firstWindow?: { date: IsoDate; title: string; commitment: string }
}

export type BriefRows = {
  reviews: QueryRow<'reviews'>[]
  review_decisions: QueryRow<'review_decisions'>[]
  decision_approvals: QueryRow<'decision_approvals'>[]
  decision_mandates: QueryRow<'decision_mandates'>[]
  alternatives: QueryRow<'alternatives'>[]
  chosen: QueryRow<'chosen'>[]
  reasons: QueryRow<'reasons'>[]
}

export const BRIEF_QUERIES = ['reviews', 'review_decisions', 'decision_approvals', 'decision_mandates', 'alternatives', 'chosen', 'reasons'] as const

/** The newest held review of a brief and the decision it resulted in. */
function decisionOf(spec: BriefSpec, rows: BriefRows): BriefDecision | undefined {
  const review = rows.reviews.filter((r) => r.held_at && reviewOf(spec, r.review)).sort((a, b) => a.held_at!.localeCompare(b.held_at!)).at(-1)
  const d = review && rows.review_decisions.find((x) => x.review === review.review)
  if (!review || !d) return undefined
  const mandate = rows.decision_mandates.find((m) => m.decision === d.decision)
  const chosen = rows.chosen.find((c) => c.decision === d.decision)?.alternative
  const path = chosen ? pathOfAlternative(spec.slug, chosen, PATH_KEYS) : undefined
  return {
    ...d,
    path,
    outcome: review.outcome,
    held_at: review.held_at!,
    mandate,
    // Approved when the mandate's holder made the decision, or approved it since.
    approved: !mandate || d.decided_by === mandate.holder || rows.decision_approvals.some((a) => a.decision === d.decision && a.party === mandate.holder),
    alternatives: rows.alternatives
      .filter((a) => a.decision === d.decision)
      .map((a) => ({ ...a, chosen: rows.chosen.some((c) => c.decision === d.decision && c.alternative === a.alternative), reasons: rows.reasons.filter((r) => r.alternative === a.alternative) }))
      .sort((a, b) => Number(b.chosen) - Number(a.chosen)),
  }
}

/** Every brief visible as of the portfolio's date. */
export function buildBriefs(specs: BriefSpec[], p: Portfolio, rows: BriefRows): Brief[] {
  const asOf = p.asOf
  const views = new Map(p.commitments.map((c) => [c.commitment, c]))
  const flagged = (spec: BriefSpec) => p.watch.flags.some((r) => r.kind === 'belief' && spec.beliefs.includes(r.belief) && r.commitments.some((c) => spec.commitments.includes(c)))

  const base = (spec: BriefSpec): Omit<Brief, 'state'> => {
    const bundle = spec.commitments.flatMap((c) => (views.has(c) ? [views.get(c)!] : []))
    const rowsFor = [...p.watch.flags, ...p.watch.moved, ...p.watch.holding].filter((r: WatchRow): r is BeliefRow => r.kind === 'belief' && spec.beliefs.includes(r.belief))
    const windows = bundle.filter((c) => c.capital?.until && c.capital.avoidable > 0 && c.capital.until >= asOf).sort((a, b) => a.capital!.until!.localeCompare(b.capital!.until!))
    const first = windows[0]
    return {
      spec,
      bundle,
      related: (spec.related ?? []).flatMap((c) => (views.has(c) ? [views.get(c)!] : [])),
      rows: rowsFor,
      decision: decisionOf(spec, rows),
      unspent: bundle.reduce((s, c) => s + (c.capital?.unspent ?? 0), 0),
      avoidable: bundle.reduce((s, c) => s + (c.capital?.avoidable ?? 0), 0),
      firstWindow: first && { date: first.capital!.until!, title: first.nextWindow && first.nextWindow.date === first.capital!.until ? first.nextWindow.title : 'Avoidable until', commitment: first.commitment },
    }
  }

  // A deferral's revisit date: the earliest revisit_at on the bundle after the review.
  const revisitOf = (b: Omit<Brief, 'state'>) => {
    const held = b.decision?.held_at.slice(0, 10)
    return b.bundle.map((c) => c.revisit_at).filter((d): d is IsoDate => !!d && !!held && d >= held).sort()[0]
  }

  const stateOf = (spec: BriefSpec, b: Omit<Brief, 'state'>): BriefState | 'hidden' | 'revisit-due' => {
    const d = b.decision
    if (!d) return flagged(spec) ? 'open' : 'hidden'
    if (!d.approved) return 'awaiting'
    if (d.outcome === 'defer') {
      const revisit = revisitOf(b)
      return revisit && revisit > asOf ? 'deferred' : 'revisit-due'
    }
    return 'decided'
  }

  // Each brief on its own first: what it holds, and the state its own decision gives it.
  const bases = new Map(specs.map((spec) => [spec.slug, base(spec)]))
  const own = new Map(specs.map((spec) => [spec.slug, stateOf(spec, bases.get(spec.slug)!)]))

  // A successor takes over from the brief it supersedes once that brief's
  // revisit date comes, or once the successor itself is decided.
  const successorOf = (slug: string) => {
    const s = specs.find((x) => x.supersedes === slug)
    return s && (own.get(slug) === 'revisit-due' || !!bases.get(s.slug)!.decision) ? s.slug : undefined
  }
  // A successor stays out of sight until it takes over (or its predecessor never showed).
  const waiting = (spec: BriefSpec) => !!spec.supersedes && !successorOf(spec.supersedes) && own.get(spec.supersedes) !== 'hidden'

  const out: Brief[] = []
  for (const spec of specs) {
    if (waiting(spec)) continue
    const b = { ...bases.get(spec.slug)!, revisit: revisitOf(bases.get(spec.slug)!) }
    const state = own.get(spec.slug)!
    const successor = successorOf(spec.slug)
    if (successor) out.push({ ...b, state: 'decided', supersededBy: successor })
    // A deferral whose date has come opens again, if its flag still stands.
    else if (state === 'revisit-due') {
      if (flagged(spec)) out.push({ ...b, state: 'open' })
    } else if (state !== 'hidden') out.push({ ...b, state })
  }
  return out
}

/** The capital left exposed after a path: unspent less what it avoids. */
export const remainingAfter = (b: Brief, path: AvailablePath) => b.unspent - path.avoided

/** Open briefs by nearest deadline, then awaiting approval, deferred by revisit date, decided newest first. */
export function groupBriefs(briefs: Brief[]): { key: BriefState; title: string; briefs: Brief[] }[] {
  const deadline = (b: Brief) => b.firstWindow?.date ?? '9'
  return [
    { key: 'open' as const, title: 'Open', briefs: briefs.filter((b) => b.state === 'open').sort((a, b) => deadline(a).localeCompare(deadline(b))) },
    { key: 'awaiting' as const, title: 'Awaiting approval', briefs: briefs.filter((b) => b.state === 'awaiting') },
    { key: 'deferred' as const, title: 'Deferred', briefs: briefs.filter((b) => b.state === 'deferred').sort((a, b) => (a.revisit ?? '').localeCompare(b.revisit ?? '')) },
    { key: 'decided' as const, title: 'Decided', briefs: briefs.filter((b) => b.state === 'decided').sort((a, b) => (b.decision?.held_at ?? '').localeCompare(a.decision?.held_at ?? '')) },
  ].filter((g) => g.briefs.length)
}
