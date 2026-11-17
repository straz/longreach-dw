import type { IsoDate } from './model/generated.ts'

// The API's wire format, converted at one boundary (docs/PLAN.md §2; tyapi docs/18-dw-backend.md, W14). The API
// writes every date as an ISO-8601 instant in UTC, in its shortest form (2027-03-31T00:00Z, 2027-03-31T14:05:09Z).
// The screens and src/domain/ work in calendar days, except for the moments below, whose time of day orders things
// that happen on one day: a flag reviewed and then given new evidence, two reviews held the same day.

const INSTANT = /^(\d{4}-\d\d-\d\d)T\d\d:\d\d(:\d\d(\.\d{1,3})?)?Z$/
const DAY = /^\d{4}-\d\d-\d\d$/

/** Fields whose time of day matters. They stay instants, written in one fixed form
 *  (2027-03-31T14:05:09.000Z), so comparing two as text compares them in time, and the first ten characters
 *  are their day (dates.ts, dayOf). */
export const MOMENTS: ReadonlySet<string> = new Set(['held_at', 'recorded_at', 'observed_at', 'judged_at', 'decided_at', 'at'])

/** value with leaf applied to every non-container value, at any depth; leaf also gets the key it is under. */
export function mapDeep<T>(value: T, leaf: (v: unknown, key?: string) => unknown, key?: string): T {
  if (Array.isArray(value)) return value.map((v) => mapDeep(v, leaf, key)) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapDeep(v, leaf, k)])) as T
  return leaf(value, key) as T
}

/** An answer as the screens read it: every instant as its day in UTC (2027-03-31T00:00Z → 2027-03-31), but a
 *  moment (MOMENTS) as an instant in the fixed form. Exact, because every instant is in UTC. */
export const fromApi = <T>(value: T): T =>
  mapDeep(value, (v, key) => {
    if (typeof v !== 'string') return v
    const m = INSTANT.exec(v)
    if (!m) return v
    return key !== undefined && MOMENTS.has(key) ? new Date(v).toISOString() : m[1]
  })

/** A query's parameters or a write's body as the API takes it: every day as its midnight in UTC, the form a
 *  calendar day is stored in. (The gateway also takes a bare day since 2026-11-15.) */
export const toApi = <T>(value: T): T => mapDeep(value, (v) => (typeof v === 'string' && DAY.test(v) ? `${v}T00:00Z` : v))

/** The instant a day ends at: "as of" a day, or "after" it, counts everything dated that day. */
export const endOf = (day: IsoDate) => `${day}T23:59:59.999Z`

/** T with every null, at any depth, as an absent value. */
export type NoNulls<T> = T extends null ? undefined : T extends (infer U)[] ? NoNulls<U>[] : T extends object ? { [K in keyof T]: NoNulls<T[K]> } : T

/** The API writes an optional field it has no value for as null; the screens leave it out. */
export function noNulls<T>(value: T): NoNulls<T> {
  if (Array.isArray(value)) return value.map(noNulls) as NoNulls<T>
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null).map(([k, v]) => [k, noNulls(v)])) as NoNulls<T>
  }
  return value as NoNulls<T>
}
