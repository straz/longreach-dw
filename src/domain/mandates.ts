import type { QueryRow } from '../model/generated.ts'

// Whether a mandate covers an amount (docs/PLAN.md §1.1): a mandate with a
// limit covers commitments up to it; one without a limit covers any amount.

type Mandate = Pick<QueryRow<'mandates'>, 'mandate' | 'power' | 'limit_amount' | 'holder_name'>

export const covers = (m: Pick<Mandate, 'limit_amount'>, amount: number) => m.limit_amount === undefined || amount <= m.limit_amount

/** Mandates that could authorize a commitment of this size, widest last. */
export const coveringMandates = (mandates: Mandate[], amount: number) =>
  mandates
    .filter((m) => (m.power === 'approve' || m.power === 'commit') && covers(m, amount))
    .sort((a, b) => (a.limit_amount ?? Infinity) - (b.limit_amount ?? Infinity))
