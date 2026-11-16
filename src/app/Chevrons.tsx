import { type KeyboardEvent, useRef } from 'react'
import { TABS, type Tab, useRouteState } from '../features/shared/routeState.ts'
import './Chevrons.css'

// The three workflow steps as WAI-ARIA tabs: one tab stop for the row, arrow
// keys move and select, Home and End jump to the ends (docs/PLAN.md §4.1).

const LABELS: Record<Tab, { name: string; verb: string }> = {
  commitment: { name: 'Commit', verb: 'record and verify' },
  watch: { name: 'Watch', verb: 'see what moved' },
  reconsider: { name: 'Reconsider', verb: 'decide' },
}

export const PANEL_ID = 'tab-panel'
export const tabId = (tab: Tab) => `tab-${tab}`

function keyTarget(key: string, index: number): number | undefined {
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % TABS.length
    case 'ArrowLeft':
      return (index - 1 + TABS.length) % TABS.length
    case 'Home':
      return 0
    case 'End':
      return TABS.length - 1
  }
}

/** Counts are undefined until the graph answers; the chevron then shows its name only. */
export type ChevronCounts = Partial<Record<Tab, string>>

export default function Chevrons({ counts = {} }: { counts?: ChevronCounts }) {
  const { tab: current, go } = useRouteState()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKey = (event: KeyboardEvent, index: number) => {
    const target = keyTarget(event.key, index)
    if (target === undefined) return
    event.preventDefault()
    go(`/${TABS[target]}`)
    refs.current[target]?.focus()
  }

  return (
    <nav className="chevrons" aria-label="Workflow">
      <div role="tablist" aria-label="Workflow steps" className="chevrons-list">
        {TABS.map((tab, i) => {
          const selected = tab === current
          return (
            <button
              key={tab}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="tab"
              id={tabId(tab)}
              aria-selected={selected}
              aria-controls={PANEL_ID}
              tabIndex={selected ? 0 : -1}
              className="chevron"
              onClick={() => go(`/${tab}`)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <span className="chevron-name">
                {LABELS[tab].name}
                {counts[tab] && <span className="chevron-count">{counts[tab]}</span>}
              </span>
              <span className="chevron-verb">{LABELS[tab].verb}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
