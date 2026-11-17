import type { IsoDate, QueryRow } from '../model/generated.ts'
import { compareDates } from './dates.ts'
import { groupBy } from './groupBy.ts'
import type { BeliefEvaluation } from './watchState.ts'

// The capital clock and the headline (docs/PLAN.md §1.3). Pure functions of
// query rows, worked out in the browser.

type Exposure = QueryRow<'exposures'>

export type Capital = {
  as_of: IsoDate
  authorized?: number
  sunk: number
  /** Committed but not yet spent. */
  unspent: number
  avoidable: number
  atRisk: number
  /** When the avoidable part stops being avoidable. */
  until?: IsoDate
  total: number
  /** The money unit of the readings. */
  unit?: string
}

/**
 * The date a commitment's avoidable capital stops being avoidable, while some
 * is and that date has not passed. Titled by the option window closing that
 * day, if `next` is it.
 */
export function avoidableWindow(capital: Capital | undefined, asOf: IsoDate, next?: { date: IsoDate; title: string }): { date: IsoDate; title: string } | undefined {
  if (!capital || capital.avoidable <= 0 || !capital.until || capital.until < asOf) return undefined
  return { date: capital.until, title: next?.date === capital.until ? next.title : 'Avoidable until' }
}

/** The newest reading of each kind for one commitment, from the visible exposure rows. */
export function capitalOf(commitment: string, exposures: Exposure[]): Capital | undefined {
  const mine = exposures.filter((e) => e.commitment === commitment)
  if (!mine.length) return undefined
  const asOf = mine.reduce((m, e) => (e.as_of > m ? e.as_of : m), mine[0].as_of)
  const at = mine.filter((e) => e.as_of === asOf)
  const amount = (kind: Exposure['kind']) => at.find((e) => e.kind === kind)?.amount
  const sunk = amount('sunk') ?? 0
  const unspent = amount('committed') ?? 0
  return {
    as_of: asOf,
    authorized: amount('authorized'),
    sunk,
    unspent,
    avoidable: amount('avoidable') ?? 0,
    atRisk: amount('at_risk') ?? 0,
    until: at.find((e) => e.kind === 'avoidable')?.irreversible_by,
    total: sunk + unspent,
    unit: at[0].unit,
  }
}

export type MovedCommitment = {
  commitment: string
  capital: Capital
  /** The necessary beliefs that are contradicting. */
  beliefs: string[]
}

export type Headline = {
  authorized: number
  committed: number
  moved: MovedCommitment[]
  /** Unspent capital of the moved commitments. */
  movedCapital: number
  /** The part of it an open option or clause could still save. */
  avoidable: number
  /** Soonest date the avoidable part of a moved commitment stops being avoidable. */
  firstWindow?: { date: IsoDate; commitment: string }
}

export type HeadlineInput = {
  /** The program commitment, whose authorized reading is the first figure. */
  program: string
  /** Our live commitments (the program's entailed ones and any others). */
  live: string[]
  entailed: string[]
  restsOn: QueryRow<'rests_on'>[]
  beliefs: Map<string, BeliefEvaluation>
  /** Each commitment's capital, already worked out from its exposures. */
  capital: ReadonlyMap<string, Capital>
}

/**
 * Deployed under moved assumptions: unspent capital of live commitments that
 * rest, as necessary, on a belief now contradicting. Commitments with no
 * unspent capital are left out: there is nothing left to deploy.
 */
export function headline(input: HeadlineInput): Headline {
  const moved: MovedCommitment[] = []
  const restsOn = groupBy(input.restsOn, (r) => r.commitment)
  for (const c of input.live) {
    const contradicted = (restsOn.get(c) ?? []).filter((r) => r.necessary && input.beliefs.get(r.belief)?.state === 'contradicting').map((r) => r.belief)
    const capital = input.capital.get(c)
    if (contradicted.length && capital && capital.unspent > 0) moved.push({ commitment: c, capital, beliefs: contradicted })
  }
  const windows = moved
    .filter((m) => m.capital.avoidable > 0 && m.capital.until)
    .sort((a, b) => a.capital.until!.localeCompare(b.capital.until!))
  const committed = input.entailed.reduce((sum, c) => sum + (input.capital.get(c)?.total ?? 0), 0)
  return {
    authorized: input.capital.get(input.program)?.authorized ?? 0,
    committed,
    moved: moved.sort((a, b) => compareDates(a.capital.until, b.capital.until)),
    movedCapital: moved.reduce((s, m) => s + m.capital.unspent, 0),
    avoidable: moved.reduce((s, m) => s + m.capital.avoidable, 0),
    firstWindow: windows[0] && { date: windows[0].capital.until!, commitment: windows[0].commitment },
  }
}
