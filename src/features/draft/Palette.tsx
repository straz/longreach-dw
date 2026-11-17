import { useEffect, useMemo, useRef, useState } from 'react'
import { cardLabel } from '../../domain/draft/outline.ts'
import { type Item, itemKey, palette } from '../../domain/draft/palette.ts'
import type { Ref } from '../../domain/draft/questions.ts'
import { VERBS } from '../../domain/draft/verbs.ts'
import { type Hit, deleteLink, putLink, search } from '../../entities.ts'
import { useDraftState } from './context.ts'

// The Add palette (docs/21-new-commitment.md, §3; ＋, / or ⌘K): what can be added from the focused card, as
// verbs, and Link to…, a search of the graph filtered to what that card can link to. Arrow keys move, Enter
// chooses, Escape closes.

export default function Palette({ focus, onClose }: { focus: Ref; onClose: () => void }) {
  const { model, project, changes, addCard, linksOf, draft } = useDraftState()
  const items = useMemo(() => palette(model, focus.type, linksOf(focus)), [model, focus, linksOf])
  const [mode, setMode] = useState<'add' | 'link'>('add')
  const [filter, setFilter] = useState('')
  const [active, setActive] = useState(0)
  const [hits, setHits] = useState<Hit[]>([])
  const [choosing, setChoosing] = useState<Hit | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [mode])

  const shown = items.filter((i) => i.label.toLowerCase().includes(filter.toLowerCase()))
  const rows = mode === 'add' ? [...shown.map((i) => ({ key: itemKey(i), item: i })), { key: 'link', item: undefined }] : []
  const linkable = [...new Set(items.filter((i) => !i.full).map((i) => i.type))]

  useEffect(() => {
    if (mode !== 'link') return
    const words = filter.trim()
    if (words.length < 2) {
      setHits([])
      return
    }
    let live = true
    const types = linkable.filter((t) => model.nodes.find((n) => n.name === t)?.searchable_by)
    const timer = setTimeout(() => {
      search(project, { text: words, types, branch: (project as { branch?: string }).branch, limit: 10 })
        .then((found) => live && setHits(found.hits.filter((h) => !(h.type === focus.type && h.slug === focus.slug))))
        .catch(() => live && setHits([]))
    }, 250)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [mode, filter])

  const choose = (item: Item | undefined) => {
    if (!item) {
      setMode('link')
      setFilter('')
      setActive(0)
      return
    }
    if (item.full) return
    addCard(focus, item)
    onClose()
  }
  const link = async (item: Item, hit: Hit) => {
    const [from, to] = item.direction === 'out' ? [focus.slug, hit.slug] : [hit.slug, focus.slug]
    const made = await changes.run(
      () => putLink(project, { edge: item.edge, from, to }),
      () => ({ what: `Linked “${hit.text.slice(0, 40)}”`, undo: () => deleteLink(project, { edge: item.edge, from, to }) }),
    )
    if (made) onClose()
  }
  const pick = (hit: Hit) => {
    const ways = items.filter((i) => i.type === hit.type && !i.full)
    // One way to link it: link it. Several (an assumption, a prediction…): the verbs differ only by kind, so
    // the edges decide; ask when there is more than one edge.
    const edges = [...new Map(ways.map((w) => [`${w.edge}:${w.direction}`, w])).values()]
    if (edges.length === 1) void link(edges[0], hit)
    else setChoosing(hit)
  }
  const count = mode === 'add' ? rows.length : hits.length
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (choosing) setChoosing(null)
      else if (mode === 'link') setMode('add')
      else onClose()
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, count - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (mode === 'add') choose(rows[active]?.item)
      else if (hits[active]) pick(hits[active])
    }
  }
  const focusText = focus.type === 'Commitment' && focus.slug === draft.slug ? 'the commitment' : (linksOf({ type: 'Commitment', slug: draft.slug }).find((l) => l.slug === focus.slug)?.text ?? focus.slug)
  return (
    <div className="palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={`Add to ${focusText}`} onKeyDown={onKey}>
        <div className="palette-head">
          <span className="palette-on">{mode === 'add' ? 'Add to' : 'Link to'} {focusText}</span>
          <input
            ref={input}
            className="palette-input"
            aria-label={mode === 'add' ? 'Filter what to add' : 'Search the graph'}
            placeholder={mode === 'add' ? 'Type to filter…' : `Search ${linkable.join(', ').toLowerCase()}…`}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setActive(0)
              setChoosing(null)
            }}
          />
        </div>
        {choosing ? (
          <ul className="palette-list" role="listbox" aria-label={`How ${choosing.text} relates`}>
            {items
              .filter((i) => i.type === choosing.type && !i.full)
              .filter((i, n, all) => all.findIndex((o) => o.edge === i.edge && o.direction === i.direction) === n)
              .map((i) => (
                <li key={itemKey(i)}>
                  <button type="button" className="palette-item" onClick={() => void link(i, choosing)}>
                    <strong>
                      {VERBS[i.edge]?.[i.direction]} “{choosing.text.slice(0, 60)}”
                    </strong>
                  </button>
                </li>
              ))}
          </ul>
        ) : mode === 'add' ? (
          <ul className="palette-list" role="listbox" aria-label="What to add">
            {rows.map((r, n) => (
              <li key={r.key} role="option" aria-selected={n === active} aria-disabled={r.item?.full || undefined}>
                <button type="button" className={`palette-item ${n === active ? 'is-active' : ''}`} onMouseEnter={() => setActive(n)} onClick={() => choose(r.item)} disabled={r.item?.full}>
                  {r.item ? (
                    <>
                      <strong>{r.item.label}</strong>
                      <span className="palette-help">
                        {cardLabel(r.item.type, r.item.kind, r.item.edge)}
                        {r.item.full ? ' · it has one already' : r.item.help ? ` · ${r.item.help}` : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>Link to an existing record…</strong>
                      <span className="palette-help">Search the graph for a record this can link to</span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="palette-list" role="listbox" aria-label="Records found">
            {filter.trim().length < 2 && <li className="palette-note">Type a few words of its title, name or statement.</li>}
            {filter.trim().length >= 2 && hits.length === 0 && <li className="palette-note">Nothing like that yet.</li>}
            {hits.map((h, n) => (
              <li key={`${h.type}/${h.slug}`} role="option" aria-selected={n === active}>
                <button type="button" className={`palette-item ${n === active ? 'is-active' : ''}`} onMouseEnter={() => setActive(n)} onClick={() => pick(h)}>
                  <strong>{h.text}</strong>
                  <span className="palette-help">{cardLabel(h.type)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="palette-foot">↑↓ to move · Enter to choose · Esc to {mode === 'link' ? 'go back' : 'close'}</p>
      </div>
    </div>
  )
}
