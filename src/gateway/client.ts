import type { IsoDate, QueryName, QueryParams, QueryRow } from '../model/generated.ts'

// The seam between the screens and the Longreach API, from test8 (its docs/PLAN.md §6.3). Screens read only
// through this interface; gateway/dw.ts implements it for one demo's graph. Writes are src/writes.ts.

export type ReadOpts = {
  /** Answer as the graph stood at the end of this day. */
  asOf?: IsoDate
}

export interface GatewayClient {
  /** The graph it reads, which keys every cached answer. */
  readonly graph: string
  /** The demo's project, which writes go to. */
  readonly org: string
  readonly project: string
  /** The branch it reads: the visitor's sandbox of the demo, or main (tyapi W11). */
  readonly branch: string
  query<N extends QueryName>(name: N, params: QueryParams<N>, opts?: ReadOpts): Promise<QueryRow<N>[]>
}
