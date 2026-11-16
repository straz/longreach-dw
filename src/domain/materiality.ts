import type { IsoDate, QueryRow } from '../model/generated.ts'
import { addDays } from './dates.ts'
import { groupBy } from './groupBy.ts'
import type { CommitmentView } from './portfolio.ts'
import { type BeliefEvaluation, type BeliefState, isMoved } from './watchState.ts'

// The materiality rule (docs/PLAN.md §2.5): which Watch rows become flags,
// and, for every row that moved without becoming one, which condition it
// misses. Weakening alone never flags; an agent's stance never counts.

/** A contradicted belief flags only if a window on it closes within this many days, or capital is avoidable. */
export const FLAG_WINDOW_DAYS = 180
/** Another party's commitment flags when it ends within this many days. */
export const DEPENDENCY_DAYS = 90
/** A tripwire is near when the newest reading is within this share of its line. */
export const TRIPWIRE_NEAR = 0.1

export type Condition = 'contradicting' | 'tripwire' | 'dependency' | 'revisit'
export type Lifecycle = 'new' | 'reviewed' | 'reopened'

/** Why a row that moved is not a flag. The screen words it; tests check the code. */
export type Quiet =
  | { code: 'nothing_rests' }
  | { code: 'not_watched' }
  | { code: 'not_necessary' }
  | { code: 'within_tolerance'; limit: number }
  | { code: 'weakening' }
  | { code: 'no_avoidable'; until?: IsoDate }
  | { code: 'not_fired' }

/** One of our active commitments, as a Watch row shows it. */
export type Rester = {
  commitment: string
  title: string
  necessary: boolean
  watched: boolean
  unspent: number
  avoidable: number
  /** The soonest of: when the avoidable part lapses, the next option window. */
  window?: { date: IsoDate; title: string }
}

export type ReviewNote = { review: string; commitments: string[]; held_at: string; outcome: string; notes?: string; revisit_at?: IsoDate; due: boolean }

type RowBase = {
  /** `kind:key`, unique across rows; the URL's `row`. */
  id: string
  /** The slug the row is about: a belief, tripwire, other party's commitment or review. */
  key: string
  flagged: boolean
  conditions: Condition[]
  quiet?: Quiet
  resters: Rester[]
  /** The commitments a flag concerns: what a brief would bundle. */
  commitments: string[]
  /** The soonest window among the commitments it concerns. */
  firstWindow?: { date: IsoDate; title: string; commitment: string }
  /** When the row started to matter. */
  opened?: IsoDate
  lifecycle?: Lifecycle
  review?: ReviewNote
}

export type Reading = { value: number; recorded_at: string }

export type BeliefRow = RowBase & { kind: 'belief'; belief: string; state: BeliefState; evaluation: BeliefEvaluation; next?: { date: IsoDate; source: string } }
export type TripwireRow = RowBase & { kind: 'tripwire'; tripwire: QueryRow<'tripwires'>; latest?: Reading; fired: boolean; near: boolean }
export type DependencyRow = RowBase & { kind: 'dependency'; other: CommitmentView; ends: IsoDate; beliefs: string[] }
export type RevisitRow = RowBase & { kind: 'revisit' }
export type WatchRow = BeliefRow | TripwireRow | DependencyRow | RevisitRow

export type Watch = {
  /** Rows that meet a condition, soonest window first. */
  flags: WatchRow[]
  /** Rows that moved and say why they are not flags. */
  moved: WatchRow[]
  /** Beliefs that hold or have no evidence yet. */
  holding: BeliefRow[]
  flaggedCommitments: string[]
}

export type WatchInput = {
  asOf: IsoDate
  /** Ours, with status; only active ones count. */
  commitments: CommitmentView[]
  /** Other parties' commitments ours depend on. */
  others: CommitmentView[]
  beliefs: Map<string, BeliefEvaluation>
  beliefRows: QueryRow<'beliefs'>[]
  restsOn: QueryRow<'rests_on'>[]
  tripwires: QueryRow<'tripwires'>[]
  dependsOn: QueryRow<'depends_on'>[]
  reviews: QueryRow<'reviews'>[]
  metricClaims: { metric?: string; value?: number; recorded_at: string; status?: string }[]
  expected: QueryRow<'expected_evidence'>[]
}

