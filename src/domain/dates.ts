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
