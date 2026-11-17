import { describe, expect, it } from 'vitest'
import type { QueryRow } from '../model/generated.ts'
import { type Capital, avoidableWindow, capitalOf, headline } from './capital.ts'
import { AS_OF, evaluation } from './test-fixtures.ts'

const cap = (extra: Partial<Capital> = {}): Capital => ({ as_of: AS_OF, sunk: 0, unspent: 10, avoidable: 5, atRisk: 0, until: '2027-05-01', total: 10, ...extra })

describe('avoidableWindow', () => {
  it('is the date the avoidable part lapses, titled by the window closing that day', () => {
    expect(avoidableWindow(cap(), AS_OF)).toEqual({ date: '2027-05-01', title: 'Avoidable until' })
    expect(avoidableWindow(cap(), AS_OF, { date: '2027-05-01', title: 'Cancel the balance' })).toEqual({ date: '2027-05-01', title: 'Cancel the balance' })
    expect(avoidableWindow(cap(), AS_OF, { date: '2027-06-01', title: 'Renewal' })).toEqual({ date: '2027-05-01', title: 'Avoidable until' })
  })

  it('counts the as-of day itself, and is absent with nothing avoidable, no date, or the date passed', () => {
    expect(avoidableWindow(cap({ until: AS_OF }), AS_OF)?.date).toBe(AS_OF)
    expect(avoidableWindow(cap({ avoidable: 0 }), AS_OF)).toBeUndefined()
    expect(avoidableWindow(cap({ until: undefined }), AS_OF)).toBeUndefined()
    expect(avoidableWindow(cap({ until: '2027-03-30' }), AS_OF)).toBeUndefined()
    expect(avoidableWindow(undefined, AS_OF)).toBeUndefined()
  })
})

describe('capitalOf', () => {
  it('reads the newest reading of each kind', () => {
    const e = (kind: QueryRow<'exposures'>['kind'], amount: number, as_of: string, irreversible_by?: string): QueryRow<'exposures'> => ({ commitment: 'c1', exposure: `${kind}-${as_of}`, kind, amount, unit: 'USD', as_of, irreversible_by })
    const c = capitalOf('c1', [e('committed', 20, '2027-01-01'), e('sunk', 4, '2027-03-01'), e('committed', 6, '2027-03-01'), e('avoidable', 3, '2027-03-01', '2027-05-01')])
    expect(c).toEqual({ as_of: '2027-03-01', authorized: undefined, sunk: 4, unspent: 6, avoidable: 3, atRisk: 0, until: '2027-05-01', total: 10, unit: 'USD' })
    expect(capitalOf('c2', [])).toBeUndefined()
  })
})

describe('headline', () => {
  const restsOn: QueryRow<'rests_on'>[] = [
    { commitment: 'c1', belief: 'b', necessary: true },
    { commitment: 'c2', belief: 'b', necessary: true },
    { commitment: 'c3', belief: 'b', necessary: false },
    { commitment: 'c4', belief: 'b', necessary: true },
  ]
  const h = headline({
    program: 'p',
    live: ['c1', 'c2', 'c3', 'c4'],
    entailed: ['c1', 'c2', 'c3'],
    restsOn,
    beliefs: new Map([['b', evaluation('b', 'contradicting')]]),
    capital: new Map([
      ['p', cap({ authorized: 100, unspent: 0, avoidable: 0, until: undefined, total: 0 })],
      ['c1', cap({ until: undefined, avoidable: 0 })],
      ['c2', cap({ unspent: 8, avoidable: 4, until: '2027-04-15', total: 12 })],
      ['c3', cap()],
      ['c4', cap({ unspent: 0 })],
    ]),
  })

  it('counts unspent capital of live commitments resting, as necessary, on a contradicted belief', () => {
    expect(h.authorized).toBe(100)
    expect(h.committed).toBe(32)
    expect(h.moved.map((m) => m.commitment)).toEqual(['c2', 'c1']) // dated first, undated last; c3 supporting, c4 nothing unspent
    expect(h.movedCapital).toBe(18)
    expect(h.avoidable).toBe(4)
    expect(h.firstWindow).toEqual({ date: '2027-04-15', commitment: 'c2' })
  })
})
