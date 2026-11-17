import type { IsoDate } from '../model/generated.ts'
import { dayOf } from './dates.ts'

// Each demo runs at its own clock (tyapi demos/<org>/demo.yaml, frame): `today`, the fixed day its screens are
// as of, and `earliest`, where its time axis starts. The as-of control moves back from today (test8 had one
// clock for every demo; dw has one per demo).
export type Clock = { today: IsoDate; earliest: IsoDate }

/** The as-of day to use: a valid day inside the demo's range, else its today. */
export function clampAsOf(value: string | null | undefined, clock: Clock): IsoDate {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return clock.today
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || dayOf(parsed.toISOString()) !== value) return clock.today
  if (value < clock.earliest) return clock.earliest
  if (value > clock.today) return clock.today
  return value
}

export const isLookingBack = (asOf: IsoDate, clock: Clock) => asOf < clock.today
