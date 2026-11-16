import { describe, expect, it } from 'vitest'
import type { QueryRow } from '../model/generated.ts'
import { type WatchInput, buildWatch } from './materiality.ts'
import type { CommitmentView } from './portfolio.ts'
import { AS_OF, evaluation, view } from './test-fixtures.ts'

// One test per condition of the materiality rule and per reason a moved row
// is not a flag (docs/PLAN.md §2.5).

const belief = (slug: string, extra: Partial<QueryRow<'beliefs'>> = {}): QueryRow<'beliefs'> => ({ belief: slug, kind: 'assumption', statement: slug, status: 'hypothesized', ...extra })

const commitment = (slug: string, extra: Partial<CommitmentView> = {}): CommitmentView =>
  view(slug, { capital: { as_of: AS_OF, sunk: 0, unspent: 10, avoidable: 5, atRisk: 0, until: '2027-05-01', total: 10 }, ...extra })

function input(over: Partial<WatchInput> = {}): WatchInput {
  return {
    asOf: AS_OF,
    commitments: [commitment('c1')],
    others: [],
    beliefs: new Map([['b', evaluation('b', 'contradicting')]]),
    beliefRows: [belief('b')],
    restsOn: [{ commitment: 'c1', belief: 'b', necessary: true }],
    tripwires: [],
    dependsOn: [],
    reviews: [],
    metricClaims: [],
    expected: [],
    ...over,
  }
}

const quietCode = (w: ReturnType<typeof buildWatch>) => (w.moved[0]?.quiet?.code)

describe('condition 1: a contradicted necessary belief with something still at stake', () => {
  it('flags when capital is avoidable', () => {
    const w = buildWatch(input())
    expect(w.flags.map((r) => r.id)).toEqual(['belief:b'])
    expect(w.flags[0].conditions).toEqual(['contradicting'])
    expect(w.flaggedCommitments).toEqual(['c1'])
  })

  it('flags with nothing avoidable when a window closes within 180 days, and not at 181', () => {
    const at = (date: string) =>
      buildWatch(input({ commitments: [commitment('c1', { capital: { as_of: AS_OF, sunk: 0, unspent: 10, avoidable: 0, atRisk: 0, total: 10 }, nextWindow: { date, title: 'Renewal', option: 'o' } })] }))
    expect(at('2027-09-27').flags).toHaveLength(1) // 180 days
    const late = at('2027-09-28')
    expect(late.flags).toHaveLength(0)
    expect(late.moved[0].quiet).toEqual({ code: 'no_avoidable', until: '2027-09-28' })
  })

  it('ignores a commitment that is not active', () => {
    const w = buildWatch(input({ commitments: [commitment('c1', { status: 'unverified' })] }))
    expect(w.flags).toHaveLength(0)
    expect(quietCode(w)).toBe('nothing_rests')
  })

  it('never flags on weakening alone', () => {
    const w = buildWatch(input({ beliefs: new Map([['b', evaluation('b', 'weakening')]]) }))
    expect(w.flags).toHaveLength(0)
    expect(quietCode(w)).toBe('weakening')
  })

  it('never flags on an agent stance', () => {
    const agentOnly = evaluation('b', 'supported', { agentDiffers: { claim: 'k', belief: 'b', stance: 'contradicts', by: 'bot', at: '2027-03-01', agent: true } })
    const w = buildWatch(input({ beliefs: new Map([['b', agentOnly]]) }))
    expect(w.flags).toHaveLength(0)
    expect(w.holding.map((r) => r.belief)).toEqual(['b'])
  })
})

describe('reasons a moved row is not a flag', () => {
  it('within tolerance: a rule belief between its line and its limit', () => {
    const b = belief('b', { metric: 'm', comparator: 'ge', threshold: 85, hard_threshold: 80 })
    const w = buildWatch(input({ beliefRows: [b], beliefs: new Map([['b', evaluation('b', 'weakening', { basis: 'rule' })]]) }))
    expect(w.moved[0].quiet).toEqual({ code: 'within_tolerance', limit: 80 })
  })

  it('supporting, not necessary', () => {
    expect(quietCode(buildWatch(input({ restsOn: [{ commitment: 'c1', belief: 'b', necessary: false }] })))).toBe('not_necessary')
  })

  it('nothing of ours rests on it', () => {
    expect(quietCode(buildWatch(input({ restsOn: [] })))).toBe('nothing_rests')
  })

  it('not watched, on the commitment or on the assumption', () => {
    expect(quietCode(buildWatch(input({ commitments: [commitment('c1', { watched: false })] })))).toBe('not_watched')
    expect(quietCode(buildWatch(input({ restsOn: [{ commitment: 'c1', belief: 'b', necessary: true, watched: false }] })))).toBe('not_watched')
  })

  it('no avoidable capital and no window in reach', () => {
    const w = buildWatch(input({ commitments: [commitment('c1', { capital: { as_of: AS_OF, sunk: 10, unspent: 0, avoidable: 0, atRisk: 0, total: 10 } })] }))
    expect(w.moved[0].quiet).toEqual({ code: 'no_avoidable', until: undefined })
  })
})

