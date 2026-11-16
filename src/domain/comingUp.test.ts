import { describe, expect, it } from 'vitest'
import { type ComingUpInput, buildComingUp } from './comingUp.ts'
import { AS_OF, view } from './test-fixtures.ts'

const input = (over: Partial<ComingUpInput> = {}): ComingUpInput => ({
  asOf: AS_OF,
  commitments: [],
  others: [],
  options: [],
  reviews: [],
  expected: [],
  restsOn: [],
  dependsOn: [],
  flagged: new Set(),
  flaggedBeliefs: new Set(),
  ...over,
})

describe('buildComingUp', () => {
  it('puts the avoidable amount on the window that ends it, once per day', () => {
    const c = view('c1', { capital: { as_of: AS_OF, sunk: 0, unspent: 10, avoidable: 8, atRisk: 0, until: '2027-04-15', total: 10 } })
    const items = buildComingUp(
      input({
        commitments: [c],
        flagged: new Set(['c1']),
        options: [
          { commitment: 'c1', option: 'o1', title: 'Defer delivery', kind: 'defer', status: 'identified', closes_at: '2027-04-15' },
          { commitment: 'c1', option: 'o2', title: 'Cancel the balance', kind: 'abandon', status: 'identified', closes_at: '2027-04-15' },
        ],
      }),
    )
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'window', title: 'Defer delivery', also: ['Cancel the balance'], amount: 8, flagged: true })
  })

  it('keeps to the next 180 days and to active commitments', () => {
    const items = buildComingUp(
      input({
        commitments: [view('c1', { horizon_at: '2027-09-27', revisit_at: '2027-09-28' }), view('c2', { status: 'past', horizon_at: '2027-05-01' })],
      }),
    )
    expect(items.map((i) => [i.kind, i.date])).toEqual([['end', '2027-09-27']])
  })

  it('groups an expected report’s beliefs and flags it by a flagged belief', () => {
    const items = buildComingUp(
      input({
        commitments: [view('c1')],
        restsOn: [{ commitment: 'c1', belief: 'b1', necessary: true }],
        expected: [
          { expected: '2027-04-03T00:00:00Z', source: 'GPU index', belief: 'b1', statement: '' },
          { expected: '2027-04-03T00:00:00Z', source: 'GPU index', belief: 'b2', statement: '' },
        ],
        flaggedBeliefs: new Set(['b2']),
      }),
    )
    expect(items).toEqual([expect.objectContaining({ kind: 'report', beliefs: ['b1', 'b2'], commitments: ['c1'], flagged: true })])
  })

  it('lists another party’s end date only when ours depend on it', () => {
    const other = view('p1', { title: 'Energize the site', horizon_at: '2027-06-30' })
    expect(buildComingUp(input({ commitments: [view('c1')], others: [other] }))).toEqual([])
    const items = buildComingUp(input({ commitments: [view('c1')], others: [other], dependsOn: [{ commitment: 'c1', depends_on: 'p1', kind: 'requires' }] }))
    expect(items[0]).toMatchObject({ kind: 'end', title: 'Energize the site ends', commitments: ['c1'] })
  })
})
