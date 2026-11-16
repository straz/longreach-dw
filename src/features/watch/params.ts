import { useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { withParams } from '../shared/routeState.ts'

// The Watch tab's URL state: the view (path), the commitment it is scoped to
// (`c`) and the row open in the panel (`row`). As-of rides along untouched.

export const VIEWS = [
  { slug: 'flags', label: 'Flags' },
  { slug: 'trends', label: 'Trends' },
  { slug: 'evidence', label: 'Evidence' },
  { slug: 'coming-up', label: 'Coming up' },
] as const

export type View = (typeof VIEWS)[number]['slug']

export function useWatchParams() {
  const { view } = useParams()
  const [search, setSearch] = useSearchParams()
  const current: View = VIEWS.some((v) => v.slug === view) ? (view as View) : 'flags'
  const select = useCallback(
    (row?: string) =>
      setSearch((prev) => {
        const next = new URLSearchParams(prev)
        if (row) next.set('row', row)
        else next.delete('row')
        return next
      }),
    [setSearch],
  )
  return { view: current, scope: search.get('c') ?? undefined, row: search.get('row') ?? undefined, select }
}

/** A Watch path with its scope, before the as-of date is added. */
export const watchPath = (view: View, scope?: string) => withParams(`/watch/${view}`, { c: scope })
