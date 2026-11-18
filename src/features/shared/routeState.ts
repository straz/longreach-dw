import { useCallback } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { clampAsOf } from '../../domain/clock.ts'
import type { IsoDate } from '../../model/generated.ts'
import { useClock } from './client.tsx'

// The URL is the UI state (test8's docs/PLAN.md §6.4): the demo or project, tab, selection, view, filters and as-of
// all live in the hash route (#/<org>/<tab>/…?asof= for a demo, #/p/<org>/<project>/<tab>/… for a project of the
// user's own), so links, reload and Back work by construction. This hook is the only reader and writer; the paths
// screens pass it start at the tab, and it adds the demo's or project's base.

export const TABS = ['commitment', 'watch', 'reconsider'] as const
export type Tab = (typeof TABS)[number]

type RouteState = {
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

/** Where a demo's or project's paths start: /<org> for a demo, /p/<org>/<project> for a project. */
export const basePath = ({ org, project }: { org?: string; project?: string }) => (project ? `/p/${org}/${project}` : `/${org}`)

/** The base of the open demo's or project's paths, from the URL. */
export const useBasePath = () => basePath(useParams())

/** The tab a path names: its segment after the demo's or project's base. */
export function tabOf(pathname: string): Tab {
  const parts = pathname.split('/')
  const tab = parts[1] === 'p' ? parts[4] : parts[2]
  return (TABS as readonly string[]).includes(tab) ? (tab as Tab) : 'commitment'
}

export function useRouteState(): RouteState {
  const { pathname } = useLocation()
  const [search, setSearch] = useSearchParams()
  const navigate = useNavigate()
  const base = useBasePath()
  const clock = useClock()
  const asOf = clampAsOf(search.get('asof'), clock)

  const href = useCallback(
    (path: string, params: Params = {}) => withParams(`${base}${path}`, { ...params, asof: asOf === clock.today ? undefined : asOf }),
    [base, asOf, clock.today],
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
