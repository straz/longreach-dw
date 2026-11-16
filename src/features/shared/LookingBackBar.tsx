import { isLookingBack } from '../../domain/clock.ts'
import { formatDate } from '../../domain/format.ts'
import { useRouteState } from './routeState.ts'
import { useClock } from './client.tsx'
import './LookingBackBar.css'

// Shown under the headline whenever as-of is before the demo clock, so a past
// view is never mistaken for today's (docs/PLAN.md §7.4).
export default function LookingBackBar() {
  const clock = useClock()
  const { asOf, setAsOf } = useRouteState()
  if (!isLookingBack(asOf, clock)) return null
  return (
    <div className="looking-back" role="status">
      <span>
        Showing what was known on <strong>{formatDate(asOf, { long: true })}</strong>. Changes are turned off while looking
        back.
      </span>
      <button type="button" onClick={() => setAsOf(clock.today)}>
        Back to {formatDate(clock.today)}
      </button>
    </div>
  )
}