/** A tripwire against the newest reading of its metric. */
export function tripwireStatus(t: QueryRow<'tripwires'>, claims: WatchInput['metricClaims']): { latest?: Reading; fired: boolean; near: boolean } {
  const k = claims
    .filter((c) => c.metric === t.metric && c.value !== undefined && c.status !== 'rejected')
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .at(-1)
  if (!k || t.threshold === undefined) return { fired: false, near: false }
  const v = k.value!
  const fired = t.comparator === 'ge' ? v >= t.threshold : t.comparator === 'gt' ? v > t.threshold : t.comparator === 'le' ? v <= t.threshold : t.comparator === 'lt' ? v < t.threshold : false
  const near = !fired && Math.abs(v - t.threshold) <= Math.abs(t.threshold) * TRIPWIRE_NEAR
  return { latest: { value: v, recorded_at: k.recorded_at }, fired, near }
}

const soonest = <T extends { date: IsoDate }>(xs: (T | undefined)[]) =>
  xs.filter((x): x is T => !!x).sort((a, b) => a.date.localeCompare(b.date))[0]

/** What every row builder shares: the input, our active commitments, the held reviews, and the helpers on them. */
type Context = ReturnType<typeof contextOf>

function contextOf(input: WatchInput) {
  const { asOf } = input
  const horizon = addDays(asOf, FLAG_WINDOW_DAYS)
  const active = new Map(input.commitments.filter((c) => c.status === 'active').map((c) => [c.commitment, c]))

  const rester = (c: CommitmentView, necessary: boolean, edgeWatched?: boolean): Rester => {
    const cap = c.capital
    const avoidableUntil = cap && cap.avoidable > 0 && cap.until && cap.until >= asOf ? { date: cap.until, title: c.nextWindow?.date === cap.until ? c.nextWindow.title : 'Avoidable until' } : undefined
    return {
      commitment: c.commitment,
      title: c.title,
      necessary,
      watched: c.watched !== false && edgeWatched !== false,
      unspent: cap?.unspent ?? 0,
      avoidable: cap?.avoidable ?? 0,
      window: soonest([avoidableUntil, c.nextWindow && { date: c.nextWindow.date, title: c.nextWindow.title }]),
    }
  }

  // Held reviews, one note per review covering every commitment it was held
  // on, and whether a deferral's revisit date has arrived.
  const reviews: ReviewNote[] = []
  for (const r of input.reviews.filter((r) => r.held_at && r.held_at.slice(0, 10) <= asOf)) {
    const revisit = r.outcome === 'defer' ? active.get(r.commitment)?.revisit_at : undefined
    const due = !!revisit && revisit <= asOf && revisit >= r.held_at!.slice(0, 10)
    const same = reviews.find((a) => a.review === r.review)
    if (same) {
      same.commitments.push(r.commitment)
      same.due ||= due
      same.revisit_at ??= revisit
    } else reviews.push({ review: r.review, commitments: [r.commitment], held_at: r.held_at!, outcome: r.outcome, notes: r.notes, revisit_at: revisit, due })
  }

  return {
    input,
    asOf,
    horizon,
    active,
    reviews,
    rester,
    /** Capital can still be avoided, or a window closes within the flag horizon. */
    material: (r: Rester) => r.avoidable > 0 || (!!r.window && r.window.date <= horizon),
    firstWindowOf: (rs: Rester[]) => {
      const r = rs.filter((x) => x.window).sort((a, b) => a.window!.date.localeCompare(b.window!.date))[0]
      return r && { ...r.window!, commitment: r.commitment }
    },
    /** The newest review on any of these commitments held on or after `opened`, and whether it has reopened. */
    lifecycleOf: (commitments: string[], opened: IsoDate | undefined, lastEvidence?: string): Pick<RowBase, 'lifecycle' | 'review'> => {
      const review = reviews
        .filter((n) => n.commitments.some((c) => commitments.includes(c)) && (!opened || n.held_at.slice(0, 10) >= opened))
        .sort((a, b) => a.held_at.localeCompare(b.held_at))
        .at(-1)
      if (!review) return { lifecycle: 'new' }
      return { lifecycle: review.due || (!!lastEvidence && lastEvidence > review.held_at) ? 'reopened' : 'reviewed', review }
    },
  }
}

