import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { say } from '../../app/Card.tsx'
import { textOf } from '../../domain/record.ts'
import { useGateway } from '../../gateway/react.tsx'
import { useBasePath } from '../shared/routeState.ts'
import { type Change, mergeUpdate } from '../../updates.ts'
import Conflicts from './Conflicts.tsx'
import { useCurrentUpdate, useReadiness, useUpdateChoice, useUpdateDiff } from './useUpdates.ts'

// Merge… (tyapi docs/20, §3, P16; docs/21-new-commitment.md, §2d): the readiness list, in words, then Merge. Each
// reason it cannot merge yet is listed; conflicts are resolved by taking main's version, then the update's own
// changes (Conflicts.tsx); a policy shows what breaks it. Merge is turned off, with its reasons, until the update is ready; after it, the
// page says what main now holds (N20).

export type Merged = { name: string; records: number; links: number; assumptions: number; stopRules: number; commitment?: string }

/** What a merge brought into main, from the update's changes just before it. */
export function mergedSummary(name: string, changes: Change[]): Merged {
  const added = (type: string) => changes.filter((c) => c.kind === 'node' && c.type === type && c.op === 'added')
  return {
    name,
    records: changes.filter((c) => c.kind === 'node').length,
    links: changes.filter((c) => c.kind === 'edge').length,
    assumptions: added('Belief').length,
    stopRules: added('Tripwire').length,
    commitment: added('Commitment')[0]?.id,
  }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export default function MergePanel({ onMerged }: { onMerged: (m: Merged) => void }) {
  const gateway = useGateway()
  const base = useBasePath()
  const queryClient = useQueryClient()
  const { choose } = useUpdateChoice()
  const update = useCurrentUpdate()
  const readiness = useReadiness()
  const diff = useUpdateDiff()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const found = readiness.data

  const act = async (what: () => Promise<unknown>) => {
    setBusy(true)
    setProblem(null)
    try {
      await what()
    } catch (e) {
      setProblem(say(e))
    } finally {
      setBusy(false)
    }
  }
  const merge = () =>
    act(async () => {
      const summary = mergedSummary(update?.name ?? gateway.branch, diff.data?.changes ?? [])
      await mergeUpdate(gateway, gateway.branch)
      choose(null)
      await queryClient.invalidateQueries({ queryKey: [gateway.graph] })
      onMerged(summary)
    })

  return (
    <section className="merge-panel" aria-label="Merge into main">
      <h2 className="update-group">Merge into main</h2>
      {readiness.error && <p role="alert">Could not check whether it merges: {say(readiness.error)}</p>}
      {!found && !readiness.error && <p className="update-lede">Checking whether it merges…</p>}
      {found && (
        <>
          <ul className="merge-list">
            {found.reasons.map((r) => (
              <li key={r} className="is-blocking">
                <span aria-hidden="true">✗</span> {r}
              </li>
            ))}
            {found.conflicts.length === 0 && (
              <li className="is-done">
                <span aria-hidden="true">✓</span> No conflicts with main
              </li>
            )}
            {found.policies
              .filter((p) => p.severity !== 'error')
              .map((p) => (
                <li key={p.policy} className="is-warning" title={p.statement}>
                  <span aria-hidden="true">!</span> {p.name} ({plural(p.rows.length, 'record')}; won’t block)
                </li>
              ))}
          </ul>
          {found.conflicts.length > 0 && (
            <Conflicts key={found.conflicts.map((c) => `${c.kind}:${c.type}:${c.id}`).join()} conflicts={found.conflicts} mine={update?.mine ?? false} />
          )}
          {found.policies
            .filter((p) => p.severity === 'error')
            .map((p) => (
              <div key={p.policy} className="merge-policy">
                <p>
                  <strong>{p.name}</strong>: {p.statement}
                </p>
                <ul>
                  {p.rows.slice(0, 5).map((row) => (
                    <li key={JSON.stringify(row)} className="update-field">
                      {textOf(row) ?? Object.values(row).join(', ')}
                      {typeof row.commitment === 'string' && (
                        <>
                          {' · '}
                          <Link to={`${base}/draft/${row.commitment}`}>Open the draft</Link>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          <div className="merge-actions">
            <button type="button" className="btn-action" disabled={!found.ready || busy} title={found.ready ? undefined : found.reasons.join('; ')} onClick={() => void merge()}>
              {busy ? 'Merging…' : 'Merge'}
            </button>
            {problem && (
              <span role="alert" className="update-field">
                {problem}
              </span>
            )}
          </div>
        </>
      )}
    </section>
  )
}

/** After a merge: what main now holds from it (N20). */
export function MergedNote({ merged }: { merged: Merged }) {
  const base = useBasePath()
  const watched = [merged.assumptions && plural(merged.assumptions, 'new assumption'), merged.stopRules && plural(merged.stopRules, 'stop rule')].filter(Boolean)
  return (
    <div className="merged-note" role="status">
      <p>
        <strong>{merged.name}</strong> is in main: {plural(merged.records, 'record')} and {plural(merged.links, 'link')}.
      </p>
      {watched.length > 0 && <p>Main now has {watched.join(' and ')} to watch.</p>}
      {merged.commitment && <Link to={`${base}/commitment/${merged.commitment}`}>See it in Commitments</Link>}
    </div>
  )
}
