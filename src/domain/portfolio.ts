import type { IsoDate, QueryRow } from '../model/generated.ts'
import { type Capital, type Headline, capitalOf, headline } from './capital.ts'
import { groupBy } from './groupBy.ts'
import { type ComingItem, buildComingUp } from './comingUp.ts'
import { type FieldState, fieldStates, proposedStatus } from './fields.ts'
import { type Watch, buildWatch } from './materiality.ts'
import { type BeliefEvaluation, type BeliefState, evaluateBelief, isMoved, judgmentsFrom } from './watchState.ts'

// The portfolio as of a date: the stored queries a screen needs, joined
// through the domain rules. Pure: the caller fetches PORTFOLIO_QUERIES (the
// app through TanStack Query, the content checker through the mock) and
// passes the rows in.

export const PORTFOLIO_QUERIES = [
  'commitments',
  'bound_parties',
  'owners',
  'counterparties',
  'exposures',
  'beliefs',
  'rests_on',
  'metric_claims',
  'supports_links',
  'contradicts_links',
  'informs_links',
  'actors',
  'entails',
  'options',
  'grounding_claims',
  'tripwires',
  'depends_on',
  'reviews',
] as const

type PortfolioQuery = (typeof PORTFOLIO_QUERIES)[number]
export type PortfolioRows = { [N in PortfolioQuery]: QueryRow<N>[] } & {
  /** Reports expected after the as-of date: expected_evidence with `after` set to it (expectedAfter). */
  expected: QueryRow<'expected_evidence'>[]
}

/** The `after` parameter of expected_evidence for an as-of date. */
export const expectedAfter = (asOf: IsoDate) => `${asOf}T23:59:59Z`

/** The demo's four statuses, projected from ty-core fields (docs/PLAN.md §2.2). */
export type Status = 'active' | 'unverified' | 'incomplete' | 'past'

export type Foundation = { belief: string; necessary: boolean; state: BeliefState }

export type CommitmentView = QueryRow<'commitments'> & {
  status: Status
  owner?: { party: string; name: string }
  counterparty?: string
  capital?: Capital
  foundations: Foundation[]
  /** A necessary belief is contradicting and unspent capital remains. */
  moved: boolean
  /** The worst state among its beliefs, for the list's marker. */
  worst?: BeliefState
  /** The soonest open option or window. */
  nextWindow?: { date: IsoDate; title: string; option: string }
  /** For a proposed commitment: where each field stands. */
  fields?: FieldState[]
}

export type Portfolio = {
  asOf: IsoDate
  /** Ours: bound by the organization. */
  commitments: CommitmentView[]
  /** Other parties' commitments that ours depend on. */
  others: CommitmentView[]
  beliefs: Map<string, BeliefEvaluation>
  headline: Headline
  program?: CommitmentView
  /** Flags and the rows that moved without becoming one (docs/PLAN.md §2.5). */
  watch: Watch
  /** Dated things in the next 180 days. */
  comingUp: ComingItem[]
}

/** An option still to be decided: not exercised, declined or expired. */
export const isOpen = (o: QueryRow<'options'>) => o.status !== 'exercised' && o.status !== 'declined' && o.status !== 'expired'

const PAST = new Set(['fulfilled', 'released', 'revoked', 'expired', 'superseded', 'breached'])

export function statusOf(c: QueryRow<'commitments'>, fields: FieldState[]): Status {
  if (PAST.has(c.state)) return 'past'
  if (c.state === 'active' || c.state === 'suspended') return 'active'
  return proposedStatus(fields)
}

const severity: Record<BeliefState, number> = { contradicting: 0, weakening: 1, untested: 2, on_track: 3, supported: 4 }