const base = (kind: WatchRow['kind'], key: string, resters: Rester[]) => ({ id: `${kind}:${key}`, key, resters, commitments: [] as string[], flagged: false, conditions: [] as Condition[] })

function beliefRows(cx: Context): BeliefRow[] {
  const { input } = cx
  const restsOn = groupBy(input.restsOn, (r) => r.belief)
  return input.beliefRows.flatMap((b) => {
    const evaluation = input.beliefs.get(b.belief)
    if (!evaluation) return []
    const resters = (restsOn.get(b.belief) ?? []).flatMap((r) => {
      const c = cx.active.get(r.commitment)
      return c ? [cx.rester(c, !!r.necessary, r.watched)] : []
    })
    const watchedNecessary = resters.filter((r) => r.watched && r.necessary)
    const row: BeliefRow = {
      kind: 'belief',
      ...base('belief', b.belief, resters),
      belief: b.belief,
      state: evaluation.state,
      evaluation,
      next: soonest(input.expected.filter((x) => x.belief === b.belief && x.expected).map((x) => ({ date: x.expected!.slice(0, 10), source: x.source }))),
    }

    // Condition 1: contradicted, necessary, and something still at stake.
    if (evaluation.state === 'contradicting') {
      const hit = watchedNecessary.filter(cx.material)
      if (hit.length) {
        row.conditions.push('contradicting')
        row.commitments = hit.map((r) => r.commitment)
      }
    }
    // Condition 4: a deferred review on a commitment resting on it has reached its revisit date.
    const revisited = cx.reviews.filter((n) => n.due).flatMap((n) => n.commitments.filter((c) => watchedNecessary.some((r) => r.commitment === c)))
    if (revisited.length && isMoved(evaluation.state)) {
      row.conditions.push('revisit')
      row.commitments = [...new Set([...row.commitments, ...revisited])]
    }

    if (row.conditions.length) {
      row.flagged = true
      row.opened = evaluation.movedSince
      const lastEvidence = [...evaluation.readings.map((r) => r.recorded_at), ...evaluation.judgments.filter((j) => !j.agent).map((j) => j.at)].sort().at(-1)
      Object.assign(row, cx.lifecycleOf(row.commitments, row.opened, lastEvidence))
      row.firstWindow = cx.firstWindowOf(resters.filter((r) => row.commitments.includes(r.commitment)))
    } else if (isMoved(evaluation.state)) {
      row.quiet = quietOf(b, evaluation, resters, cx.horizon)
      row.firstWindow = cx.firstWindowOf(watchedNecessary.length ? watchedNecessary : resters)
    }
    return [row]
  })
}

/** Condition 2, one row per tripwire across the commitments it guards; near ones are listed, not flagged. */
function tripwireRows(cx: Context): TripwireRow[] {
  const { input } = cx
  return [...groupBy(input.tripwires, (t) => t.tripwire)].flatMap(([slug, all]) => {
    const guards = all.filter((t) => cx.active.has(t.commitment))
    if (!guards.length) return []
    const status = tripwireStatus(guards[0], input.metricClaims)
    if (!status.fired && !status.near) return []
    const resters = guards.map((t) => cx.rester(cx.active.get(t.commitment)!, false))
    const watched = resters.filter((r) => r.watched)
    const row: TripwireRow = { kind: 'tripwire', ...base('tripwire', slug, resters), tripwire: guards[0], ...status, firstWindow: cx.firstWindowOf(resters) }
    if (status.fired && watched.length) {
      row.flagged = true
      row.conditions.push('tripwire')
      row.commitments = watched.map((r) => r.commitment)
      row.opened = status.latest!.recorded_at.slice(0, 10)
      Object.assign(row, cx.lifecycleOf(row.commitments, row.opened))
    } else row.quiet = watched.length ? { code: 'not_fired' } : { code: 'not_watched' }
    return [row]
  })
}

