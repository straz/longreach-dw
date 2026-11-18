import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { say } from '../../app/Card.tsx'
import { useGateway } from '../../gateway/react.tsx'
import { isMain } from '../../project.ts'
import { useBasePath } from '../shared/routeState.ts'
import { Menu } from '../../ui/Menu.tsx'
import { type Update, discardUpdate, renameUpdate, startUpdate } from '../../updates.ts'
import './updates.css'
import { updatesQuery, useCurrentUpdate, useUpdateChoice, useUpdateDiffPoll, useUpdates } from './useUpdates.ts'

// The update control (tyapi docs/20, §3 and P5): which of the visitor's updates the demo is read and written in.
// A navbar menu: the visitor's updates and their sandbox, each with how many records it changes; a new update,
// named; and for the one open, its changes, Rename and Discard.

const counted = (n: number) => (n === 0 ? 'No changes yet' : n === 1 ? '1 record changed' : `${n} records changed`)

export default function UpdateControl({ me }: { me: string }) {
  const gateway = useGateway()
  const base = useBasePath()
  const queryClient = useQueryClient()
  const { choose, writer } = useUpdateChoice()
  const updates = useUpdates()
  const current = useCurrentUpdate()
  useUpdateDiffPoll(me)
  const [naming, setNaming] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  if (!writer) return null

  const listKey = updatesQuery(gateway).queryKey
  const act = async (what: () => Promise<unknown>) => {
    setBusy(true)
    setProblem(null)
    try {
      await what()
      await queryClient.invalidateQueries({ queryKey: listKey })
    } catch (e) {
      setProblem(say(e))
    } finally {
      setBusy(false)
    }
  }
  // A new update is in the list before it is chosen, so it is never taken for one discarded.
  const begin = (name: string, close: () => void) =>
    act(async () => {
      const made = await startUpdate(gateway, name)
      queryClient.setQueryData<Update[]>(listKey, (old) => [made, ...(old ?? [])])
      setNaming('')
      choose(made.branch)
      close()
    })
  const mine = (updates.data ?? []).filter((u) => u.mine)
  const name = isMain(gateway.branch) ? 'main' : !current || current.sandbox ? 'Sandbox' : current.name
  const face = (
    <>
      <span className="update-dot" aria-hidden="true" />
      <span>
        Working in: <strong>{name}</strong>
        {current && current.changes > 0 && <span className="updates-count"> · {current.changes}</span>}
      </span>
    </>
  )
  return (
    <Menu face={face} label="Your updates">
      {(close) => (
        <>
          <p className="menu-heading">Your updates</p>
          {mine.map((u) => {
            const here = u.branch === gateway.branch
            return (
              <button
                key={u.branch}
                type="button"
                aria-current={here || undefined}
                className={`menu-item${here ? ' is-current' : ''}`}
                onClick={() => {
                  choose(u.sandbox ? null : u.branch)
                  close()
                }}
              >
                <span className="update-dot" aria-hidden="true" />
                <span>
                  <strong>{u.sandbox ? 'Sandbox' : u.name}</strong>
                  <span>{counted(u.changes)}</span>
                </span>
                {here && <span className="menu-current">Open</span>}
              </button>
            )
          })}
          <form
            className="menu-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (naming.trim()) void begin(naming.trim(), close)
            }}
          >
            <input className="menu-input" aria-label="Name a new update" placeholder="New update: name it…" value={naming} onChange={(e) => setNaming(e.target.value)} disabled={busy} />
          </form>
          <p className="menu-note">Each update keeps its changes apart from the others, until it is merged or discarded.</p>
          {!isMain(gateway.branch) && (
            <>
              <div className="menu-sep" aria-hidden="true" />
              <Link className="menu-item is-plain" to={`${base}/update`} onClick={close}>
                See what {current && !current.sandbox ? 'this update' : 'your sandbox'} changes
              </Link>
            </>
          )}
          {isMain(gateway.branch) && <p className="menu-note">You are reading main: a change you make starts an update of its own.</p>}
          {current && !current.sandbox && (
            <>
              {renaming === null ? (
                <button type="button" className="menu-item is-plain" onClick={() => setRenaming(current.name)}>
                  Rename “{current.name}”
                </button>
              ) : (
                <form
                  className="menu-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const named = renaming.trim()
                    if (named) void act(async () => (await renameUpdate(gateway, current.branch, named), setRenaming(null)))
                  }}
                >
                  <input className="menu-input" aria-label="Rename the update" value={renaming} autoFocus onChange={(e) => setRenaming(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)} />
                </form>
              )}
              <button
                type="button"
                className="menu-item is-plain"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(`Discard “${current.name}”? Its ${current.changes === 1 ? 'change is' : `${current.changes} changes are`} deleted.`)) return
                  void act(async () => {
                    await discardUpdate(gateway, current.branch)
                    choose(null)
                    close()
                  })
                }}
              >
                Discard “{current.name}”
              </button>
            </>
          )}
          {problem && (
            <p className="menu-note" role="alert">
              {problem}
            </p>
          )}
        </>
      )}
    </Menu>
  )
}
