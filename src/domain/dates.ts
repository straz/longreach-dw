import type { IsoDate } from '../model/generated.ts'

// Calendar arithmetic on ISO dates, in UTC so a viewer's time zone never
// moves a date.

const DAY_MS = 86_400_000

export const toUtc = (d: IsoDate) => Date.parse(`${d.slice(0, 10)}T00:00:00Z`)
export const fromUtc = (ms: number): IsoDate => new Date(ms).toISOString().slice(0, 10)

export const daysBetween = (from: IsoDate, to: IsoDate) => Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
export const addDays = (d: IsoDate, days: number): IsoDate => fromUtc(toUtc(d) + days * DAY_MS)
