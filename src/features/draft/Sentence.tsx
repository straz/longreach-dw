import { inSentence } from '../../domain/draft/outline.ts'
import type { Ref } from '../../domain/record.ts'
import type { Link } from '../../entities.ts'
import { toApi } from '../../wire.ts'
import { useDraftState } from './context.ts'
import { InlineDay, InlineSelect, InlineText } from './Inline.tsx'
import { UnsavedCards } from './UnsavedCard.tsx'
import { useFieldSaver, useUnlink } from './useDraftWrites.ts'

// The commitment as a sentence with slots (docs/21-new-commitment.md, §2c): who commits to what, owed to whom, by
// when, who owns it, its scale and how hard it is to undo.

/** The commitment as a sentence: who commits to what, owed to whom, by when, and who owns it. */
export function Sentence() {
  const { draft, nodes, readOnly, setFocus, addByKey } = useDraftState()
  const saveField = useFieldSaver()
  const c: Ref = { type: 'Commitment', slug: draft.slug }
  const r = draft.record
  const enumOf = (name: string) => nodes.get('Commitment')?.fields.find((f) => f.name === name)?.values ?? []
  const add = (key: string) => addByKey(c, key)
  const parties = (edge: string, direction: string) => draft.links.filter((l) => l.edge === edge && l.direction === direction)
  const owner = parties('OwnedBy', 'out')[0]
  return (
    <section className="draft-sentence facet-blue" tabIndex={-1} onFocus={() => setFocus(c)} aria-label="The commitment">
      <p className="sentence-line">
        <Parties links={parties('Commits', 'in')} parent={c} empty="Who" onAdd={() => add('Commits:in:organization')} /> commits to{' '}
        <InlineText value={r.statement as string} label="What is committed to" placeholder="what, in a sentence" multiline disabled={readOnly} onSave={(v) => saveField(c, 'statement', v, r.statement)} className="sentence-statement" />,
        owed to <Parties links={parties('Owes', 'out')} parent={c} empty="whom" onAdd={() => add('Owes:out:organization')} />,
        by <InlineDay value={r.horizon_at as string | undefined} label="By when" placeholder="when" disabled={readOnly} onSave={(d) => saveField(c, 'horizon_at', toApi(d), r.horizon_at)} />.
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
