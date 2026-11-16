import { useMemo } from 'react'
import { useQueryRows } from '../../gateway/react.tsx'
import type { QueryRow } from '../../model/generated.ts'
import { useClient } from './client.tsx'
import { useRouteState } from './routeState.ts'

// Who and what the graph names, by slug: parties, mandates and commitments.
// One consistent set of answers, indexed once, for every screen that turns a
// slug into a name.

const DIRECTORY_QUERIES = ['parties', 'mandates', 'commitments'] as const

export type MandateInfo = QueryRow<'mandates'> & {
  /** Held by the signed-in user. */
  mine: boolean
  holderKind?: QueryRow<'parties'>['kind']
}

export type Directory = {
  ready: boolean
  partyName: (slug: string) => string
  mandate: (slug: string) => MandateInfo | undefined
  commitmentTitle: (slug: string) => string
  parties: QueryRow<'parties'>[]
  mandates: QueryRow<'mandates'>[]
  commitments: QueryRow<'commitments'>[]
}

export function useDirectory(): Directory {
  const { asOf } = useRouteState()
  const { user } = useClient()
  const { rows } = useQueryRows(DIRECTORY_QUERIES, asOf)
  return useMemo(() => {
    const parties = new Map(rows?.parties.map((p) => [p.party, p]))
    const mandates = new Map(rows?.mandates.map((m) => [m.mandate, { ...m, mine: m.holder === user, holderKind: parties.get(m.holder)?.kind }]))
    const commitments = new Map(rows?.commitments.map((c) => [c.commitment, c]))
    return {
      ready: !!rows,
      partyName: (slug) => parties.get(slug)?.name ?? slug,
      mandate: (slug) => mandates.get(slug),
      commitmentTitle: (slug) => commitments.get(slug)?.title ?? slug,
      parties: rows?.parties ?? [],
      mandates: rows?.mandates ?? [],
      commitments: rows?.commitments ?? [],
    }
  }, [rows, user])
}
