import { useEffect, useMemo, useRef, useState } from 'react'
import { SECTIONS, type Section, cardLabel, inSentence, sectionOf, stableOrder } from '../../domain/draft/outline.ts'
import { itemKey, palette } from '../../domain/draft/palette.ts'
import { type Ref, refKey } from '../../domain/draft/questions.ts'
import { askedFields, linksFor, notesOf, prefill, textField } from '../../domain/draft/records.ts'
import { VERBS } from '../../domain/draft/verbs.ts'
import { formatDate } from '../../domain/format.ts'
import { type Fields, type Hit, type Link, createRecord, deleteLink, deleteRecord, putLink, putRecord, search } from '../../entities.ts'
import { useDraftState } from './context.ts'
import { InlineDay, InlineSelect, InlineText } from './Inline.tsx'
import { NESTED, type Unsaved } from './useDraft.ts'

// The draft as an outline (docs/21-new-commitment.md, §2c): the commitment as a sentence with slots, then a
// section per question, each card labelled in plain words with its facet's color beside the label. An empty
// section is one invitation line. Cards keep their places as records are added (stableOrder), and an unsaved
// card stays where it was added until its record replaces it.

const FACET: Record<string, string> = {
  Belief: 'teal', Claim: 'teal', Tripwire: 'teal', Source: 'teal', Question: 'teal',
  Risk: 'amber', Resource: 'amber', Exposure: 'amber',
  Opportunity: 'green', Goal: 'green',
  Mandate: 'red', Contract: 'red',
}
const facetOf = (type: string) => FACET[type] ?? 'blue'

/** A day as the API takes it: its midnight in UTC (tyapi W14). */
const instant = (day: string | null) => (day ? `${day}T00:00Z` : null)

function useFieldSaver() {
  const { project, changes } = useDraftState()
  return (ref: Ref, name: string, value: unknown, previous: unknown) =>
    changes.run(
      () => putRecord(project, { type: ref.type, slug: ref.slug, fields: { [name]: value } }),
      () => ({ what: `Changed the ${name.replaceAll('_', ' ')}`, undo: () => putRecord(project, { type: ref.type, slug: ref.slug, fields: { [name]: previous ?? null } }) }),
    )
}

/** The commitment as a sentence: who commits to what, owed to whom, by when, and who owns it. */
export function Sentence() {
  const { draft, nodes, readOnly, setFocus, addCard, model } = useDraftState()
  const saveField = useFieldSaver()
  const c: Ref = { type: 'Commitment', slug: draft.slug }
  const r = draft.record
  const enumOf = (name: string) => nodes.get('Commitment')?.fields.find((f) => f.name === name)?.values ?? []
  const items = palette(model, 'Commitment', draft.links)
  const add = (key: string) => {
    const item = items.find((i) => itemKey(i) === key)
    if (item) addCard(c, item)
  }
  const parties = (edge: string, direction: string) => draft.links.filter((l) => l.edge === edge && l.direction === direction)
  const owner = parties('OwnedBy', 'out')[0]
  return (
    <section className="draft-sentence facet-blue" tabIndex={-1} onFocus={() => setFocus(c)} aria-label="The commitment">
      <p className="sentence-line">
        <Parties links={parties('Commits', 'in')} parent={c} empty="Who" onAdd={() => add('Commits:in:organization')} /> commits to{' '}
        <InlineText value={r.statement as string} label="What is committed to" placeholder="what, in a sentence" multiline disabled={readOnly} onSave={(v) => saveField(c, 'statement', v, r.statement)} className="sentence-statement" />,
        owed to <Parties links={parties('Owes', 'out')} parent={c} empty="whom" onAdd={() => add('Owes:out:organization')} />,
        by <InlineDay value={r.horizon_at as string | undefined} label="By when" placeholder="when" disabled={readOnly} onSave={(d) => saveField(c, 'horizon_at', instant(d), r.horizon_at)} />.
      </p>
      <p className="sentence-meta">
        <span>
          Owner:{' '}
          {owner ? (
            <Parties links={[owner]} parent={c} empty="" />
          ) : (
            <button type="button" className="gap-mark" onClick={() => add('OwnedBy:out:person')} disabled={readOnly}>
              ◌ needs an owner
            </button>
          )}
        </span>
        <span>
          Scale <InlineSelect value={r.scale as string} values={enumOf('scale')} label="Scale" disabled={readOnly} onSave={(v) => v && saveField(c, 'scale', v, r.scale)} />
        </span>
        <span>
          Undoing it is <InlineSelect value={r.reversibility as string | undefined} values={enumOf('reversibility')} label="How hard it is to undo" empty="not said" disabled={readOnly} onSave={(v) => saveField(c, 'reversibility', v, r.reversibility)} />
        </span>
        <span className="state-word">{String(r.state ?? 'proposed')}</span>
      </p>
      <UnsavedCards focus={c} filter={(u) => inSentence({ edge: u.item.edge, direction: u.item.direction })} />
    </section>
  )
}

