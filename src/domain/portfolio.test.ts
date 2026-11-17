import { describe, expect, it } from 'vitest'
import type { QueryRow } from '../model/generated.ts'
import { type PortfolioRows, PORTFOLIO_QUERIES, buildPortfolio, statusOf } from './portfolio.ts'
import { AS_OF } from './test-fixtures.ts'

const row = (commitment: string, extra: Partial<QueryRow<'commitments'>> = {}): QueryRow<'commitments'> => ({
  commitment,
  title: commitment,
  statement: commitment,
  scale: 'operational',
  state: 'active',
  origin: 'declared',
  recognition: 'confirmed',
  watched: true,
  ...extra,
})

describe('statusOf', () => {
  it('projects the commitment state, and a proposed one from its fields', () => {
    expect(statusOf(row('c', { state: 'fulfilled' }), [])).toBe('past')
    expect(statusOf(row('c', { state: 'superseded' }), [])).toBe('past')
    expect(statusOf(row('c', { state: 'suspended' }), [])).toBe('active')
    expect(statusOf(row('c', { state: 'proposed' }), [{ field: 'promise', status: 'missing', rejected: [] }])).toBe('incomplete')
    expect(statusOf(row('c', { state: 'proposed' }), [{ field: 'promise', status: 'pending', rejected: [] }])).toBe('unverified')
  })
})

describe('buildPortfolio', () => {
  const empty = Object.fromEntries([...PORTFOLIO_QUERIES, 'expected'].map((q) => [q, []])) as unknown as PortfolioRows
  const exposure = (commitment: string, kind: QueryRow<'exposures'>['kind'], amount: number, irreversible_by?: string): QueryRow<'exposures'> =>
    ({ commitment, exposure: `${commitment}-${kind}`, kind, amount, unit: 'USD', as_of: '2027-03-01', irreversible_by })
  const rows: PortfolioRows = {
    ...empty,
    commitments: [row('p', { scale: 'program' }), row('c1'), row('c2', { state: 'proposed' }), row('x')],
    bound_parties: [
      { commitment: 'p', party: 'acme', name: 'Acme' },
      { commitment: 'c1', party: 'acme', name: 'Acme' },
      { commitment: 'c2', party: 'acme', name: 'Acme' },
      { commitment: 'x', party: 'vendor', name: 'Vendor' },
    ],
    owners: [{ commitment: 'c1', party: 'cfo', name: 'Dana' }],
    exposures: [exposure('p', 'authorized', 100), exposure('c1', 'sunk', 4), exposure('c1', 'committed', 6), exposure('c1', 'avoidable', 5, '2027-05-01')],
    beliefs: [{ belief: 'b', kind: 'assumption', statement: 'b', status: 'hypothesized' }],
    rests_on: [{ commitment: 'c1', belief: 'b', necessary: true }],
    contradicts_links: [{ claim: 'k', belief: 'b', judged_by: 'cfo', judged_at: '2027-03-01T10:00:00.000Z' }],
    actors: [{ actor: 'cfo', kind: 'human', name: 'Dana', party: 'acme' }],
    entails: [{ parent: 'p', child: 'c1' }],
    options: [
      { commitment: 'c1', option: 'o-late', title: 'Renewal', kind: 'defer', status: 'identified', closes_at: '2027-09-01' },
      { commitment: 'c1', option: 'o-done', title: 'Used', kind: 'defer', status: 'exercised', closes_at: '2027-04-01' },
      { commitment: 'c1', option: 'o-soon', title: 'Cancel the balance', kind: 'abandon', status: 'identified', closes_at: '2027-05-01' },
    ],
  }
  const p = buildPortfolio(rows, AS_OF, 'acme')

  it("splits ours from other parties' and projects each view", () => {
    expect(p.commitments.map((c) => [c.commitment, c.status])).toEqual([['p', 'active'], ['c1', 'active'], ['c2', 'incomplete']])
    expect(p.others.map((c) => c.commitment)).toEqual(['x'])
    expect(p.program?.commitment).toBe('p')
    const c1 = p.commitments[1]
    expect(c1).toMatchObject({ moved: true, worst: 'contradicting', owner: { party: 'cfo', name: 'Dana' }, nextWindow: { date: '2027-05-01', title: 'Cancel the balance', option: 'o-soon' } })
    expect(c1.capital).toMatchObject({ unspent: 6, avoidable: 5, total: 10, until: '2027-05-01' })
    expect(p.beliefs.get('b')?.state).toBe('contradicting')
  })

  it('works out the headline and the flags', () => {
    expect(p.headline).toMatchObject({ authorized: 100, committed: 10, movedCapital: 6, avoidable: 5, firstWindow: { date: '2027-05-01', commitment: 'c1' } })
    expect(p.watch.flags.map((r) => r.id)).toEqual(['belief:b'])
    expect(p.watch.flaggedCommitments).toEqual(['c1'])
  })
})