const tripwire: QueryRow<'tripwires'> = { commitment: 'c1', tripwire: 't', kind: 'review', condition: 'yield at 12%', metric: 'y', comparator: 'ge', threshold: 12, declared_at: '2026-09-28T12:00:00Z' }
const reading = (value: number, at = '2027-03-01') => ({ metric: 'y', value, recorded_at: `${at}T12:00:00Z`, status: 'verified' })

describe('condition 2: a tripwire fired', () => {
  const quiet = { beliefs: new Map([['b', evaluation('b', 'supported')]]), tripwires: [tripwire] }

  it('flags at the line', () => {
    const w = buildWatch(input({ ...quiet, metricClaims: [reading(12)] }))
    expect(w.flags.map((r) => r.id)).toEqual(['tripwire:t'])
    expect(w.flags[0]).toMatchObject({ conditions: ['tripwire'], opened: '2027-03-01', lifecycle: 'new' })
  })

  it('lists a near tripwire as moved, not fired', () => {
    const w = buildWatch(input({ ...quiet, metricClaims: [reading(12.5, '2027-01-01'), reading(11.9)] }))
    expect(w.flags).toHaveLength(0)
    expect(w.moved.map((r) => [r.id, r.quiet?.code])).toEqual([['tripwire:t', 'not_fired']])
  })

  it('leaves a far tripwire out', () => {
    expect(buildWatch(input({ ...quiet, metricClaims: [reading(9)] })).moved).toHaveLength(0)
  })
})

describe('condition 3: a dependency ends soon under a moved belief', () => {
  const other = commitment('p1', { horizon_at: '2027-06-29' }) // 90 days
  const base = { beliefs: new Map([['b', evaluation('b', 'weakening')]]), dependsOn: [{ commitment: 'c1', depends_on: 'p1', kind: 'requires' as const }] }
  const moving = commitment('c1', { foundations: [{ belief: 'b', necessary: true, state: 'weakening' }] })

  it('flags within 90 days while a necessary belief is weakening', () => {
    const w = buildWatch(input({ ...base, commitments: [moving], others: [other] }))
    expect(w.flags.map((r) => r.id)).toEqual(['dependency:p1'])
    expect(w.flags[0].commitments).toEqual(['c1'])
  })

  it('does not flag at 91 days, or while every necessary belief holds', () => {
    expect(buildWatch(input({ ...base, commitments: [moving], others: [commitment('p1', { horizon_at: '2027-06-30' })] })).flags).toHaveLength(0)
    const holding = commitment('c1', { foundations: [{ belief: 'b', necessary: true, state: 'supported' }] })
    expect(buildWatch(input({ ...base, commitments: [holding], others: [other] })).flags).toHaveLength(0)
  })
})

describe('condition 4: a deferred review reached its revisit date', () => {
  const review: QueryRow<'reviews'> = { review: 'r1', commitment: 'c1', kind: 'reconsideration', scheduled_for: '2027-02-10', held_at: '2027-02-10T17:00:00Z', outcome: 'defer' }

  it('reopens the belief flag and adds the condition', () => {
    const w = buildWatch(input({ commitments: [commitment('c1', { revisit_at: '2027-03-31' })], reviews: [review] }))
    expect(w.flags[0]).toMatchObject({ conditions: ['contradicting', 'revisit'], lifecycle: 'reopened' })
  })

  it('stands alone when no moved belief carries it', () => {
    const w = buildWatch(input({ beliefs: new Map([['b', evaluation('b', 'supported')]]), commitments: [commitment('c1', { revisit_at: '2027-03-31' })], reviews: [review] }))
    expect(w.flags.map((r) => r.id)).toEqual(['revisit:r1'])
  })

  it('waits until the date', () => {
    const w = buildWatch(input({ commitments: [commitment('c1', { revisit_at: '2027-04-15' })], reviews: [review] }))
    expect(w.flags[0]).toMatchObject({ conditions: ['contradicting'], lifecycle: 'reviewed' })
  })
})

describe('lifecycle', () => {
  const review = (held: string): QueryRow<'reviews'> => ({ review: 'r', commitment: 'c1', kind: 'scheduled', scheduled_for: held, held_at: `${held}T12:00:00Z`, outcome: 'affirm' })
  const judged = (at: string) => evaluation('b', 'contradicting', { judgments: [{ claim: 'k', belief: 'b', stance: 'contradicts', by: 'cfo', at: `${at}T09:00:00Z`, agent: false }] })

  it('is new with no review since it opened', () => {
    expect(buildWatch(input({ reviews: [review('2027-01-15')] })).flags[0].lifecycle).toBe('new')
  })

  it('is reviewed after a review, and reopened by newer evidence', () => {
    expect(buildWatch(input({ beliefs: new Map([['b', judged('2027-02-10')]]), reviews: [review('2027-03-01')] })).flags[0].lifecycle).toBe('reviewed')
    expect(buildWatch(input({ beliefs: new Map([['b', judged('2027-03-20')]]), reviews: [review('2027-03-01')] })).flags[0].lifecycle).toBe('reopened')
  })
})
