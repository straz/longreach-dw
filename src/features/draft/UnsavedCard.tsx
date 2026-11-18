import { useEffect, useMemo, useRef, useState } from 'react'
import { cardLabel, facetOf } from '../../domain/draft/outline.ts'
import { askedFields, linksFor, notesOf, prefill, textField } from '../../domain/draft/records.ts'
import type { Ref } from '../../domain/record.ts'
import { formatDate } from '../../domain/format.ts'
import { type Fields, type Hit, type Link, createRecord, deleteRecord, putRecord, search } from '../../entities.ts'
import { toApi } from '../../wire.ts'
import { useDraftState } from './context.ts'
import type { Unsaved } from './useDraft.ts'
import { useLinkExisting } from './useDraftWrites.ts'

// Cards being written (N7, unsaved): kept in the browser until saved, with records like them offered for linking
// instead.

export function UnsavedCards({ focus, filter = () => true }: { focus: Ref; filter?: (u: Unsaved) => boolean }) {
  const { unsaved } = useDraftState()
  const cards = unsaved.cards.filter((u) => u.focus.type === focus.type && u.focus.slug === focus.slug && filter(u))
  return (
    <>
      {cards.map((u) => (
        <UnsavedCard key={u.id} card={u} />
      ))}
    </>
  )
}

/** A card being written: its text and the few fields nothing else gives, with records like it already in the
 *  graph offered for linking instead (§3, before duplicating). Kept in the browser until it is saved. */
