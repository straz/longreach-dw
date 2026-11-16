import type { IsoDate } from '../model/generated.ts'
import { DISPLAY_YEAR } from './clock.ts'
import { daysBetween } from './dates.ts'

// Every money and date string on screen and in print comes from here
// (docs/PLAN.md §7.4).

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "Apr", or "April" when `long`, for an ISO date or month ("2027-04"). */
export const monthName = (d: string, { long = false } = {}): string => {
  const name = MONTHS[Number(d.slice(5, 7)) - 1]
  return long ? name : name.slice(0, 3)
}
const MINUS = '−'

/** "Apr 15" within the demo year, "Apr 15, 2028" otherwise. `long` always adds the year. */
export function formatDate(d: IsoDate, { long = false } = {}): string {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  const base = `${MONTHS[m - 1].slice(0, 3)} ${day}`
  return long || String(y) !== DISPLAY_YEAR ? `${base}, ${y}` : base
}

/** "(15 days)" when the date is 0 to 90 days after `from`; otherwise empty. */
export function daysAway(d: IsoDate, from: IsoDate): string {
  const n = daysBetween(from, d)
  if (n < 0 || n > 90) return ''
  return n === 1 ? '(1 day)' : `(${n} days)`
}

/**
 * Amounts in $M: "$359M", "$1.35B", "$40.8M", "$4.2M": one decimal below
 * $100M unless the amount is whole, none from $100M up.
 * `signed` adds an explicit plus sign; negatives always use a true minus.
 */
export function formatMoney(millions: number, { signed = false } = {}): string {
  const sign = millions < 0 ? MINUS : signed && millions > 0 ? '+' : ''
  const m = Math.abs(millions)
  let body: string
  // Billions keep two decimals ($1.30B), dropping them only when exact ($2B).
  if (m >= 1000) body = `$${(m / 1000).toFixed(2).replace(/\.00$/, '')}B`
  else if (m >= 99.95) body = `$${Math.round(m)}M`
  else body = `$${trimZeros(m.toFixed(1))}M`
  return sign + body
}

const trimZeros = (s: string) => (s.includes('.') ? s.replace(/\.?0+$/, '') : s)

export type MetricFormat = { decimals: number; prefix?: string; suffix?: string }

/** A metric reading as its indicator prints it: "$1.47", "76.8%", "1.58×", "$1,172". */
export function formatMetric(value: number, f: MetricFormat | undefined): string {
  if (!f) return String(value)
  const body = value.toLocaleString('en-US', { minimumFractionDigits: f.decimals, maximumFractionDigits: f.decimals })
  return `${f.prefix ?? ''}${body}${f.suffix ?? ''}`
}

/** "1 flag", "3 flags". */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
