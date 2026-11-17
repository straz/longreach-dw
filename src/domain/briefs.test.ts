import { describe, expect, it } from 'vitest'
import type { QueryRow } from '../model/generated.ts'
import { type BriefRows, type BriefSpec, buildBriefs, groupBriefs } from './briefs.ts'
import { dayOf } from './dates.ts'
import { buildWatch } from './materiality.ts'
import type { CommitmentView, Portfolio } from './portfolio.ts'
import { AS_OF, evaluation, view } from './test-fixtures.ts'

// A brief's state from the graph: the flag on its beliefs and the reviews held
// on its commitments (docs/PLAN.md §2.6).

const commitment = (slug: string, extra: Partial<CommitmentView> = {}) =>
  view(slug, { capital: { as_of: AS_OF, sunk: 0, unspent: 10, avoidable: 5, atRisk: 0, until: '2027-05-01', total: 10 }, ...extra })

/** A portfolio of c1 resting on b; b contradicting flags it, supported does not. */
function portfolio(flagged: boolean, c1: CommitmentView = commitment('c1')): Portfolio {
  const beliefs = new Map([['b', evaluation('b', flagged ? 'contradicting' : 'supported')]])
  const watch = buildWatch({
    asOf: AS_OF,
    commitments: [c1],
    others: [],
    beliefs,
    beliefRows: [{ belief: 'b', kind: 'assumption', statement: 'b', status: 'hypothesized' }],
    restsOn: [{ commitment: 'c1', belief: 'b', necessary: true }],
    tripwires: [],
    dependsOn: [],
    reviews: [],
    metricClaims: [],
    expected: [],
  })
  return { asOf: AS_OF, commitments: [c1], others: [], beliefs, headline: { authorized: 0, committed: 0, moved: [], movedCapital: 0, avoidable: 0 }, watch, comingUp: [] }
}

const spec = (slug: string, extra: Partial<BriefSpec> = {}): BriefSpec => ({ slug, title: slug, commitments: ['c1'], beliefs: ['b'], ...extra })

const none: BriefRows = { reviews: [], review_decisions: [], decision_approvals: [], decision_mandates: [], alternatives: [], chosen: [], reasons: [] }

/** A held review of a brief and the decision it recorded. */
function held(brief: string, id: string, at: string, outcome: QueryRow<'reviews'>['outcome'], decided_by = 'cfo'): Pick<BriefRows, 'reviews' | 'review_decisions'> {
  return {
    reviews: [{ review: `rev-${brief}-${id}`, commitment: 'c1', kind: 'reconsideration', scheduled_for: dayOf(at), held_at: at, outcome }],
    review_decisions: [{ review: `rev-${brief}-${id}`, decision: `dec-${id}`, statement: outcome, kind: 'other', decided_at: at, decided_by }],
  }
}

const rows = (...parts: Partial<BriefRows>[]): BriefRows =>
  parts.reduce<BriefRows>((all, p) => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, [...v, ...(p[k as keyof BriefRows] ?? [])]])) as BriefRows, none)

const states = (briefs: ReturnType<typeof buildBriefs>) => briefs.map((b) => [b.spec.slug, b.state])