export function UnsavedCard({ card }: { card: Unsaved }) {
  const { draft, nodes, project, writes, unsaved, today, who, linksOf, recordOf, readOnly } = useDraftState()
  const linkExisting = useLinkExisting()
  const node = nodes.get(card.item.type)
  const asked = useMemo(() => (node ? askedFields(node, card.item) : []), [node, card.item])
  const label = cardLabel(card.item.type, card.item.kind, card.item.edge)
  const focusRecord = recordOf(card.focus)
  const fields: Fields = useMemo(() => {
    const out: Fields = {}
    for (const f of asked) out[f.name] = card.fields[f.name] ?? prefill(f.name, f.type, focusRecord, today)
    return out
  }, [asked, card.fields, focusRecord, today])
  const similar = useSimilar(card.item.type, card.text, linksOf(card.focus))
  const ready = card.text.trim() !== '' && asked.every((f) => fields[f.name] !== undefined && fields[f.name] !== '')
  const area = useRef<HTMLTextAreaElement>(null)
  useEffect(() => area.current?.focus(), [])

  const save = async () => {
    if (!node || !ready) return
    const notes = notesOf(draft.slug)
    if (card.item.type === 'Claim' && !draft.links.some((l) => l.edge === 'RecordedIn' && l.slug === notes)) {
      const made = await writes.run(() =>
        putRecord(project, { type: 'Source', slug: notes, fields: { kind: 'other', title: `Notes by ${who}, ${formatDate(today, { long: true })}` }, links: [{ edge: 'RecordedIn', from: draft.slug }] }),
      )
      if (!made) return
    }
    const sent: Fields = { [textField(node)]: card.text.trim(), ...(card.item.kind ? { kind: card.item.kind } : {}) }
    for (const f of asked) sent[f.name] = f.type === 'DateTime' ? toApi(String(fields[f.name])) : f.type === 'I32' || f.type === 'F64' ? Number(fields[f.name]) : fields[f.name]
    const made = await writes.run(
      () => createRecord(project, { type: node.name, fields: sent, links: linksFor(card.item, card.focus, draft.slug, notes) }),
      (r) => ({ what: `Added ${label.toLowerCase()} “${card.text.trim().slice(0, 40)}”`, undo: () => deleteRecord(project, { type: r.type, slug: r.slug }) }),
    )
    if (made) unsaved.remove(card.id)
  }
  const linkInstead = async (hit: Hit) => {
    if (await linkExisting(card.focus, card.item.edge, card.item.direction, hit)) unsaved.remove(card.id)
  }
  return (
    <div className={`record-card is-unsaved facet-${facetOf(card.item.type)}`} id={`unsaved-${card.id}`}>
      <div className="card-top">
        <span className="card-label" title={card.item.type}>
          {label}
        </span>
        <span className="unsaved-mark">unsaved</span>
      </div>
      <textarea
        ref={area}
        className="inline-input card-text"
        rows={2}
        aria-label={card.item.label.replace('…', '')}
        placeholder={card.item.label.replace('…', '')}
        value={card.text}
        onChange={(e) => unsaved.update(card.id, { text: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void save()
          }
          if (e.key === 'Escape' && !card.text.trim()) unsaved.remove(card.id)
        }}
      />
      {asked.length > 0 && (
        <div
          className="asked"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void save()
            }
          }}
        >
          {asked.map((f) => (
            <label key={f.name} className="asked-field">
              <span>{f.name.replaceAll('_', ' ')}</span>
              {f.values ? (
                <select value={String(fields[f.name] ?? '')} onChange={(e) => unsaved.update(card.id, { fields: { ...card.fields, [f.name]: e.target.value } })}>
                  <option value="">choose</option>
                  {f.values.map((v) => (
                    <option key={v} value={v}>
                      {v.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              ) : f.type === 'DateTime' || f.type === 'Date' ? (
                <input type="date" value={String(fields[f.name] ?? '').slice(0, 10)} onChange={(e) => unsaved.update(card.id, { fields: { ...card.fields, [f.name]: e.target.value } })} />
              ) : f.type === 'I32' || f.type === 'F64' ? (
                <input
                  type="number"
                  min={f.range?.[0]}
                  max={f.range?.[1]}
                  value={String(fields[f.name] ?? '')}
                  onChange={(e) => unsaved.update(card.id, { fields: { ...card.fields, [f.name]: e.target.value } })}
                />
              ) : (
                <input value={String(fields[f.name] ?? '')} onChange={(e) => unsaved.update(card.id, { fields: { ...card.fields, [f.name]: e.target.value } })} />
              )}
            </label>
          ))}
        </div>
      )}
      {similar.length > 0 && (
        <div className="similar" role="status">
          <span>Already in the graph:</span>
          {similar.map((h) => (
            <button key={h.slug} type="button" className="btn-link" onClick={() => void linkInstead(h)} disabled={readOnly}>
              {h.text} — link it instead
            </button>
          ))}
        </div>
      )}
      <div className="card-actions">
        <button type="button" className="btn-action is-small" onClick={() => void save()} disabled={!ready || writes.busy || readOnly}>
          Save
        </button>
        <button type="button" className="btn-quiet is-small" onClick={() => unsaved.remove(card.id)}>
          Discard
        </button>
        <span className="card-hint">Enter saves · Shift+Enter for a new line</span>
      </div>
    </div>
  )
}

/** Records of a type whose text is like what is being typed, not already linked to the card: candidates only. */
function useSimilar(type: string, text: string, linked: Link[]): Hit[] {
  const { project, nodes } = useDraftState()
  const [hits, setHits] = useState<Hit[]>([])
  const searchable = !!nodes.get(type)?.searchable_by
  useEffect(() => {
    const words = text.trim()
    if (!searchable || words.length < 4) {
      setHits([])
      return
    }
    let live = true
    const timer = setTimeout(() => {
      search(project, { text: words, types: [type], limit: 3 })
        .then((found) => live && setHits(found.hits.filter((h) => !linked.some((l) => l.slug === h.slug))))
        .catch(() => live && setHits([]))
    }, 350)
    return () => {
      live = false
      clearTimeout(timer)
    }
    // `linked` is read when the answer comes, so a new link does not search again.
  }, [text, type, searchable, project])
  return hits
}
