import type { Brief } from '../../domain/briefs.ts'
import type { ReviewOutcome } from '../../model/generated.ts'

/** A short label like "B2" for briefs named that way; others go by their title. */
export const briefLabel = (slug: string) => (/^[a-z]\d+$/.test(slug) ? slug.toUpperCase() : undefined)

export const STATE_TEXT: Record<Brief['state'], string> = { open: 'Open', awaiting: 'Awaiting approval', deferred: 'Deferred', decided: 'Decided' }

/** How a reconsideration ended, by its review's outcome. */
export const OUTCOME_TEXT: Record<ReviewOutcome, string> = {
  affirm: 'Continue',
  amend: 'Changed',
  defer: 'Deferred',
  reverse: 'Exited',
  escalate: 'Sent for approval',
  close: 'Closed',
  pending: 'Pending',
}