function Parties({ links, parent, empty, onAdd }: { links: Link[]; parent: Ref; empty: string; onAdd?: () => void }) {
  const { readOnly } = useDraftState()
  const unlink = useUnlink()
  return (
    <span className="parties">
      {links.map((l) => (
        <span key={l.slug} className="party-chip" title={`Party: ${l.slug}`}>
          {l.text ?? l.slug}
          {!readOnly && (
            <button type="button" className="chip-x" aria-label={`Unlink ${l.text ?? l.slug}`} onClick={() => unlink(parent, l)}>
              ×
            </button>
          )}
        </span>
      ))}
      {onAdd && (links.length === 0 || !readOnly) && (
        <button type="button" className={links.length ? 'slot-add' : 'slot-empty'} onClick={onAdd} disabled={readOnly} aria-label={links.length ? 'Add another' : `Add ${empty}`}>
          {links.length ? '＋' : empty}
        </button>
      )}
    </span>
  )
}

/** Take a link off a card: unlink it, or, for a record that cannot stand without that link (a risk without its
 *  commitment), delete the record. Either is undone by putting it back. */
function useUnlink() {
  const { project, changes, nodes, recordOf } = useDraftState()
  return (parent: Ref, l: Link) => {
    const [from, to] = l.direction === 'out' ? [parent.slug, l.slug] : [l.slug, parent.slug]
    const needs = l.direction === 'in' && nodes.get(l.type)?.required_links.includes(l.edge)
    if (needs) {
      const record = recordOf({ type: l.type, slug: l.slug }) ?? {}
      const { slug: _slug, ...fields } = record
      return changes.run(
        () => deleteRecord(project, { type: l.type, slug: l.slug }),
        () => ({ what: `Removed ${l.text ?? l.slug}`, undo: () => putRecord(project, { type: l.type, slug: l.slug, fields, links: [{ edge: l.edge, to: parent.slug }] }) }),
      )
    }
    return changes.run(
      () => deleteLink(project, { edge: l.edge, from, to }),
      () => ({ what: `Unlinked ${l.text ?? l.slug}`, undo: () => putLink(project, { edge: l.edge, from, to, fields: l.fields }) }),
    )
  }
}

export function Sections() {
  const { draft } = useDraftState()
  return (
    <>
      {SECTIONS.map((s) => (
        <SectionView key={s.id} section={s} links={draft.links.filter((l) => sectionOf(l) === s.id)} />
      ))}
    </>
  )
}

/** Keys in the order first seen, kept across renders. */
function useStable(keys: string[]): string[] {
  const order = useRef<string[]>([])
  order.current = stableOrder(order.current, keys)
  return order.current
}

