import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, Problem, say } from '../../app/Card.tsx'
import { useSession } from '../../app/session.ts'
import { useGateway } from '../../gateway/react.tsx'
import { formatValue, plural } from '../../domain/format.ts'
import { textOf } from '../../domain/record.ts'
import { isMain } from '../../project.ts'
import { type Change, changeId, revertRecords, reviewChanges } from '../../updates.ts'
import MergePanel, { type Merged, MergedNote } from './MergePanel.tsx'
import { useCurrentUpdate, useUpdateDiff } from './useUpdates.ts'
import './updates.css'

// The update view (tyapi docs/20, §3): every record the open update adds, changes or removes against main, what
// changed in it, who wrote it, and Put back, which writes the record as it was where the update started (its
// author only). A change an assistant wrote says so, and waits for its author's review before the update merges
// (tyapi P14, P16): Reviewed, one by one or all at once. Kept current by the navbar's poll. Below the changes,
// Merge into main (MergePanel).

const OP = { added: 'Added', changed: 'Changed', removed: 'Removed', unchanged: 'Unchanged' } as const
/** A change's words: a link's ends, or the record's text, else its key. */
const words = (c: Change) => (c.kind === 'edge' ? `${c.from} → ${c.to}` : (textOf((c.after ?? c.before ?? {}) as Record<string, unknown>) ?? c.id))

/** The fields a change altered, each with its value before and after. */
function altered(c: Change): [string, unknown, unknown][] {
  if (c.op !== 'changed' || !c.before || !c.after) return []
  const before = c.before as Record<string, unknown>
  const after = c.after as Record<string, unknown>
  return Object.keys({ ...before, ...after })
    .filter((k) => JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null))
    .map((k) => [k, before[k], after[k]])
}

export default function UpdatePage() {
  const gateway = useGateway()
  const queryClient = useQueryClient()
  const { me } = useSession()
  const update = useCurrentUpdate()
  const changes = useUpdateDiff()
  const [busy, setBusy] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [merged, setMerged] = useState<Merged | null>(null)

  if (merged) {
    return (
      <section className="update-page" aria-label="The update's changes">
        <MergedNote merged={merged} />
      </section>
    )
  }
  if (isMain(gateway.branch)) return <Card lede="You are reading main: there are no changes of yours here." />
  if (changes.error) return <Problem what="read the update's changes" error={changes.error} onRetry={() => void changes.refetch()} />
  if (!changes.data) return <Card lede="Reading the update's changes…" />

  const act = async (id: string, what: () => Promise<unknown>) => {
    setBusy(id)
    setProblem(null)
    try {
      await what()
      await queryClient.invalidateQueries({ queryKey: [gateway.graph] })
    } catch (e) {
      setProblem(say(e))
    } finally {
      setBusy(null)
    }
  }
  const ref = (c: Change) => ({ kind: c.kind, type: c.type, id: c.id })
  const putBack = (c: Change) => act(changeId(c), () => revertRecords(gateway, gateway.branch, [ref(c)]))
  const review = (c: Change) => act(`review:${changeId(c)}`, () => reviewChanges(gateway, gateway.branch, [ref(c)]))
  const reviewAll = () => act('review:all', () => reviewChanges(gateway, gateway.branch, [], true))
  const unreviewed = changes.data.changes.filter((c) => c.ai && !c.reviewed)
  const mine = update?.mine !== false
  const nodes = changes.data.changes.filter((c) => c.kind === 'node')
  const links = changes.data.changes.filter((c) => c.kind === 'edge')
  const title = !update || update.sandbox ? 'Your sandbox' : update.name
  const row = (c: Change) => (
    <li key={changeId(c)} className="update-row">
      <span className={`update-op is-${c.op}`}>{OP[c.op]}</span>
      <span className="update-what">
        <span className="update-type">{c.type}</span>
        <span>{words(c)}</span>
        {altered(c).map(([field, was, now]) => (
          <span key={field} className="update-field">
            {field}: <del>{formatValue(was)}</del> → {formatValue(now)}
          </span>
        ))}
        <span className="update-who">
          {c.ai ? `by ${c.ai}, for you` : `by ${c.written_by.map((w) => (w === me.principal_id ? 'you' : 'another writer')).join(', ')}`}
          {c.ai && (c.reviewed ? ' · reviewed' : <strong className="update-unreviewed"> · not reviewed</strong>)}
        </span>
      </span>
      {mine && (
        <span className="update-actions">
          {c.ai && !c.reviewed && (
            <button type="button" className="btn-line is-small" disabled={busy !== null} onClick={() => void review(c)}>
              Reviewed
            </button>
          )}
          <button type="button" className="btn-quiet is-small" disabled={busy !== null} onClick={() => void putBack(c)}>
            {busy === changeId(c) ? 'Putting back…' : 'Put back'}
          </button>
        </span>
      )}
    </li>
  )
  return (
    <section className="update-page" aria-label="The update's changes">
      <h1>{title}</h1>
      <p className="update-lede">
        {changes.data.changes.length === 0
          ? 'No changes yet: main and this update are the same.'
          : `${nodes.length} ${nodes.length === 1 ? 'record' : 'records'} and ${links.length} ${links.length === 1 ? 'link' : 'links'} differ from main.`}
      </p>
      {unreviewed.length > 0 && (
        <p className="update-review-all">
          {plural(unreviewed.length, 'change')} by {[...new Set(unreviewed.map((c) => c.ai))].join(', ')} not reviewed yet: read each, then mark it reviewed or put it back.
          {mine && (
            <button type="button" className="btn-line is-small" disabled={busy !== null} onClick={() => void reviewAll()}>
              Mark all reviewed
            </button>
          )}
        </p>
      )}
      {problem && (
        <p role="alert" className="update-lede">
          That did not work: {problem}
        </p>
      )}
      {nodes.length > 0 && <ul className="update-list">{nodes.map(row)}</ul>}
      {links.length > 0 && (
        <>
          <h2 className="update-group">Links</h2>
          <ul className="update-list">{links.map(row)}</ul>
        </>
      )}
      {update && !update.sandbox && <MergePanel onMerged={setMerged} />}
    </section>
  )
}
