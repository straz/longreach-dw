import { useEffect, useId, useRef, useState } from 'react'
import { clampAsOf } from '../../domain/clock.ts'
import { addDays, daysBetween } from '../../domain/dates.ts'
import { formatDate } from '../../domain/format.ts'
import type { IsoDate } from '../../model/generated.ts'
import { Caret, useDisclosure } from '../../ui/Menu.tsx'
import { useClock } from './client.tsx'
import { useRouteState } from './routeState.ts'
import './AsOfControl.css'

// The as-of date: a button in the navbar that opens a panel with a slider
// from the demo's earliest day to its today, and an exact date field
// (test8's docs/PLAN.md §4.1). Moving it rewrites the URL; nothing else holds it.

/** How often a moving slider re-asks the graph; the date label follows the thumb every frame. */
const SLIDE_MS = 150

/**
 * While the slider moves, the date it points at is shown at once, and the
 * URL (so the graph's answers) follows at most every SLIDE_MS, then once
 * more on release, so the screen steps through dates instead of thrashing.
 */
function useThrottledAsOf(setAsOf: (d: IsoDate) => void) {
  const [draft, setDraft] = useState<IsoDate>()
  const pending = useRef<IsoDate>(undefined)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const flush = () => {
    timer.current = undefined
    if (pending.current) setAsOf(pending.current)
    pending.current = undefined
  }
  return {
    draft,
    move: (d: IsoDate) => {
      setDraft(d)
      pending.current = d
      if (!timer.current) timer.current = setTimeout(flush, SLIDE_MS)
    },
    release: () => {
      clearTimeout(timer.current)
      flush()
      setDraft(undefined)
    },
  }
}

export default function AsOfControl() {
  const clock = useClock()
  const { asOf, setAsOf } = useRouteState()
  const { open, toggle, root, button } = useDisclosure()
  const panelId = useId()
  const sliderId = useId()
  const dateId = useId()
  const slide = useThrottledAsOf(setAsOf)
  const shown = slide.draft ?? asOf

  return (
    <div className="asof" ref={root}>
      <button
        ref={button}
        type="button"
        className="asof-button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        As of {formatDate(shown, { long: true })}
        <Caret className="asof-caret" />
      </button>
      {open && (
        <div id={panelId} className="asof-panel" role="group" aria-label="Choose the as-of date">
          <p className="asof-help">Show what was known on a past date. The demo clock is {formatDate(clock.today, { long: true })}.</p>
          <label htmlFor={sliderId} className="sr-only">
            As-of date
          </label>
          <input
            id={sliderId}
            className="asof-slider"
            type="range"
            min={0}
            max={daysBetween(clock.earliest, clock.today)}
            step={1}
            value={daysBetween(clock.earliest, shown)}
            aria-valuetext={formatDate(shown, { long: true })}
            onChange={(e) => slide.move(addDays(clock.earliest, Number(e.target.value)))}
            onPointerUp={slide.release}
            onKeyUp={slide.release}
            onBlur={slide.release}
          />
          <div className="asof-ends" aria-hidden="true">
            <span>{formatDate(clock.earliest, { long: true })}</span>
            <span>{formatDate(clock.today, { long: true })}</span>
          </div>
          <div className="asof-row">
            <label htmlFor={dateId}>Date</label>
            <input
              id={dateId}
              type="date"
              min={clock.earliest}
              max={clock.today}
              value={shown}
              onChange={(e) => e.target.value && setAsOf(clampAsOf(e.target.value, clock))}
            />
            <button type="button" className="asof-reset" disabled={asOf === clock.today} onClick={() => setAsOf(clock.today)}>
              Back to {formatDate(clock.today)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
