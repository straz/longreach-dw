// The Longreach API (tyapi), from the browser (docs/PLAN.md §3). The client is typed by src/model/api.ts, which
// is generated from tyapi's API description, so a route or field tyapi changes fails dw's build where dw uses
// it. Calls carry the gateway's session cookie, which the browser sends because dw and the API are one site,
// and a change names dw as the app it comes from, which the gateway requires of a session.

import createClient, { type Middleware } from 'openapi-fetch'
import type { components, paths } from './model/api.ts'
import type { QueryName, QueryParams, QueryRow } from './model/generated.ts'

export const API_URL = (import.meta.env.VITE_API_URL ?? 'https://127.0.0.1:8100').replace(/\/+$/, '')
/** The version of the graph routes' contract dw is written for; they refuse a call that names another. */
export const GRAPHS_API = '0.14'
/** How much of an answer that is not the API's error an ApiError keeps. */
const EXCERPT = 300

export type Schemas = components['schemas']
export type Me = Schemas['Me']

/** The API's refusal: its status, its code and its words; for an answer that is not the API's error (a
 *  proxy's page), its status and the start of what it said. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const namesDw: Middleware = {
  onRequest({ request }) {
    if (request.method !== 'GET' && request.method !== 'HEAD') request.headers.set('x-longreach-client', 'dw')
    return request
  },
}

// fetch is looked up at each call, not when the client is made, so a test can stand in for it.
export const client = createClient<paths>({ baseUrl: API_URL, credentials: 'include', fetch: (request) => globalThis.fetch(request) })
client.use(namesDw)

type Answer<T> = { data?: T; error?: unknown; response: Response }

/** A call's data; ApiError, with what the API said, when it refused. */
export async function answer<T>(call: Promise<Answer<T>>): Promise<T> {
  const { data, error, response } = await call
  if (response.ok) return data as T
  if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') {
    const code = 'code' in error && typeof error.code === 'string' ? error.code : 'error'
    throw new ApiError(response.status, code, error.error)
  }
  const said = typeof error === 'string' ? error.trim() : error === undefined ? '' : JSON.stringify(error)
  const text = said.length > EXCERPT ? `${said.slice(0, EXCERPT)}…` : said
  throw new ApiError(response.status, 'error', `${response.status} ${response.statusText}`.trim() + (text ? `: ${text}` : ''))
}

/** A stored query's rows on a branch of the graph (main unless named), typed by the ty-core model (src/model/generated.ts). */
export async function query<N extends QueryName>(graph: string, name: N, params: QueryParams<N>, branch?: string): Promise<QueryRow<N>[]> {
  const data = await answer(
    client.POST('/v1/graphs/{graph}/queries/{query_name}', {
      params: { path: { graph, query_name: name }, header: { 'Graphs-Http-Api': GRAPHS_API } },
      body: branch ? { params, branch } : { params },
    }),
  )
  if (!('rows' in data) || !Array.isArray(data.rows)) {
    throw new ApiError(502, 'unexpected', `${name} on ${graph} did not answer with rows: ${JSON.stringify(data).slice(0, EXCERPT)}`)
  }
  return data.rows as QueryRow<N>[]
}

/** Where to send the browser to sign in; the gateway sends it back to next. */
export const signInUrl = (next: string) => `${API_URL}/auth/login?next=${encodeURIComponent(next)}`