describe('buildBriefs', () => {
  it('opens a brief on a flag, with the soonest window on its bundle', () => {
    const [b] = buildBriefs([spec('x')], portfolio(true), none)
    expect(b).toMatchObject({ state: 'open', unspent: 10, avoidable: 5, firstWindow: { date: '2027-05-01', title: 'Avoidable until', commitment: 'c1' } })
    expect(buildBriefs([spec('x')], portfolio(false), none)).toEqual([])
  })

  it('waits for approval when the mandate holder neither made the decision nor approved it', () => {
    const mandate: QueryRow<'decision_mandates'> = { decision: 'dec-1', mandate: 'm', power: 'approve', holder: 'board', holder_name: 'Board' }
    const decided = held('x', '1', '2027-03-10T10:00:00.000Z', 'affirm')
    expect(states(buildBriefs([spec('x')], portfolio(true), rows(decided, { decision_mandates: [mandate] })))).toEqual([['x', 'awaiting']])
    const approval: QueryRow<'decision_approvals'> = { decision: 'dec-1', party: 'board', at: '2027-03-12T10:00:00.000Z' }
    expect(states(buildBriefs([spec('x')], portfolio(true), rows(decided, { decision_mandates: [mandate], decision_approvals: [approval] })))).toEqual([['x', 'decided']])
    expect(states(buildBriefs([spec('x')], portfolio(true), rows(held('x', '1', '2027-03-10T10:00:00.000Z', 'affirm', 'board'), { decision_mandates: [mandate] })))).toEqual([['x', 'decided']])
  })

  it('defers until the revisit date, then opens again while the flag stands', () => {
    const deferral = rows(held('x', '1', '2027-03-10T10:00:00.000Z', 'defer'))
    const [b] = buildBriefs([spec('x')], portfolio(true, commitment('c1', { revisit_at: '2027-04-15' })), deferral)
    expect(b).toMatchObject({ state: 'deferred', revisit: '2027-04-15' })
    expect(states(buildBriefs([spec('x')], portfolio(true, commitment('c1', { revisit_at: AS_OF })), deferral))).toEqual([['x', 'open']])
    expect(buildBriefs([spec('x')], portfolio(false, commitment('c1', { revisit_at: AS_OF })), deferral)).toEqual([])
  })

  it('keeps a successor out of sight until its predecessor is due, then hands over', () => {
    const specs = [spec('x'), spec('y', { supersedes: 'x' })]
    const deferral = rows(held('x', '1', '2027-03-10T10:00:00.000Z', 'defer'))
    expect(states(buildBriefs(specs, portfolio(true, commitment('c1', { revisit_at: '2027-04-15' })), deferral))).toEqual([['x', 'deferred']])
    const due = buildBriefs(specs, portfolio(true, commitment('c1', { revisit_at: AS_OF })), deferral)
    expect(states(due)).toEqual([['x', 'decided'], ['y', 'open']])
    expect(due[0].supersededBy).toBe('y')
  })

  it('of two reviews held the same day, takes the later one', () => {
    // Listed later first, and named so their slugs sort the other way.
    const later = held('x', 'a', '2027-03-10T16:00:00.000Z', 'affirm')
    const earlier = held('x', 'b', '2027-03-10T09:00:00.000Z', 'defer')
    const [b] = buildBriefs([spec('x')], portfolio(true, commitment('c1', { revisit_at: '2027-04-15' })), rows(later, earlier))
    expect(b.decision).toMatchObject({ decision: 'dec-a', outcome: 'affirm', held_at: '2027-03-10T16:00:00.000Z' })
    expect(b.state).toBe('decided')
  })

  it('lists the decision\'s alternatives, chosen first, with their reasons', () => {
    const [b] = buildBriefs(
      [spec('x')],
      portfolio(true),
      rows(held('x', '1', '2027-03-10T10:00:00.000Z', 'affirm'), {
        alternatives: [
          { decision: 'dec-1', alternative: 'alt-x-continue-1', statement: 'Continue' },
          { decision: 'dec-1', alternative: 'alt-x-exit-1', statement: 'Exit' },
          { decision: 'dec-2', alternative: 'other', statement: 'Elsewhere' },
        ],
        chosen: [{ decision: 'dec-1', alternative: 'alt-x-exit-1' }],
        reasons: [{ alternative: 'alt-x-exit-1', reason: 'r1', statement: 'Saves capital', polarity: 'pro' }],
      }),
    )
    expect(b.decision?.path).toBe('exit')
    expect(b.decision?.alternatives.map((a) => [a.alternative, a.chosen, a.reasons.length])).toEqual([
      ['alt-x-exit-1', true, 1],
      ['alt-x-continue-1', false, 0],
    ])
  })
})

describe('groupBriefs', () => {
  it('puts open briefs by deadline, those with none last', () => {
    const open = (slug: string, date?: string) => ({ ...buildBriefs([spec(slug)], portfolio(true), none)[0], firstWindow: date ? { date, title: 't', commitment: 'c1' } : undefined })
    const [g] = groupBriefs([open('none'), open('late', '2027-06-01'), open('soon', '2027-04-01')])
    expect(g.briefs.map((b) => b.spec.slug)).toEqual(['soon', 'late', 'none'])
  })
})
