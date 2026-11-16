import { useCallback } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { clampAsOf } from '../../domain/clock.ts'
import type { IsoDate } from '../../model/generated.ts'
import { useClock } from './client.tsx'

// The URL is the UI state (test8's docs/PLAN.md §6.4): the demo, tab, selection, view, filters and as-of all
// live in the hash route (#/<org>/<tab>/…?asof=), so links, reload and Back work by construction. This hook is
// the only reader and writer; the paths screens pass it start at the tab, and it adds the demo.

export const TABS = ['commitment', 'watch', 'reconsider'] as const
export type Tab = (typeof TABS)[number]

export type RouteState = {
  tab: Tab
  asOf: IsoDate
  /** Go to a path, keeping the as-of date. */
  go: (path: string, params?: Params) => void
  /** A link target for a path and its query parameters, keeping the as-of date. */
  href: (path: string, params?: Params) => string
  setAsOf: (asOf: IsoDate) => void
}

/** Query parameters for a link; undefined ones are left out. */
export type Params = Record<string, string | number | undefined>

/** A path with its query encoded; `path` may already carry a query. */
export function withParams(path: string, params: Params = {}): string {
  const [base, query = ''] = path.split('?')
  const q = new URLSearchParams(query)
  for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v))
  const s = q.toString()
  return s ? `${base}?${s}` : base
}

/** The tab a path names: its segment after the demo's, #/<org>/<tab>. */
export function tabOf(pathname: string): Tab {
  const tab = pathname.split('/')[2]
  return (TABS as readonly string[]).includes(tab) ? (tab as Tab) : 'commitment'
}

export function useRouteState(): RouteState {
  const { pathname } = useLocation()
  const [search, setSearch] = useSearchParams()
  const navigate = useNavigate()
  const { org } = useParams()
  const clock = useClock()
  const asOf = clampAsOf(search.get('asof'), clock)

  const href = useCallback(
    (path: string, params: Params = {}) => withParams(`/${org}${path}`, { ...params, asof: asOf === clock.today ? undefined : asOf }),
    [org, asOf, clock.today],
  )
  const go = useCallback((path: string, params?: Params) => navigate(href(path, params)), [navigate, href])
  const setAsOf = useCallback(
    (next: IsoDate) =>
      setSearch(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === clock.today) params.delete('asof')
          else params.set('asof', next)
          return params
        },
        { replace: true },
      ),
    [setSearch, clock.today],
  )

  return { tab: tabOf(pathname), asOf, go, href, setAsOf }
}
