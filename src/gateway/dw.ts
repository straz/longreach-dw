import { query } from '../api.ts'
import type { IsoDate, QueryName, QueryParams, QueryRow } from '../model/generated.ts'
import type { GatewayClient, ReadOpts } from './client.ts'

// test8's GatewayClient over the Longreach API, for one demo's graph (docs/PLAN.md §2, phase 3). The screens and
// src/domain/ work in calendar days, as test8 did; the API in instants in UTC (tyapi W14). This is where the two
// meet: an as-of day goes out as the end of that day (2027-01-15 → 2027-01-15T23:59:59.999Z), and every instant
// that comes back is read as its day in UTC (2027-03-31T00:00Z → 2027-03-31); a day sent in a parameter or a
// write (src/writes.ts) goes out as its midnight in UTC, the form a calendar day is stored in. All exact, because every instant is in UTC; a
// time of day, which test8 never showed, is not kept.

const INSTANT = /^(\d{4}-\d\d-\d\d)T\d\d:\d\d(:\d\d(\.\d{1,3})?)?Z$/

/** value with every instant in UTC, at any depth, as its day. */
export function days<T>(value: T): T {
  if (typeof value === 'string') {
    const m = INSTANT.exec(value)
    return (m ? m[1] : value) as T
  }
  if (Array.isArray(value)) return value.map(days) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, days(v)])) as T
  return value
}

const DAY = /^\d{4}-\d\d-\d\d$/

/** value with every day, at any depth, as its midnight in UTC, the form a calendar day is stored in: for a
 *  query's parameters and a write's body. */
export function instants<T>(value: T): T {
  if (typeof value === 'string') return (DAY.test(value) ? `${value}T00:00Z` : value) as T
  if (Array.isArray(value)) return value.map(instants) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, instants(v)])) as T
  return value
}

/** The instant an as-of day ends at: everything dated that day counts. */
export const endOf = (day: IsoDate) => `${day}T23:59:59.999Z`

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
    const sent = { ...instants(params), ...(opts.asOf ? { as_of: endOf(opts.asOf) } : {}) }
    return days(await query(this.graph, name, sent as QueryParams<N>, this.branch))
  }
}
