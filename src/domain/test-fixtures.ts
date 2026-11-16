import type { CommitmentView } from './portfolio.ts'
import type { BeliefEvaluation, BeliefState } from './watchState.ts'

// Small records for domain tests: an active commitment and a belief's
// evaluation, each with only the fields a test names overridden.

export const AS_OF = '2027-03-31'

export const view = (slug: string, extra: Partial<CommitmentView> = {}): CommitmentView => ({
  commitment: slug,
  title: slug,
  statement: slug,
  scale: 'operational',
  state: 'active',
  origin: 'declared',
  recognition: 'confirmed',
  watched: true, // test8's fixture left it out, which the domain reads as watched (only false is not)
  status: 'active',
  foundations: [],
  moved: false,
  ...extra,
})

export const evaluation = (slug: string, state: BeliefState, extra: Partial<BeliefEvaluation> = {}): BeliefEvaluation => ({
  belief: slug,
  state,
  basis: 'judgment',
  readings: [],
  judgments: [],
  steps: [],
  movedSince: state === 'contradicting' || state === 'weakening' ? '2027-02-01' : undefined,
  ...extra,
})
