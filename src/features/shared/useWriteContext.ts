import { useMemo } from 'react'
import { isLookingBack } from '../../domain/clock.ts'
import { useGateway } from '../../gateway/react.tsx'
import { isMain } from '../../project.ts'
import { useClock } from './client.tsx'
import { useRouteState } from './routeState.ts'

/**
 * Whether changes are on, and the time a change is made at: the demo's today with the wall-clock time, an instant
 * in UTC. Changes are made at the demo's today, so they are off while looking back, and on a branch of the
 * visitor's, so they are off for a visitor who may only read main; `why` says which, for the control that is
 * turned off. The gateway stamps the records itself; `at` is for a value the user states, such
 * as when a decision was taken.
 */
export function useWriteContext(): { at: () => string; readOnly: boolean; why?: string } {
  const clock = useClock()
  const { asOf } = useRouteState()
  const back = isLookingBack(asOf, clock)
  const reading = isMain(useGateway().branch)
  return useMemo(
    () => ({
      at: () => `${clock.today}T${new Date().toISOString().slice(11, 19)}Z`,
      readOnly: back || reading,
      why: back ? 'Changes are turned off while looking back' : reading ? 'You can read this demo, not change it' : undefined,
    }),
    [clock.today, back, reading],
  )
}
