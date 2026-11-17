import { describe, expect, it } from 'vitest'
import { type DetailRows, DETAIL_QUERIES, type Origin, spineOf } from './detail.ts'
import { AS_OF, evaluation, view } from './test-fixtures.ts'

const empty = (): DetailRows => ({ ...(Object.fromEntries(DETAIL_QUERIES.map((q) => [q, []])) as unknown as DetailRows), expected: [], approvals: [] })

describe('spineOf', () => {
  const c = view('c1', {
    foundations: [{ belief: 'b', necessary: true, state: 'contradicting' }],
    capital: { as_of: AS_OF, sunk: 0, unspent: 10, avoidable: 5, atRisk: 0, until: '2027-05-01', total: 10 },
    revisit_at: '2027-06-01',
    horizon_at: '2028-01-01',
  })
  const beliefs = new Map([
    [
      'b',
      evaluation('b', 'contradicting', {
        steps: [
          { claim: 'k0', at: '2027-01-05T10:00:00.000Z', stance: 'supports', judged: false },
          { claim: 'k1', at: '2027-02-01T23:30:00.000Z', stance: 'weakens', judged: false },
          { claim: 'k2', at: '2027-02-15T08:00:00.000Z', stance: 'weakens', judged: false },
          { claim: 'k3', at: '2027-03-05T09:00:00.000Z', stance: 'contradicts', judged: true, note: 'Owner says so' },
        ],
      }),
    ],
  ])
  const rows = empty()
  rows.claims = [{ claim: 'k1', kind: 'observation', statement: 'Yield fell', status: 'verified', recorded_at: '2027-02-01T23:30:00.000Z', source: 's', source_title: 'S', source_kind: 'document' }]
  rows.reviews = [
    { review: 'r1', commitment: 'c1', kind: 'scheduled', scheduled_for: '2027-03-10', held_at: '2027-03-10T17:00:00.000Z', outcome: 'affirm', notes: 'Keep going. More later' },
    { review: 'r2', commitment: 'c1', kind: 'scheduled', scheduled_for: '2027-06-10', outcome: 'pending' },
  ]
  rows.options = [{ commitment: 'c1', option: 'o1', title: 'Cancel the balance', kind: 'abandon', status: 'identified', closes_at: '2027-05-01', exercise_cost: 1 }]
  rows.expected = [
    { expected: '2027-04-20', source: 'Q1 report', belief: 'b', statement: 's' },
    { expected: '2027-04-20', source: 'Q1 report', belief: 'b', statement: 's again' },
    { expected: '2027-04-21', source: 'Elsewhere', belief: 'other', statement: 's' },
  ]
  const origin: Origin = { commitment: 'c1', decision: 'd', statement: 'Approved the plan', kind: 'commit', decided_at: '2026-12-01T15:00:00.000Z', approvals: [], alternatives: [] }
  const spine = spineOf(c, beliefs, rows, origin, AS_OF)

  it('puts the decisions and evidence that moved a belief before the as-of date, as days', () => {
    expect(spine.past.map((e) => [e.date, e.kind, e.title])).toEqual([
      ['2026-12-01', 'decision', 'Approved the plan'],
      ['2027-02-01', 'evidence', 'Yield fell'],
      ['2027-03-05', 'evidence', 'k3'],
      ['2027-03-10', 'decision', 'Keep going'],
    ])
    expect(spine.past[2]).toMatchObject({ stance: 'contradicts', detail: 'Owner says so' })
  })

  it('puts windows, reports (once per day and source), the revisit date and the end after it', () => {
    expect(spine.coming.map((e) => [e.date, e.kind, e.title])).toEqual([
      ['2027-04-20', 'report', 'Q1 report'],
      ['2027-05-01', 'window', 'Cancel the balance'],
      ['2027-06-01', 'revisit', 'Revisit date'],
      ['2028-01-01', 'end', 'Ends'],
    ])
    expect(spine.coming[1]).toMatchObject({ amount: 5, cost: 1 })
  })
})
