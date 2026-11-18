import type { IsoDate } from '../model/generated.ts'

// Calendar arithmetic on ISO dates, in UTC so a viewer's time zone never
// moves a date.

const DAY_MS = 86_400_000

/** The day of a moment (wire.ts MOMENTS: held_at, recorded_at, observed_at, …), which stays a full instant in
 *  the fixed form 2027-03-31T14:05:09.000Z; every other date field is already a day. */
export const dayOf = (at: string): IsoDate => at.slice(0, 10)

export const toUtc = (d: IsoDate) => Date.parse(`${dayOf(d)}T00:00:00Z`)
export const fromUtc = (ms: number): IsoDate => dayOf(new Date(ms).toISOString())

export const daysBetween = (from: IsoDate, to: IsoDate) => Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
export const addDays = (d: IsoDate, days: number): IsoDate => fromUtc(toUtc(d) + days * DAY_MS)

/** Orders dates (or moments) oldest first, with a missing one last. */
export const compareDates = (a: string | undefined, b: string | undefined) => (a === b ? 0 : a === undefined ? 1 : b === undefined ? -1 : a < b ? -1 : 1)

/** Today as the user's own calendar says, not UTC's: an evening in the US is still today. */
export const localToday = (now = new Date()): IsoDate =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

/** The same day a year before; the 29th of February goes to the 28th. */
export const yearBefore = (d: IsoDate): IsoDate => {
  const [y, m, day] = dayOf(d).split('-').map(Number)
  const last = new Date(Date.UTC(y - 1, m, 0)).getUTCDate()
  return `${y - 1}-${String(m).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
}