function SectionView({ section, links }: { section: Section; links: Link[] }) {
  const { draft, model, addCard, unsaved, readOnly } = useDraftState()
  const c: Ref = { type: 'Commitment', slug: draft.slug }
  const pending = unsaved.cards.filter((u) => u.focus.slug === draft.slug && u.focus.type === 'Commitment' && sectionOf({ edge: u.item.edge, direction: u.item.direction }) === section.id)
  const byKey = new Map(links.map((l) => [`${l.edge}/${l.slug}`, l]))
  const order = useStable([...byKey.keys()])
  const [open, setOpen] = useState(section.id !== 'authority')
  const invite = () => {
    const item = palette(model, 'Commitment', draft.links).find((i) => itemKey(i) === section.add)
    if (item) addCard(c, item)
  }
  if (!links.length && !pending.length) {
    return (
      <section className={`draft-section is-empty facet-${section.facet}`} aria-label={section.title}>
        <button type="button" className="invite" onClick={invite} disabled={readOnly}>
          <span className="invite-title">{section.title}</span>
          <span className="invite-text">{section.invite}</span>
          <span className="invite-plus" aria-hidden="true">
            ＋
          </span>
        </button>
      </section>
    )
  }
  return (
    <section className={`draft-section facet-${section.facet}`} aria-label={section.title}>
      <h2 className="section-head">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {section.title} <span className="section-count">· {links.length}</span>
        </button>
        {!readOnly && (
          <button type="button" className="section-add" onClick={invite} aria-label={`Add to ${section.title}`}>
            ＋
          </button>
        )}
      </h2>
      {open && (
        <div className="section-cards">
          {order.map((k) => (
            <RecordCard key={k} link={byKey.get(k)!} parent={c} />
          ))}
          {pending.map((u) => (
            <UnsavedCard key={u.id} card={u} />
          ))}
        </div>
      )}
    </section>
  )
}

function RecordCard({ link, parent }: { link: Link; parent: Ref }) {
  const { draft, nodes, setFocus, openPalette, readOnly, editing, setEditing } = useDraftState()
  const saveField = useFieldSaver()
  const unlink = useUnlink()
  const ref: Ref = { type: link.type, slug: link.slug }
  const node = nodes.get(link.type)
  const around = draft.around[refKey(ref)]
  const record = around?.record
  const label = cardLabel(link.type, link.kind, link.edge)
  const text = node ? textField(node) : 'statement'
  const kinds = node?.fields.find((f) => f.name === 'kind')?.values ?? []
  const shared = link.type === 'Belief' ? (around?.links ?? []).filter((l) => l.edge === 'RestsOn' && l.direction === 'in' && l.slug !== draft.slug).length : 0
  const nested = (around?.links ?? []).filter((l) => !(l.type === 'Commitment' && l.slug === draft.slug) && l.edge !== 'ClaimFrom' && !(link.type === 'Belief' && l.edge === 'RestsOn' && l.direction === 'in'))
  const falsifierId = `${refKey(ref)}:falsifier`
  return (
    <div className={`record-card facet-${facetOf(link.type)}`} id={`card-${refKey(ref)}`} tabIndex={0} onFocus={(e) => e.target === e.currentTarget && setFocus(ref)} onClick={() => setFocus(ref)}>
      <div className="card-top">
        <span className="card-label" title={`${link.type} · ${VERBS[link.edge]?.[link.direction === 'out' ? 'out' : 'in'] ?? link.edge}`}>
          {label}
        </span>
        {shared > 0 && <span className="cross-badge">also underpins {shared} other {shared === 1 ? 'commitment' : 'commitments'}</span>}
        <span className="card-tools">
          {!readOnly && kinds.length > 0 && link.type !== 'Party' && record && (
            <InlineSelect value={(record.kind as string) ?? link.kind ?? undefined} values={kinds} label={`${label}: kind`} onSave={(v) => v && saveField(ref, 'kind', v, record.kind)} />
          )}
          {!readOnly && NESTED.has(link.type) && (
            <button type="button" className="btn-quiet is-small" onClick={(e) => (e.stopPropagation(), openPalette(ref))} aria-label={`Add to ${link.text ?? link.slug}`}>
              ＋ Add
            </button>
          )}
          {!readOnly && (
            <button type="button" className="btn-quiet is-small" onClick={(e) => (e.stopPropagation(), unlink(parent, link))}>
              {link.direction === 'in' && node?.required_links.includes(link.edge) ? 'Remove' : 'Unlink'}
            </button>
          )}
        </span>
      </div>
      <InlineText value={link.text ?? undefined} label={`${label} text`} placeholder={`${label}, in a sentence`} multiline disabled={readOnly} onSave={(v) => saveField(ref, text, v, link.text)} className="card-text" />
      {link.type === 'Belief' && record && (
        <div className="card-line">
          {record.falsifier || editing === falsifierId ? (
            <>
              <span className="line-verb">wrong if</span>
              <InlineText
                value={record.falsifier as string | undefined}
                label="What would tell you it is wrong"
                placeholder="what would tell you it is wrong"
                open={editing === falsifierId}
                onOpen={() => setEditing(falsifierId)}
                onClose={() => setEditing(null)}
                disabled={readOnly}
                onSave={(v) => saveField(ref, 'falsifier', v || null, record.falsifier)}
              />
            </>
          ) : (
            <button type="button" className="gap-mark" disabled={readOnly} onClick={() => setEditing(falsifierId)}>
              ◌ falsifier: needs one
            </button>
          )}
        </div>
      )}
      {nested.map((l) => (
        <div key={`${l.edge}/${l.direction}/${l.slug}`} className={`card-line facet-${facetOf(l.type)}`}>
          <span className="line-verb">{VERBS[l.edge]?.[l.direction === 'out' ? 'out' : 'in'] ?? l.edge}</span>
          <span className="line-label">{cardLabel(l.type, l.kind, l.edge)}</span>
          <span className="line-text">{l.text ?? l.slug}</span>
          {!readOnly && (
            <button type="button" className="chip-x" aria-label={`Unlink ${l.text ?? l.slug}`} onClick={() => unlink(ref, l)}>
              ×
            </button>
          )}
        </div>
      ))}
      <UnsavedCards focus={ref} />
    </div>
  )
}

