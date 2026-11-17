import { query } from '../api.ts'
import type { QueryName, QueryParams, QueryRow } from '../model/generated.ts'
import { endOf, fromApi, toApi } from '../wire.ts'
import type { GatewayClient, ReadOpts } from './client.ts'

// test8's GatewayClient over the Longreach API, for one demo's graph and one branch of it (docs/PLAN.md §2, phase
// 3). Dates are converted at the boundary (src/wire.ts): an as-of day goes out as the end of that day, other days
// as their midnight, and answers come back as days, but for the moments whose time of day matters.

export class DwGateway implements GatewayClient {
  readonly graph: string
  readonly org: string
  readonly project: string
  /** The branch it reads: the visitor's sandbox of the demo, where their writes go (tyapi W11), or main. */
  readonly branch: string

  constructor({ graph, org, project, branch = 'main' }: { graph: string; org: string; project: string; branch?: string }) {
    this.graph = graph
    this.org = org
    this.project = project
    this.branch = branch
  }

  async query<N extends QueryName>(name: N, params: QueryParams<N>, opts: ReadOpts = {}): Promise<QueryRow<N>[]> {
    const sent = { ...toApi(params), ...(opts.asOf ? { as_of: endOf(opts.asOf) } : {}) }
    return fromApi(await query(this.graph, name, sent as QueryParams<N>, this.branch))
  }
}
