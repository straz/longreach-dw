import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useGateway } from '../../gateway/react.tsx'
import { MAIN, type Project, isMain } from '../../project.ts'
import { readStored, writeStored } from '../../storage.ts'
import { type Changes, type Update, changeKey, getChanges, getReadiness, listUpdates, mergeChanges } from '../../updates.ts'

// The update the visitor works in (tyapi docs/20, P5): chosen in the navbar (UpdateControl), remembered per demo in
// this browser; every read and write of the open demo goes to it (app/Shell.tsx builds the gateway on it). Its
// diff against main is polled with a cursor while it is open (P19), so another writer's changes show within
// seconds.

/** How often an open update is asked what changed since the last answer. */
const POLL_MS = 4000

/** The open updates of a project, and the visitor's sandbox: keyed under the graph, so a write refetches counts. */
export const updatesQuery = (p: Project & { graph: string }) => queryOptions({ queryKey: [p.graph, 'updates'], queryFn: () => listUpdates(p) })

export type UpdateChoice = {
  /** The visitor's sandbox: where writes go with no update chosen. */
  sandbox: string
  /** Work in this update; null for the sandbox. */
  choose: (branch: string | null) => void
}

export const UpdateContext = createContext<UpdateChoice | null>(null)

export function useUpdateChoice() {
  const found = useContext(UpdateContext)
  if (!found) throw new Error('useUpdateChoice outside an open demo')
  return found
}

const chosenKey = (graph: string) => `dw:update:${graph}`

/** The branch an open demo reads and writes, given the visitor's sandbox (main for one who may only read): the
 *  update they chose, while it is open, else the sandbox. An update found gone is forgotten. */
export function useChosenBranch(project: Project & { graph: string }, sandbox: string | undefined): { branch?: string; choice: UpdateChoice } {
  const [chosen, setChosen] = useState<string | null>(() => readStored<string | null>(chosenKey(project.graph), null))
  const writer = sandbox !== undefined && !isMain(sandbox)
  const open = useQuery({ ...updatesQuery(project), enabled: writer && chosen !== null })
  const gone = chosen !== null && open.data !== undefined && !open.data.some((u) => u.branch === chosen)
  useEffect(() => {
    if (gone) writeStored(chosenKey(project.graph), undefined)
  }, [gone, project.graph])
  const choice = useMemo(
    () => ({
      sandbox: sandbox ?? MAIN,
      choose: (next: string | null) => {
        const kept = next && next !== sandbox ? next : null
        writeStored(chosenKey(project.graph), kept ?? undefined)
        setChosen(kept)
      },
    }),
    [sandbox, project.graph],
  )
  return { branch: writer && chosen && !gone ? chosen : sandbox, choice }
}

/** The open updates of the demo, and the sandbox. */
export function useUpdates() {
  const gateway = useGateway()
  return useQuery({ ...updatesQuery(gateway), enabled: !isMain(gateway.branch), placeholderData: keepPreviousData })
}

/** The update being worked in, once listed. */
export function useCurrentUpdate(): Update | undefined {
  const gateway = useGateway()
  return useUpdates().data?.find((u) => u.branch === gateway.branch)
}

const diffKey = (graph: string, branch: string) => [graph, branch, 'changes'] as const

/** What the open update changes against main, per record. */
export function useUpdateDiff() {
  const gateway = useGateway()
  return useQuery({
    queryKey: diffKey(gateway.graph, gateway.branch),
    queryFn: () => getChanges(gateway, gateway.branch),
    enabled: !isMain(gateway.branch),
    placeholderData: keepPreviousData,
  })
}

/** Whether the open update can merge, refetched with the graph's answers after every write. */
export function useReadiness() {
  const gateway = useGateway()
  return useQuery({
    queryKey: [gateway.graph, gateway.branch, 'readiness'],
    queryFn: () => getReadiness(gateway, gateway.branch),
    enabled: !isMain(gateway.branch),
    placeholderData: keepPreviousData,
  })
}

/** Records the open update adds or changes, by refKey: the outline's pending marks. */
export function usePending(): Set<string> {
  const changes = useUpdateDiff().data?.changes ?? []
  return new Set(changes.filter((c) => c.kind === 'node' && c.op !== 'removed').map(changeKey))
}

/** Poll the open update's diff for changes since the last answer; mounted once, in the navbar. When someone else
 *  wrote, the demo's answers are refetched. */
export function useUpdateDiffPoll(me: string) {
  const gateway = useGateway()
  const queryClient = useQueryClient()
  useEffect(() => {
    if (isMain(gateway.branch)) return
    const key = diffKey(gateway.graph, gateway.branch)
    let busy = false
    const timer = setInterval(async () => {
      const held = queryClient.getQueryData<Changes>(key)
      if (!held || busy) return
      busy = true
      try {
        const later = await getChanges(gateway, gateway.branch, held.cursor)
        queryClient.setQueryData<Changes>(key, { ...held, cursor: later.cursor, changes: mergeChanges(held.changes, later.changes) })
        if (later.changes.some((c) => c.written_by.some((w) => w !== me))) void queryClient.invalidateQueries({ queryKey: [gateway.graph] })
      } catch {
        // A failed poll is tried again on the next tick; the screen keeps what it has.
      } finally {
        busy = false
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [gateway, queryClient, me])
}
