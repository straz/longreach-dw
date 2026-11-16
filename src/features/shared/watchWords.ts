import { formatDate } from '../../domain/format.ts'
import type { Condition, Lifecycle, Quiet } from '../../domain/materiality.ts'

// The Watch tab's words for the materiality rule (docs/PLAN.md §2.5, §4.5):
// every row that moved and is not a flag says which condition it misses.

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = { new: 'New', reviewed: 'Reviewed', reopened: 'Reopened' }

export const CONDITION_TEXT: Record<Condition, string> = {
  contradicting: 'Contradicted, and a commitment rests on it as necessary with capital still avoidable or a window inside 180 days',
  tripwire: 'A tripwire was reached',
  dependency: 'Another party’s commitment that ours depend on ends within 90 days, while a necessary assumption has moved',
  revisit: 'A deferred review has reached its revisit date',
}

export function quietText(q: Quiet, format: (v: number) => string): string {
  switch (q.code) {
    case 'nothing_rests':
      return 'Nothing of ours rests on it'
    case 'not_watched':
      return 'Not watched'
    case 'not_necessary':
      return 'Supporting, not necessary'
    case 'within_tolerance':
      return `Within tolerance; the limit is ${format(q.limit)}`
    case 'weakening':
      return 'Weakening, not contradicted'
    case 'no_avoidable':
      return q.until ? `No avoidable capital before ${formatDate(q.until)}` : 'Nothing left to avoid'
    case 'not_fired':
      return 'Near its line, not reached'
  }
}

export const STANCE_TEXT = { supports: 'supports', weakens: 'weakens', contradicts: 'contradicts', informs: 'informs' } as const
