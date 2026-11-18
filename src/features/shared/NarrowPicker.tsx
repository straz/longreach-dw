import { type ReactNode, useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Caret } from '../../ui/Menu.tsx'
import './NarrowPicker.css'

// A tab's left column (docs/PLAN.md §3, principle 9): a column on a laptop;
// under 1000 px a picker above the main pane that names the current choice
// and opens the column as a dropdown. Choosing closes it.

type Props = { className: string; label: string; current: string; children: ReactNode }

export default function NarrowPicker({ className, label, current, children }: Props) {
  const [open, setOpen] = useState(false)
  const { pathname, search } = useLocation()
  useEffect(() => setOpen(false), [pathname, search])
  return (
    <aside className={`${className} picker${open ? ' is-open' : ''}`} aria-label={label}>
      <button type="button" className="picker-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="picker-label">{label}</span>
        <span className="picker-current">{current}</span>
        <Caret />
      </button>
      <div className="picker-body">{children}</div>
    </aside>
  )
}