/** `org` is the party bound by our commitments: the signed-in client's. */
export function buildPortfolio(rows: PortfolioRows, asOf: IsoDate, org: string): Portfolio {
  const agents = new Set(rows.actors.filter((a) => a.kind === 'agent').map((a) => a.actor))
  const judgments = judgmentsFrom({ supports: rows.supports_links, contradicts: rows.contradicts_links, informs: rows.informs_links }, agents)
  const beliefs = new Map(rows.beliefs.map((b) => [b.belief, evaluateBelief(b, rows.metric_claims, judgments)]))

  const boundBy = new Map(rows.bound_parties.map((b) => [b.commitment, b.party]))
  // Each row set indexed once by commitment, so every view looks its rows up.
  const by = <T extends { commitment: string }>(xs: T[]) => {
    const g = groupBy(xs, (x) => x.commitment)
    return (c: string) => g.get(c) ?? []
  }
  const restsOn = by(rows.rests_on)
  const exposures = by(rows.exposures)
  const options = by(rows.options)
  const owners = by(rows.owners)
  const counterparties = by(rows.counterparties)
  const grounding = by(rows.grounding_claims)
  const capitals = new Map<string, Capital>()

  const views = rows.commitments.map((c): CommitmentView => {
    const foundations = restsOn(c.commitment)
      .map((r) => ({ belief: r.belief, necessary: !!r.necessary, state: beliefs.get(r.belief)?.state ?? 'untested' }))
      .sort((a, b) => Number(b.necessary) - Number(a.necessary) || severity[a.state] - severity[b.state])
    const capital = capitalOf(c.commitment, exposures(c.commitment))
    if (capital) capitals.set(c.commitment, capital)
    const fields = c.state === 'proposed' ? fieldStates(c.commitment, grounding(c.commitment)) : undefined
    const status = statusOf(c, fields ?? [])
    const moved = status === 'active' && foundations.some((f) => f.necessary && f.state === 'contradicting') && (capital?.unspent ?? 0) > 0
    const worst = foundations.filter((f) => isMoved(f.state)).sort((a, b) => severity[a.state] - severity[b.state])[0]?.state
    const next = options(c.commitment)
      .filter((o) => o.closes_at && o.closes_at >= asOf && isOpen(o))
      .sort((a, b) => a.closes_at!.localeCompare(b.closes_at!))[0]
    const owner = owners(c.commitment)[0]
    return {
      ...c,
      status,
      owner: owner && { party: owner.party, name: owner.name },
      counterparty: counterparties(c.commitment).find((p) => p.role === 'counterparty')?.name,
      capital,
      foundations,
      moved,
      worst,
      nextWindow: next && { date: next.closes_at!, title: next.title, option: next.option },
      fields,
    }
  })

  const commitments = views.filter((v) => boundBy.get(v.commitment) === org)
  const program = commitments.find((c) => c.scale === 'program')
  const entailed = program ? rows.entails.filter((e) => e.parent === program.commitment).map((e) => e.child) : []
  const others = views.filter((v) => boundBy.get(v.commitment) !== org)
  const watch = buildWatch({
    asOf,
    commitments,
    others,
    beliefs,
    beliefRows: rows.beliefs,
    restsOn: rows.rests_on,
    tripwires: rows.tripwires,
    dependsOn: rows.depends_on,
    reviews: rows.reviews,
    metricClaims: rows.metric_claims,
    expected: rows.expected,
  })
  return {
    asOf,
    commitments,
    others,
    beliefs,
    program,
    headline: headline({
      program: program?.commitment ?? '',
      live: commitments.filter((c) => c.status === 'active').map((c) => c.commitment),
      entailed,
      restsOn: rows.rests_on,
      beliefs,
      capital: capitals,
    }),
    watch,
    comingUp: buildComingUp({
      asOf,
      commitments,
      others,
      options: rows.options,
      reviews: rows.reviews,
      expected: rows.expected,
      restsOn: rows.rests_on,
      dependsOn: rows.depends_on,
      flagged: new Set(watch.flaggedCommitments),
      flaggedBeliefs: new Set(watch.flags.flatMap((r) => (r.kind === 'belief' ? [r.belief] : []))),
    }),
  }
}
