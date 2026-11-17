import { toUtc } from '../../domain/dates.ts'
import './marks.css'

// The time axis's mark vocabulary (docs/PLAN.md §7.3). Every dated thing on
// every screen is drawn with one of these, so a CFO who has read one chart
// has read them all.

export type MarkKind = 'window' | 'report' | 'evidence' | 'decision' | 'end' | 'revisit'

export function Mark({ kind, size = 12, tone }: { kind: MarkKind; size?: number; tone?: 'moved' | 'weak' }) {
  const cls = `mark is-${kind}${tone ? ` tone-${tone}` : ''}`
  const s = size
  switch (kind) {
    case 'window':
      return (
        <svg className={cls} width={s} height={s} viewBox="0 0 12 12" aria-hidden="true">
          <rect x="2.2" y="2.2" width="7.6" height="7.6" transform="rotate(45 6 6)" fill="currentColor" />
        </svg>
      )
    case 'report':
      return (
        <svg className={cls} width={s} height={s} viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 1.6 L10.6 10 H1.4 Z" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case 'evidence':
      return (
        <svg className={cls} width={s} height={s} viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="4.2" fill="currentColor" />
        </svg>
      )
    case 'decision':
      return (
        <svg className={cls} width={s} height={s} viewBox="0 0 12 12" aria-hidden="true">
          <rect x="2" y="2" width="8" height="8" rx="1.5" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case 'revisit':
      return (
        <svg className={cls} width={s} height={s} viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="4.2" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 3.6 V6.2 L7.8 7.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )
    case 'end':
      return (
        <svg className={cls} width={s} height={s} viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 1.5 V10.5 M3 2 H9.5 L8 4.2 L9.5 6.4 H3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )
  }
}

/** A linear scale from dates to pixels. */
export function timeScale(start: string, end: string, x0: number, x1: number) {
  const t0 = Date.parse(`${start}T00:00:00Z`)
  const t1 = Date.parse(`${end}T00:00:00Z`)
  return (date: string) => x0 + ((toUtc(date) - t0) / (t1 - t0)) * (x1 - x0)
}

/** First days of each month between two dates, for axis ticks. */
export function monthTicks(start: string, end: string): string[] {
  const out: string[] = []
  let [y, m] = start.split('-').map(Number)
  m += 1
  for (;;) {
    if (m > 12) {
      m = 1
      y += 1
    }
    const d = `${y}-${String(m).padStart(2, '0')}-01`
    if (d > end) return out
    out.push(d)
    m += 1
  }
}
