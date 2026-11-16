import { type UseQueryResult, keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { type ReactNode, createContext, useContext, useMemo, useRef } from 'react'
import type { IsoDate, QueryName, QueryParams, QueryRow } from '../model/generated.ts'
import type { GatewayClient } from './client.ts'

// React access to the gateway. Screens call useGatewayQuery; the demo's shell (app/Shell.tsx) provides the
// client for the open demo's graph, and its sample documents.

const GatewayContext = createContext<GatewayClient | null>(null)

export function GatewayProvider({ client, children }: { client: GatewayClient; children: ReactNode }) {
  return <GatewayContext.Provider value={client}>{children}</GatewayContext.Provider>
}

export function useGateway(): GatewayClient {
  const client = useContext(GatewayContext)
  if (!client) throw new Error('useGateway needs a GatewayProvider')
  return client
}

/** A cached answer's key: its graph first, so demos never share answers, then the query, its parameters and day. */
export const queryKey = (graph: string, name: QueryName, params: unknown, asOf?: IsoDate) => [graph, name, params, asOf ?? null] as const

/**
 * One stored query, cached by [name, params, asOf]. While a new as-of date
 * loads, the previous answer stays on screen, so moving the slider never
 * blanks the page.
 */
export function useGatewayQuery<N extends QueryName>(name: N, params: QueryParams<N>, asOf?: IsoDate): UseQueryResult<QueryRow<N>[]> {
  const client = useGateway()
  return useQuery({
    queryKey: queryKey(client.graph, name, params, asOf),
    queryFn: () => client.query(name, params, { asOf }),
    placeholderData: keepPreviousData,
  })
}

export type QueryRows<N extends readonly QueryName[]> = { [K in N[number]]: QueryRow<K>[] }

/**
 * The newest value built from answers that all belong to the current request;
 * while some answers are still the previous date's, the last such value. A
 * screen then moves from one consistent date to the next, never through a
 * mix of two (which is what flickers while the as-of slider moves).
 */
export function useSettled<T>(value: T | undefined, settled: boolean): T | undefined {
  const last = useRef<T | undefined>(undefined)
  if (settled && value !== undefined) last.current = value
  return settled && value !== undefined ? value : last.current
}

/**
 * Several parameterless stored queries at one as-of date, fetched in
 * parallel. `rows` changes only when every answer is for this date
 * (`settled`), and keeps its identity until then, so it can key a memo.
 */
export function useQueryRows<const N extends readonly QueryName[]>(names: N, asOf?: IsoDate): { rows?: QueryRows<N>; settled: boolean; isUpdating: boolean; error?: Error } {
  const client = useGateway()
  const results = useQueries({
    queries: names.map((name) => ({
      queryKey: queryKey(client.graph, name, {}, asOf),
      queryFn: () => client.query(name, {} as never, { asOf }),
      placeholderData: keepPreviousData,
    })),
  })
  const settled = results.every((r) => r.data !== undefined && !r.isPlaceholderData)
  const changed = results.map((r) => r.dataUpdatedAt).join()
  const fresh = useMemo(
    () => (settled ? (Object.fromEntries(names.map((name, i) => [name, results[i].data])) as QueryRows<N>) : undefined),
    // `changed` moves exactly when any result's data does.
    [settled, changed],
  )
  return { rows: useSettled(fresh, settled), settled, isUpdating: !settled || results.some((r) => r.isFetching), error: results.find((r) => r.error)?.error ?? undefined }
}
