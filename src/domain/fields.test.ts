import { describe, expect, it } from 'vitest'
import type { QueryRow } from '../model/generated.ts'
import { FIELDS, acceptedCount, fieldStates, proposedStatus } from './fields.ts'

const g = (claim: string, field: QueryRow<'grounding_claims'>['field'], status: QueryRow<'grounding_claims'>['status'], recorded_at: string, commitment = 'c1'): QueryRow<'grounding_claims'> => ({
  commitment,
  claim,
  field,
  statement: claim,
  status,
  kind: 'observation',
  recorded_at,
  source: 'doc',
})

describe('fieldStates', () => {
  it('takes the newest claim not rejected, and lists the rejected ones', () => {
    const states = fieldStates('c1', [
      g('p2', 'promise', 'unverified', '2027-03-02T10:00:00.000Z'),
      g('p1', 'promise', 'rejected', '2027-03-01T10:00:00.000Z'),
      g('p3', 'promise', 'rejected', '2027-03-03T10:00:00.000Z'),
      g('o1', 'owner', 'verified', '2027-03-01T10:00:00.000Z'),
      g('x', 'capital', 'verified', '2027-03-01T10:00:00.000Z', 'c2'),
    ])
    expect(states.map((s) => s.field)).toEqual([...FIELDS])
    const promise = states.find((s) => s.field === 'promise')!
    expect(promise).toMatchObject({ status: 'pending', claim: { claim: 'p2' } })
    expect(promise.rejected.map((r) => r.claim)).toEqual(['p1', 'p3'])
    expect(states.find((s) => s.field === 'owner')!.status).toBe('accepted')
    expect(states.find((s) => s.field === 'capital')!.status).toBe('missing')
    expect(acceptedCount(states)).toBe(1)
  })

  it('is incomplete with a field missing, else unverified', () => {
    const t = '2027-03-01T10:00:00.000Z'
    expect(proposedStatus(fieldStates('c1', [g('p', 'promise', 'verified', t)]))).toBe('incomplete')
    expect(proposedStatus(fieldStates('c1', FIELDS.map((f) => g(f, f, 'unverified', t))))).toBe('unverified')
  })
})
