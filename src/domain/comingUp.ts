import type { IsoDate, QueryRow } from '../model/generated.ts'
import { addDays } from './dates.ts'
import { groupBy } from './groupBy.ts'
import { type CommitmentView, isOpen } from './portfolio.ts'

// The dated things ahead of the as-of date (docs/PLAN.md §4.3, Coming up):
// windows and the capital that stops being avoidable, expected reports and
// the beliefs they will inform, revisit dates, scheduled reviews, and the
// end dates of our commitments and of the other parties' commitments ours
// depend on. Kinds are named as the time marks are.

export const COMING_UP_DAYS = 180

export type ComingKind = 'window' | 'report' | 'revisit' | 'decision' | 'end'

export type ComingItem = {
  date: IsoDate
  kind: ComingKind
  title: string
  /** Our commitments it concerns. */
  commitments: string[]
  /** For a window: the capital that stops being avoidable on the date. */
  amount?: number
  /** For a window: what exercising the option costs. */
  cost?: number
  /** For a window: other options on the same commitment closing the same day. */
  also: string[]
  /** For a report: the beliefs it will inform. */
  beliefs: string[]
  /** It concerns a flagged commitment, or, for a report, a flagged belief. */
  flagged: boolean
}

export type ComingUpInput = {
  asOf: IsoDate
  commitments: CommitmentView[]
  others: CommitmentView[]
  options: QueryRow<'options'>[]
  reviews: QueryRow<'reviews'>[]
  expected: QueryRow<'expected_evidence'>[]
  restsOn: QueryRow<'rests_on'>[]
  dependsOn: QueryRow<'depends_on'>[]
  flagged: ReadonlySet<string>
  flaggedBeliefs: ReadonlySet<string>
  days?: number
}

const ORDER: Record<ComingKind, number> = { window: 0, revisit: 1, decision: 2, report: 3, end: 4 }

export function buildComingUp(input: ComingUpInput): ComingItem[] {
  const { asOf } = input
  const end = addDays(asOf, input.days ?? COMING_UP_DAYS)
  const ahead = (d?: IsoDate): d is IsoDate => !!d && d > asOf && d <= end
  const active = input.commitments.filter((c) => c.status === 'active')
  const options = groupBy(input.options, (o) => o.commitment)
  const restsOn = groupBy(input.restsOn, (r) => r.belief)
  const dependsOn = groupBy(input.dependsOn, (d) => d.depends_on)
  type Item = Omit<ComingItem, 'flagged' | 'also'> & { also?: string[] }
  const items: Item[] = []

  for (const c of active) {
    const cap = c.capital
    const mine = (options.get(c.commitment) ?? []).filter((o) => ahead(o.closes_at) && isOpen(o))
    for (const date of new Set(mine.map((o) => o.closes_at!))) {
      const [first, ...rest] = mine.filter((o) => o.closes_at === date)
      const amount = cap && cap.until === date && cap.avoidable > 0 ? cap.avoidable : undefined
      items.push({ date, kind: 'window', title: first.title, also: rest.map((o) => o.title), commitments: [c.commitment], amount, cost: first.exercise_cost || undefined, beliefs: [] })
    }
    if (cap && ahead(cap.until) && cap.avoidable > 0 && !mine.some((o) => o.closes_at === cap.until)) {
      items.push({ date: cap.until, kind: 'window', title: 'Avoidable capital becomes committed', commitments: [c.commitment], amount: cap.avoidable, beliefs: [] })
    }
    if (ahead(c.revisit_at)) {
      // Commitments deferred together share one revisit date.
      const same = items.find((i) => i.kind === 'revisit' && i.date === c.revisit_at)
      if (same) same.commitments.push(c.commitment)
      else items.push({ date: c.revisit_at, kind: 'revisit', title: 'Revisit date', commitments: [c.commitment], beliefs: [] })
    }
    if (ahead(c.horizon_at)) items.push({ date: c.horizon_at, kind: 'end', title: 'Ends', commitments: [c.commitment], beliefs: [] })
  }

  const ours = new Set(active.map((c) => c.commitment))
  for (const o of input.others.filter((o) => ahead(o.horizon_at))) {
    const dependents = (dependsOn.get(o.commitment) ?? []).filter((d) => ours.has(d.commitment)).map((d) => d.commitment)
    if (dependents.length) items.push({ date: o.horizon_at!, kind: 'end', title: `${o.title} ends`, commitments: dependents, beliefs: [] })
  }

  const scheduled = new Map<string, Item>()
  for (const r of input.reviews.filter((r) => !r.held_at && ahead(r.scheduled_for) && ours.has(r.commitment))) {
    const item = scheduled.get(r.review) ?? { date: r.scheduled_for, kind: 'decision' as const, title: r.notes?.split('.')[0] ?? 'Review', commitments: [], beliefs: [] }
    item.commitments.push(r.commitment)
    scheduled.set(r.review, item)
  }
  items.push(...scheduled.values())

  const reports = new Map<string, Item>()
  for (const x of input.expected.filter((x) => ahead(x.expected?.slice(0, 10)))) {
    const date = x.expected!.slice(0, 10)
    const key = `${date}|${x.source}`
    const item = reports.get(key) ?? { date, kind: 'report' as const, title: x.source, commitments: [], beliefs: [] }
    item.beliefs.push(x.belief)
    for (const r of restsOn.get(x.belief) ?? []) if (ours.has(r.commitment) && !item.commitments.includes(r.commitment)) item.commitments.push(r.commitment)
    reports.set(key, item)
  }
  items.push(...reports.values())

  return items
    .map((i) => ({ ...i, also: i.also ?? [], flagged: i.kind === 'report' ? i.beliefs.some((b) => input.flaggedBeliefs.has(b)) : i.commitments.some((c) => input.flagged.has(c)) }))
    .sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.kind] - ORDER[b.kind] || a.title.localeCompare(b.title))
}