/** Condition 3: another party's commitment ends soon while a necessary belief of a dependent commitment has moved. */
function dependencyRows(cx: Context): DependencyRow[] {
  const { input, asOf } = cx
  const dependsOn = groupBy(input.dependsOn, (d) => d.depends_on)
  return input.others.flatMap((other) => {
    const ends = other.horizon_at
    if (!ends || ends < asOf || ends > addDays(asOf, DEPENDENCY_DAYS)) return []
    const dependents = (dependsOn.get(other.commitment) ?? []).flatMap((d) => {
      const c = d.watched !== false ? cx.active.get(d.commitment) : undefined
      return c && c.watched !== false ? [c] : []
    })
    const movedOf = (c: CommitmentView) => c.foundations.filter((f) => f.necessary && isMoved(f.state)).map((f) => f.belief)
    const moving = dependents.filter((c) => movedOf(c).length)
    if (!moving.length) return []
    const beliefs = [...new Set(moving.flatMap(movedOf))]
    const resters = moving.map((c) => cx.rester(c, true))
    const opened = [addDays(ends, -DEPENDENCY_DAYS), ...beliefs.map((b) => input.beliefs.get(b)?.movedSince ?? asOf)].sort().at(-1)
    const commitments = moving.map((c) => c.commitment)
    const row: DependencyRow = {
      kind: 'dependency',
      ...base('dependency', other.commitment, resters),
      other,
      ends,
      beliefs,
      commitments,
      flagged: true,
      conditions: ['dependency'],
      firstWindow: cx.firstWindowOf(resters),
      opened,
      ...cx.lifecycleOf(commitments, opened),
    }
    return [row]
  })
}

/** Condition 4 on its own: a due revisit that no flagged belief already carries. */
function revisitRows(cx: Context, flagged: WatchRow[]): RevisitRow[] {
  return cx.reviews
    .filter((n) => n.due && !flagged.some((r) => r.conditions.includes('revisit') && n.commitments.some((c) => r.commitments.includes(c))))
    .map((n) => {
      const resters = n.commitments.flatMap((c) => (cx.active.has(c) ? [cx.rester(cx.active.get(c)!, true)] : []))
      return { kind: 'revisit', ...base('revisit', n.review, resters), commitments: n.commitments, flagged: true, conditions: ['revisit'], firstWindow: cx.firstWindowOf(resters), opened: n.revisit_at, lifecycle: 'reopened', review: n }
    })
}

export function buildWatch(input: WatchInput): Watch {
  const cx = contextOf(input)
  const rows: WatchRow[] = [...beliefRows(cx), ...tripwireRows(cx), ...dependencyRows(cx)]
  rows.push(...revisitRows(cx, rows.filter((r) => r.flagged)))

  const byWindow = (a: WatchRow, b: WatchRow) => (a.firstWindow?.date ?? '9').localeCompare(b.firstWindow?.date ?? '9')
  const severity = (r: WatchRow) => (r.kind === 'belief' ? (r.state === 'contradicting' ? 0 : 1) : 2)
  const flags = rows.filter((r) => r.flagged).sort(byWindow)
  return {
    flags,
    moved: rows.filter((r) => !r.flagged && r.quiet).sort((a, b) => severity(a) - severity(b) || byWindow(a, b)),
    holding: rows.filter((r): r is BeliefRow => r.kind === 'belief' && !r.flagged && !r.quiet),
    flaggedCommitments: [...new Set(flags.flatMap((r) => r.commitments))],
  }
}

/** Rows that concern a commitment: it rests on the belief, is guarded by the tripwire, or the flag names it. */
export const inScope = (r: WatchRow, scope?: string) => !scope || r.commitments.includes(scope) || r.resters.some((x) => x.commitment === scope)

/** A row by id, wherever it is listed. */
export const findRow = (w: Watch, id: string): WatchRow | undefined => [...w.flags, ...w.moved, ...w.holding].find((r) => r.id === id)

function quietOf(b: QueryRow<'beliefs'>, e: BeliefEvaluation, resters: Rester[], horizon: IsoDate): Quiet {
  if (!resters.length) return { code: 'nothing_rests' }
  const watched = resters.filter((r) => r.watched)
  if (!watched.length) return { code: 'not_watched' }
  const necessary = watched.filter((r) => r.necessary)
  if (!necessary.length) return { code: 'not_necessary' }
  if (e.state === 'weakening') return e.basis === 'rule' && b.hard_threshold !== undefined && !b.trend ? { code: 'within_tolerance', limit: b.hard_threshold } : { code: 'weakening' }
  const later = necessary.map((r) => r.window?.date).filter((d): d is IsoDate => !!d && d > horizon).sort()[0]
  return { code: 'no_avoidable', until: later }
}
