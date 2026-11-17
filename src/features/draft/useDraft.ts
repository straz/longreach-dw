import { keepPreviousData, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Draft } from '../../domain/draft/questions.ts'
import { refKey } from '../../domain/draft/questions.ts'
import type { Item } from '../../domain/draft/palette.ts'
import { type Fields, getLinks, getModel, getRecord } from '../../entities.ts'
import { useGateway } from '../../gateway/react.tsx'

// The drafting page's data (docs/21-new-commitment.md, §2c): the model, the commitment with its links, and the
// records around it (beliefs, risks, decisions, tripwires) with theirs. Every key starts with the graph, so a
// write refetches them all (features/shared/useService.ts); answers stay on screen while they refetch, so the
// page never blanks or jumps.

/** The types whose own links the outline shows under their cards. */
export const NESTED = new Set(['Belief', 'Risk', 'Decision', 'Tripwire'])

export function useModel() {
  const gateway = useGateway()
  return useQuery({ queryKey: ['model', gateway.org, gateway.project], queryFn: () => getModel(gateway), staleTime: Infinity })
}

export function useDraft(slug: string): { draft?: Draft; error?: Error | null; missing: boolean } {
  const gateway = useGateway()
  const key = [gateway.graph, gateway.branch, 'draft', slug] as const
  const record = useQuery({ queryKey: [...key, 'record'], queryFn: () => getRecord(gateway, 'Commitment', slug, gateway.branch), placeholderData: keepPreviousData, retry: false })
  const links = useQuery({ queryKey: [...key, 'links'], queryFn: () => getLinks(gateway, 'Commitment', slug, gateway.branch), placeholderData: keepPreviousData, retry: false })
  const nested = (links.data?.links ?? []).filter((l) => NESTED.has(l.type))
  const aroundLinks = useQueries({
    queries: nested.map((l) => ({ queryKey: [...key, 'links', l.type, l.slug], queryFn: () => getLinks(gateway, l.type, l.slug, gateway.branch), placeholderData: keepPreviousData })),
  })
  const aroundRecords = useQueries({
    queries: nested.map((l) => ({ queryKey: [...key, 'record', l.type, l.slug], queryFn: () => getRecord(gateway, l.type, l.slug, gateway.branch), placeholderData: keepPreviousData })),
  })
  const around = [...aroundLinks, ...aroundRecords]
  const changed = around.map((r) => r.dataUpdatedAt).join()
  const draft = useMemo((): Draft | undefined => {
    if (!record.data || !links.data) return undefined
    const byKey: Draft['around'] = {}
    nested.forEach((l, i) => {
      const [own, rec] = [aroundLinks[i], aroundRecords[i]]
      if (own?.data) byKey[refKey(l)] = { links: own.data.links, record: rec?.data?.record as Fields | undefined }
    })
    return { slug, record: record.data.record as Fields, links: links.data.links, around: byKey }
    // `changed` moves exactly when any record around does.
  }, [slug, record.data, links.data, changed])
  const missing = (record.error as { status?: number } | null)?.status === 404
  return { draft, error: record.error ?? links.error ?? around.find((r) => r.error)?.error, missing }
}

/** A card not yet saved: no text yet, so not a record (N7, unsaved). Kept in the browser per draft, so a reload
 *  or a crash loses nothing. */
export type Unsaved = {
  id: string
  /** The card it was added from, and what was chosen from its palette. */
  focus: { type: string; slug: string }
  item: Item
  text: string
  fields: Fields
}

export function useUnsaved(storageKey: string) {
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? '[]') as Unsaved[]
    } catch {
      return []
    }
  }
  const [cards, setCards] = useState<Unsaved[]>(read)
  // A different draft reads its own.
  const loaded = useRef(storageKey)
  useEffect(() => {
    if (loaded.current !== storageKey) {
      loaded.current = storageKey
      setCards(read())
    }
  })
  const save = useCallback(
    (next: (cards: Unsaved[]) => Unsaved[]) =>
      setCards((prev) => {
        const cards = next(prev)
        if (cards.length) localStorage.setItem(storageKey, JSON.stringify(cards))
        else localStorage.removeItem(storageKey)
        return cards
      }),
    [storageKey],
  )
  return {
    cards,
    add: (card: Omit<Unsaved, 'id'>) => {
      const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      save((cs) => [...cs, { ...card, id }])
      return id
    },
    update: (id: string, change: Partial<Unsaved>) => save((cs) => cs.map((c) => (c.id === id ? { ...c, ...change } : c))),
    remove: (id: string) => save((cs) => cs.filter((c) => c.id !== id)),
  }
}

/** Dismissed questions, remembered per draft (N6). */
export function useDismissed(storageKey: string) {
  const [ids, setIds] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[]))
  const dismiss = (id: string) =>
    setIds((prev) => {
      const next = new Set(prev).add(id)
      localStorage.setItem(storageKey, JSON.stringify([...next]))
      return next
    })
  return { dismissed: ids, dismiss }
}

/** One change the user made in this session, and how to take it back. */
export type Done = { what: string; undo: () => Promise<unknown> }

/** Writes and undo (§2c): run a change, refetch the graph's answers, and keep how to undo it. ⌘Z undoes the
 *  user's own last change. */
export function useChanges() {
  const gateway = useGateway()
  const queryClient = useQueryClient()
  const [stack, setStack] = useState<Done[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  // The draft's own answers first, awaited, so a saved card replaces its unsaved one at once; then the rest of the
  // graph's (the portfolio, the headline), in the background.
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [gateway.graph, gateway.branch, 'draft'] })
    void queryClient.invalidateQueries({ queryKey: [gateway.graph] })
  }, [queryClient, gateway.graph, gateway.branch])

  const run = useCallback(
    async <T,>(change: () => Promise<T>, done?: (result: T) => Done | undefined): Promise<T | undefined> => {
      setBusy(true)
      setError(null)
      try {
        const result = await change()
        const entry = done?.(result)
        if (entry) setStack((s) => [...s, entry])
        await refresh()
        return result
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)))
        return undefined
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const undo = useCallback(async () => {
    const last = stack.at(-1)
    if (!last || busy) return
    setStack((s) => s.slice(0, -1))
    await run(last.undo)
  }, [stack, busy, run])

  return { run, undo, last: stack.at(-1), busy, error, clearError: () => setError(null) }
}
