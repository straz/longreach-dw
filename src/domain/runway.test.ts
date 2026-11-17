import { describe, expect, it } from 'vitest'
import type { Capital } from './capital.ts'
import { runwayOf } from './runway.ts'
import { AS_OF, view } from './test-fixtures.ts'

const cap = (extra: Partial<Capital> = {}): Capital => ({ as_of: AS_OF, sunk: 0, unspent: 10, avoidable: 5, atRisk: 0, until: '2027-05-01', total: 10, ...extra })

describe('runwayOf', () => {
  it('lists closing windows soonest first, then the rest by size', () => {
    const r = runwayOf(
      [
        view('late', { capital: cap({ until: '2027-08-01' }), nextWindow: { date: '2027-08-01', title: 'Renewal', option: 'o' } }),
        view('soon', { capital: cap({ until: '2027-04-01' }) }),
        view('lapsed', { capital: cap({ until: '2027-03-30', total: 50 }) }),
        view('big', { capital: cap({ avoidable: 0, total: 80 }) }),
        view('program', { scale: 'program', capital: cap() }),
        view('proposed', { status: 'unverified', capital: cap() }),
        view('none'),
      ],
      AS_OF,
    )
    expect(r.rows.map((x) => [x.commitment, x.until, x.avoidable])).toEqual([
      ['soon', '2027-04-01', 5],
      ['late', '2027-08-01', 5],
      ['big', undefined, 0],
      ['lapsed', undefined, 0],
    ])
    expect(r.rows[1].window).toBe('Renewal')
    expect(r.start).toBe(AS_OF)
    expect(r.end).toBe('2027-12-30')
  })
})
