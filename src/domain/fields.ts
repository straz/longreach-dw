import type { QueryRow } from '../model/generated.ts'

// The fields a commitment is verified on (docs/PLAN.md §2.3): the brief's
// six, plus capital, without which there is nothing to watch. Each field is
// grounded by claims; the newest claim not rejected is the field's value.

export const FIELDS = ['promise', 'capital', 'owner', 'rationale', 'assumptions', 'success_criteria', 'dependencies'] as const
export type Field = (typeof FIELDS)[number]

export const FIELD_LABEL: Record<Field, string> = {
  promise: 'Promise',
  capital: 'Capital',
  owner: 'Owner',
  rationale: 'Rationale and authorization',
  assumptions: 'Economic assumptions',
  success_criteria: 'Success criteria',
  dependencies: 'Dependencies',
}

type Grounding = QueryRow<'grounding_claims'>

export type FieldState = {
  field: Field
  status: 'missing' | 'pending' | 'accepted'
  /** The claim that currently stands for the field. */
  claim?: Grounding
  /** Earlier claims replaced by the owner. */
  rejected: Grounding[]
}

export function fieldStates(commitment: string, grounding: Grounding[]): FieldState[] {
  const mine = grounding.filter((g) => g.commitment === commitment)
  return FIELDS.map((field) => {
    const claims = mine.filter((g) => g.field === field).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    const claim = claims.filter((g) => g.status !== 'rejected').at(-1)
    return {
      field,
      claim,
      rejected: claims.filter((g) => g.status === 'rejected'),
      status: !claim ? 'missing' : claim.status === 'verified' ? 'accepted' : 'pending',
    }
  })
}

/** A proposed commitment is incomplete until every field has a claim, then unverified until all are accepted. */
export function proposedStatus(states: FieldState[]): 'incomplete' | 'unverified' {
  return states.some((s) => s.status === 'missing') ? 'incomplete' : 'unverified'
}

export const acceptedCount = (states: FieldState[]) => states.filter((s) => s.status === 'accepted').length