function UnsavedCards({ focus, filter = () => true }: { focus: Ref; filter?: (u: Unsaved) => boolean }) {
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
function UnsavedCard({ card }: { card: Unsaved }) {
  const { draft, nodes, project, changes, unsaved, today, persona, linksOf, recordOf, readOnly } = useDraftState()
  const node = nodes.get(card.item.type)
  const asked = node ? askedFields(node, card.item) : []
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
      const made = await changes.run(() =>
        putRecord(project, { type: 'Source', slug: notes, fields: { kind: 'other', title: `Notes by ${persona}, ${formatDate(today, { long: true })}` }, links: [{ edge: 'RecordedIn', from: draft.slug }] }),
      )
      if (!made) return
    }
    const sent: Fields = { [textField(node)]: card.text.trim(), ...(card.item.kind ? { kind: card.item.kind } : {}) }
    for (const f of asked) sent[f.name] = f.type === 'DateTime' ? instant(String(fields[f.name])) : f.type === 'I32' || f.type === 'F64' ? Number(fields[f.name]) : fields[f.name]
    const made = await changes.run(
      () => createRecord(project, { type: node.name, fields: sent, links: linksFor(card.item, card.focus, draft.slug, notes) }),
      (r) => ({ what: `Added ${label.toLowerCase()} “${card.text.trim().slice(0, 40)}”`, undo: () => deleteRecord(project, { type: r.type, slug: r.slug }) }),
    )
    if (made) unsaved.remove(card.id)
  }
  const linkInstead = async (hit: Hit) => {
    const [from, to] = card.item.direction === 'out' ? [card.focus.slug, hit.slug] : [hit.slug, card.focus.slug]
    const made = await changes.run(
      () => putLink(project, { edge: card.item.edge, from, to }),
      () => ({ what: `Linked “${hit.text.slice(0, 40)}”`, undo: () => deleteLink(project, { edge: card.item.edge, from, to }) }),
    )
    if (made) unsaved.remove(card.id)
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
        <button type="button" className="btn-action is-small" onClick={() => void save()} disabled={!ready || changes.busy || readOnly}>
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
      search(project, { text: words, types: [type], branch: (project as { branch?: string }).branch, limit: 3 })
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
