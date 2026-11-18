import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useGateway } from '../../gateway/react.tsx'
import { MAIN, type Project, isMain } from '../../project.ts'
import { keys } from '../../queryKeys.ts'
import { readStored, writeStored } from '../../storage.ts'
import { listFailedJobs, listUploads } from '../../sources.ts'
import { type Changes, type Update, changeKey, getChanges, getReadiness, listUpdates, mergeChanges } from '../../updates.ts'

// The update the user works in (tyapi docs/20, P5): chosen in the navbar (UpdateControl), remembered per demo or
// project in this browser; every read and write of it goes there (app/Shell.tsx builds the gateway on it). Its diff
// against main is polled with a cursor while it is open (P19), so another writer's or an assistant's changes show
// within seconds.

/** How often an open update is asked what changed since the last answer. */
const POLL_MS = 4000

/** The user's open updates, and their sandbox of a demo: keyed under the graph, so a write refetches counts. */
export const updatesQuery = (p: Project & { graph: string }) => queryOptions({ queryKey: keys.updates(p.graph), queryFn: () => listUpdates(p) })

export type UpdateChoice = {
  /** What is read and written with no update chosen: the visitor's sandbox of a demo, or a project's main, where a
   *  write starts an update of its own (tyapi docs/20, P5). */
  base: string
  /** Whether the user may change the project: a demo's visitor, or a project's writer. */
  writer: boolean
  /** Work in this update; null for the base. */
  choose: (branch: string | null) => void
}

export const UpdateContext = createContext<UpdateChoice | null>(null)

export function useUpdateChoice() {
  const found = useContext(UpdateContext)
  if (!found) throw new Error('useUpdateChoice needs a demo or project open')
  return found
}

/** Whether the user may change what is open: a demo's visitor, or a project's writer. */
export function useIsWriter() {
  const branch = useGateway().branch
  return useContext(UpdateContext)?.writer ?? !isMain(branch)
}

/** After a write: a write made while reading a project's main started an update (tyapi P5), so work in it from now
 *  on. Given the write's answer, which names the branch written. */
export function useFollowWrite() {
  const choice = useContext(UpdateContext)
  const branch = useGateway().branch
  return useCallback(
    (result: unknown) => {
      const written = (result as { branch?: string } | undefined)?.branch
      if (choice && isMain(branch) && written && !isMain(written)) choice.choose(written)
    },
    [choice, branch],
  )
}

const chosenKey = (graph: string) => `dw:update:${graph}`

/** The branch an open demo or project reads and writes, given its base (a demo's sandbox, or main): the update the
 *  user chose, while it is open, else the base. An update found gone is forgotten. */
export function useChosenBranch(project: Project & { graph: string }, base: string | undefined, writer: boolean): { branch?: string; choice: UpdateChoice } {
  const [chosen, setChosen] = useState<string | null>(() => readStored<string | null>(chosenKey(project.graph), null))
  const open = useQuery({ ...updatesQuery(project), enabled: writer && chosen !== null })
  const gone = chosen !== null && open.data !== undefined && !open.data.some((u) => u.branch === chosen)
  useEffect(() => {
    if (gone) writeStored(chosenKey(project.graph), undefined)
  }, [gone, project.graph])
  const choice = useMemo(
    () => ({
      base: base ?? MAIN,
      writer,
      choose: (next: string | null) => {
        const kept = next && next !== base ? next : null
        writeStored(chosenKey(project.graph), kept ?? undefined)
        setChosen(kept)
      },
    }),
    [base, writer, project.graph],
  )
  return { branch: writer && chosen && !gone ? chosen : base, choice }
}

/** The user's open updates, and their sandbox of a demo. */
export function useUpdates() {
  const gateway = useGateway()
  return useQuery({ ...updatesQuery(gateway), enabled: useIsWriter(), placeholderData: keepPreviousData })
}

/** The update being worked in, once listed. */
export function useCurrentUpdate(): Update | undefined {
  const gateway = useGateway()
  return useUpdates().data?.find((u) => u.branch === gateway.branch)
}

/** What the open update changes against main, per record. */
export function useUpdateDiff() {
  const gateway = useGateway()
  return useQuery({
    queryKey: keys.changes(gateway.graph, gateway.branch),
    queryFn: () => getChanges(gateway, gateway.branch),
    enabled: !isMain(gateway.branch),
    placeholderData: keepPreviousData,
  })
}

/** Whether the open update can merge, refetched with the graph's answers after every write. */
export function useReadiness() {
  const gateway = useGateway()
  return useQuery({
    queryKey: keys.readiness(gateway.graph, gateway.branch),
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

/** Poll the open update's diff for changes since the last answer; mounted once, in the frame. When someone else
 *  wrote, or an assistant, the graph's answers are refetched. */
export function useUpdateDiffPoll(me: string) {
  const gateway = useGateway()
  const queryClient = useQueryClient()
  useEffect(() => {
    if (isMain(gateway.branch)) return
    const key = keys.changes(gateway.graph, gateway.branch)
    let busy = false
    const timer = setInterval(async () => {
      const held = queryClient.getQueryData<Changes>(key)
      if (!held || busy) return
      busy = true
      try {
        const later = await getChanges(gateway, gateway.branch, held.cursor)
        // Laid over what is held when the answer comes, which a refetch may have replaced meanwhile.
        queryClient.setQueryData<Changes>(key, (now) => now && { ...now, cursor: later.cursor, changes: mergeChanges(now.changes, later.changes) })
        // An assistant writes with a key of the user's, so its changes are known by their mark, not their writer.
        if (later.changes.some((c) => c.ai || c.written_by.some((w) => w !== me))) void queryClient.invalidateQueries({ queryKey: keys.graph(gateway.graph) })
      } catch {
        // A failed poll is tried again on the next tick; the screen keeps what it has.
      } finally {
        busy = false
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [gateway, queryClient, me])
}

/** The documents uploaded to the open update (tyapi P18). */
export function useUploads() {
  const gateway = useGateway()
  return useQuery({
    queryKey: keys.uploads(gateway.graph, gateway.branch),
    queryFn: () => listUploads(gateway, gateway.branch),
    enabled: !isMain(gateway.branch),
  })
}

/** The open update's failed assistant jobs, not dismissed (tyapi P22). */
export function useFailedJobs() {
  const gateway = useGateway()
  return useQuery({
    queryKey: keys.jobs(gateway.graph, gateway.branch),
    queryFn: () => listFailedJobs(gateway, gateway.branch),
    enabled: !isMain(gateway.branch),
  })
}
