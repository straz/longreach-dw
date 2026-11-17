import { avoidableWindow } from './capital.ts'
import { addDays } from './dates.ts'
import type { CommitmentView } from './portfolio.ts'
import type { IsoDate } from '../model/generated.ts'

// The window runway (docs/layouts.md, "Chosen layout"): one row per active
// commitment with capital, from the as-of date to the date its avoidable
// part stops being avoidable. Rows with a closing window come first, soonest
// first; the rest follow by size.

export type RunwayRow = {
  commitment: string
  title: string
  total: number
  avoidable: number
  /** When the avoidable part closes; absent when nothing closes. */
  until?: IsoDate
  window?: string
  moved: boolean
  worst?: CommitmentView['worst']
}

export type Runway = { rows: RunwayRow[]; start: IsoDate; end: IsoDate }

export function runwayOf(commitments: CommitmentView[], asOf: IsoDate, months = 9): Runway {
  const rows = commitments
    .filter((c) => c.status === 'active' && c.scale !== 'program' && c.capital && c.capital.total > 0)
    .map((c): RunwayRow => {
      const until = avoidableWindow(c.capital, asOf)?.date
      return {
        commitment: c.commitment,
        title: c.title,
        total: c.capital!.total,
        avoidable: until ? c.capital!.avoidable : 0,
        until,
        window: until ? c.nextWindow?.title : undefined,
        moved: c.moved,
        worst: c.worst,
      }
    })
    .sort((a, b) => {
      if (a.until && b.until) return a.until.localeCompare(b.until) || b.avoidable - a.avoidable
      if (a.until || b.until) return a.until ? -1 : 1
      return b.total - a.total
    })
  return { rows, start: asOf, end: addDays(asOf, Math.round(months * 30.44)) }
}
