import type { Schemas } from '../api.ts'
import type { Demo } from '../features/shared/client.tsx'
import { days } from '../gateway/dw.ts'

// A demo as tyapi describes it (GET /v1/projects/{org}/{project}/demo) → what the screens read
// (features/shared/client.tsx): its client, its clock, and its content, every instant as its day in UTC. The API
// writes an optional field it has no value for as null; test8's types, and the screens, leave it out.

/** T with every null, at any depth, as an absent value. */
export type NoNulls<T> = T extends null ? undefined : T extends (infer U)[] ? NoNulls<U>[] : T extends object ? { [K in keyof T]: NoNulls<T[K]> } : T

export function noNulls<T>(value: T): NoNulls<T> {
  if (Array.isArray(value)) return value.map(noNulls) as NoNulls<T>
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null).map(([k, v]) => [k, noNulls(v)])) as NoNulls<T>
  }
  return value as NoNulls<T>
}

export function demoFrom(out: Schemas['DemoOut']): Demo {
  const d = noNulls(days(out))
  return {
    client: {
      org: d.party,
      graph: d.graph,
      user: d.persona.party,
      footer: d.frame.footer,
    },
    clock: { today: d.frame.clock, earliest: d.frame.timeline_start },
    content: { briefs: d.briefs, documents: d.documents, indicators: d.indicators },
  }
}
