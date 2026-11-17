import { type KeyboardEvent, type ReactNode, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { compareDates } from '../../domain/dates.ts'
import { formatDate, formatMoney } from '../../domain/format.ts'
import type { CommitmentView, Portfolio } from '../../domain/portfolio.ts'
import { StateGlyph } from '../../ui/stateVocabulary.tsx'
import NarrowPicker from './NarrowPicker.tsx'
import { useRouteState } from './routeState.ts'
import './CommitmentList.css'
import { readStored, writeStored } from '../../storage.ts'

// The left column (docs/PLAN.md §4.2, §4.3): search, the tab's own tools,
// then groups in the order a CFO works through them. The Commitment tab opens
// a commitment from it; Watch scopes its views to one. Up and down move
// between rows.

type Group = { key: string; title: string; note?: string; rows: CommitmentView[]; collapsed?: boolean }

function groupsOf(commitments: CommitmentView[], query: string): Group[] {
  const q = query.trim().toLowerCase()
  const match = (c: CommitmentView) =>
    !q || [c.title, c.counterparty, c.owner?.name, c.statement].some((s) => s?.toLowerCase().includes(q))
  const rows = commitments.filter(match)
  const byWindow = (a: CommitmentView, b: CommitmentView) => compareDates(a.nextWindow?.date, b.nextWindow?.date)
  const bySize = (a: CommitmentView, b: CommitmentView) =>
    Number(b.scale === 'program') - Number(a.scale === 'program') || (b.capital?.total ?? 0) - (a.capital?.total ?? 0)
  const moved = rows.filter((c) => c.moved).sort(byWindow)
  const avoidable = moved.reduce((s, c) => s + (c.capital?.avoidable ?? 0), 0)
  return [
    { key: 'attention', title: 'Needs attention', note: moved.length ? `${formatMoney(avoidable)} avoidable` : undefined, rows: moved },
    { key: 'active', title: 'Active', rows: rows.filter((c) => c.status === 'active' && !c.moved).sort(bySize) },
    { key: 'unverified', title: 'Needs verification', rows: rows.filter((c) => c.status === 'unverified') },
    { key: 'incomplete', title: 'In progress', rows: rows.filter((c) => c.status === 'incomplete') },
    { key: 'past', title: 'Past', rows: rows.filter((c) => c.status === 'past'), collapsed: true },
  ].filter((g) => g.rows.length)
}

type Props = {
  portfolio?: Portfolio
  selected?: string
  /** Above the list, under search: New commitment on the Commitment tab. */
  tools?: ReactNode
  /** The first entry, selected when no commitment is. */
  overview: { label: string; to: string }
  /** Where a row leads, before the as-of date is added. */
  rowPath: (slug: string) => string
  /** A short note on a row, in place of its window: "2 flags". */
  rowNote?: (c: CommitmentView) => string | undefined
}

export default function CommitmentList({ portfolio, selected, tools, overview, rowPath, rowNote }: Props) {
  const { href } = useRouteState()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>(readOpen)
  const toggle = (key: string, now: boolean) =>
    setOpen((prev) => {
      const next = { ...prev, [key]: !now }
      writeOpen(next)
      return next
    })
  const listRef = useRef<HTMLDivElement>(null)
  const groups = useMemo(() => (portfolio ? groupsOf(portfolio.commitments, query) : []), [portfolio, query])

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const links = [...(listRef.current?.querySelectorAll<HTMLAnchorElement>('a.clist-row') ?? [])]
    const i = links.indexOf(document.activeElement as HTMLAnchorElement)
    const next = links[e.key === 'ArrowDown' ? Math.min(links.length - 1, i + 1) : Math.max(0, i - 1)]
    if (next) {
      e.preventDefault()
      next.focus()
    }
  }

  return (
    <NarrowPicker className="clist" label="Commitments" current={portfolio?.commitments.find((c) => c.commitment === selected)?.title ?? overview.label}>
      <div className="clist-tools">
        <input className="clist-search" type="search" placeholder="Search commitments" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search commitments" />
        {tools}
      </div>
      <div className="clist-scroll" ref={listRef} onKeyDown={onKey}>
        {!portfolio && <ListSkeleton />}
        <Link className={`clist-overview${selected ? '' : ' is-selected'}`} to={href(overview.to)}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M1 3.5 H9 M1 7 H12 M1 10.5 H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {overview.label}
        </Link>
        {groups.map((g) => {
          const isOpen = open[g.key] ?? !g.collapsed
          // A search shows every match; a closed group still shows the selected commitment.
          const rows = isOpen || query ? g.rows : g.rows.filter((c) => c.commitment === selected)
          return (
            <section key={g.key} className={`clist-group is-${g.key}`}>
              <h2 className="clist-group-title caps-label">
                <button type="button" onClick={() => toggle(g.key, isOpen)} aria-expanded={isOpen || !!query} aria-controls={`clist-${g.key}`}>
                  <svg className={`clist-caret${isOpen || query ? ' is-open' : ''}`} width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M3 1.5 L7 5 L3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  {g.title} <span className="clist-count">{g.rows.length}</span>
                </button>
                {g.note && <span className="clist-note">{g.note}</span>}
              </h2>
              <div id={`clist-${g.key}`}>
                {rows.map((c) => (
                  <Row key={c.commitment} c={c} selected={c.commitment === selected} to={href(rowPath(c.commitment))} note={rowNote?.(c)} />
                ))}
              </div>
            </section>
          )
        })}
        {portfolio && groups.length === 0 && <p className="clist-empty">No commitment matches “{query}”.</p>}
      </div>
    </NarrowPicker>
  )
}

// Which groups the viewer opened or closed, remembered in this browser only.
const OPEN_KEY = 'dw:clist:open'

const readOpen = () => readStored<Record<string, boolean>>(OPEN_KEY, {})
const writeOpen = (open: Record<string, boolean>) => writeStored(OPEN_KEY, open)

function Row({ c, selected, to, note }: { c: CommitmentView; selected: boolean; to: string; note?: string }) {
  const amount = c.capital?.authorized ?? c.capital?.total
  const window = c.status === 'active' ? c.nextWindow : undefined
  const done = c.fields?.filter((f) => f.status === 'accepted').length ?? 0
  const sub =
    c.status === 'unverified'
      ? `${done} of ${c.fields?.length ?? 7} fields verified`
      : c.status === 'incomplete'
        ? `${c.fields?.filter((f) => f.status === 'missing').length ?? 7} fields missing`
        : c.status === 'past'
          ? `${c.state[0].toUpperCase()}${c.state.slice(1)}${c.horizon_at ? ` ${formatDate(c.horizon_at)}` : ''}`
          : undefined
  return (
    <Link className={`clist-row${selected ? ' is-selected' : ''}${c.moved ? ' is-moved' : ''}`} to={to} aria-current={selected ? 'page' : undefined}>
      <span className="clist-mark">{c.worst && <StateGlyph state={c.worst} />}</span>
      <span className="clist-title">{c.title}</span>
      <span className="clist-meta">
        {sub ?? (
          <>
            {amount !== undefined && <span>{formatMoney(amount)}</span>}
            {note ? <span className="clist-window">{note}</span> : window && <span className="clist-window">window {formatDate(window.date)}</span>}
            {!note && !window && c.owner && <span>{c.owner.name}</span>}
          </>
        )}
      </span>
    </Link>
  )
}

function ListSkeleton() {
  return (
    <div className="clist-skeleton" aria-busy="true">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} style={{ width: `${60 + ((i * 37) % 35)}%` }} />
      ))}
    </div>
  )
}
